import crypto from "crypto";
import fs from "fs";

import AppError from "../../../errors/AppError";
import EmitWhatsappSession from "../../../helpers/EmitWhatsappSession";
import {
  CloudApiSecrets,
  loadCloudCredentials
} from "../../../helpers/CloudApiCredentials";
import CloudApiCredential from "../../../models/CloudApiCredential";
import Contact from "../../../models/Contact";
import Whatsapp from "../../../models/Whatsapp";
import { logger } from "../../../utils/logger";
import type { WhatsappProvider } from "../whatsappProvider";
import {
  MessageAck,
  MessageType,
  ProviderMediaInput,
  ProviderMessage,
  SendMediaOptions,
  SendMessageOptions
} from "../types";

// Official WhatsApp Cloud API (Meta). There is no QR code and no session
// to keep alive: each call goes to the Graph API with the connection's
// token. Incoming messages arrive on the webhook (routes/cloudWebhookRoutes)
// and sent messages are recorded here, because Meta does not echo them.

const graphUrl = (): string =>
  (process.env.WHATSAPP_CLOUD_API_URL || "https://graph.facebook.com/v21.0")
    // eslint-disable-next-line no-useless-escape
    .replace(/\/+$/, "");

const sessions = new Map<number, CloudApiSecrets>();
// Last message received per chat, needed to mark the chat as read.
const lastInbound = new Map<string, string>();

// The handlers import the provider facade, so they are loaded on demand.
const handlers = () =>
  // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
  require("../../../handlers/handleWhatsappEvents") as typeof import("../../../handlers/handleWhatsappEvents");

const ERRORS_BY_CODE: Record<number, string> = {
  // More than 24 hours since the customer's last message.
  131047: "ERR_CLOUD_WINDOW_CLOSED",
  190: "ERR_CLOUD_INVALID_TOKEN",
  131026: "ERR_CLOUD_NOT_ON_WHATSAPP"
};

interface GraphError {
  error?: { code?: number; message?: string; error_subcode?: number };
}

const graph = async <T>(
  secrets: CloudApiSecrets,
  path: string,
  init: { method?: string; body?: unknown; form?: FormData } = {}
): Promise<T> => {
  const response = await fetch(`${graphUrl()}/${path}`, {
    method: init.method || (init.body || init.form ? "POST" : "GET"),
    headers: {
      Authorization: `Bearer ${secrets.accessToken}`,
      ...(init.body ? { "Content-Type": "application/json" } : {})
    },
    body: init.form || (init.body ? JSON.stringify(init.body) : undefined)
  });
  const data = (await response.json().catch(() => ({}))) as T & GraphError;
  if (!response.ok) {
    const code = data.error?.code || 0;
    logger.warn({
      info: "Cloud API request failed",
      path,
      status: response.status,
      code,
      message: data.error?.message
    });
    throw new AppError(
      ERRORS_BY_CODE[code] || "ERR_CLOUD_REQUEST_FAILED",
      response.status >= 500 ? 502 : 400
    );
  }
  return data;
};

const secretsFor = async (sessionId: number): Promise<CloudApiSecrets> => {
  const cached = sessions.get(sessionId);
  if (cached) return cached;
  const secrets = await loadCloudCredentials(sessionId);
  if (!secrets) throw new AppError("ERR_CLOUD_NOT_CONFIGURED");
  sessions.set(sessionId, secrets);
  return secrets;
};

const numberOf = (chatId: string): string => {
  if (chatId.endsWith("@g.us")) {
    // The Cloud API has no groups.
    throw new AppError("ERR_CLOUD_NOT_SUPPORTED");
  }
  return chatId.split("@")[0].replace(/\D/g, "");
};

const setStatus = async (sessionId: number, status: string): Promise<void> => {
  const whatsapp = await Whatsapp.findByPk(sessionId);
  if (!whatsapp) return;
  await whatsapp.update({ status, qrcode: "", retries: 0 });
  EmitWhatsappSession(whatsapp);
};

interface OutgoingRecord {
  sessionId: number;
  number: string;
  id: string;
  body: string;
  type: MessageType;
  quotedMsgId?: string;
  media?: { filename: string; mimetype: string; data: Buffer };
}

// Stores a sent message in its ticket, as the QR code providers do when
// the phone echoes it.
const recordOutgoing = async (record: OutgoingRecord): Promise<void> => {
  const whatsapp = await Whatsapp.findByPk(record.sessionId, {
    attributes: ["id", "companyId"]
  });
  if (!whatsapp) return;
  const contact = await Contact.findOne({
    where: { number: record.number, companyId: whatsapp.companyId },
    attributes: ["name"]
  });
  const secrets = await secretsFor(record.sessionId);

  await handlers().handleMessage(
    {
      id: record.id,
      body: record.body,
      fromMe: true,
      hasMedia: Boolean(record.media),
      type: record.type,
      timestamp: Math.floor(Date.now() / 1000),
      from: secrets.phoneNumberId,
      to: record.number,
      hasQuotedMsg: Boolean(record.quotedMsgId),
      quotedMsgId: record.quotedMsgId,
      ack: 1
    },
    {
      name: contact?.name || record.number,
      number: record.number,
      isGroup: false
    },
    { whatsappId: record.sessionId, unreadMessages: 0 },
    record.media
      ? {
          filename: record.media.filename,
          mimetype: record.media.mimetype,
          data: record.media.data.toString("base64")
        }
      : undefined
  );
};

const providerMessage = (
  id: string,
  body: string,
  type: MessageType,
  number: string,
  hasMedia = false
): ProviderMessage => ({
  id,
  body,
  fromMe: true,
  hasMedia,
  type,
  timestamp: Math.floor(Date.now() / 1000),
  from: "",
  to: number,
  ack: 1
});

const init = async (whatsapp: Whatsapp): Promise<void> => {
  sessions.delete(whatsapp.id);
  try {
    const secrets = await secretsFor(whatsapp.id);
    const info = await graph<{ display_phone_number?: string }>(
      secrets,
      `${secrets.phoneNumberId}?fields=display_phone_number,verified_name`
    );
    await CloudApiCredential.update(
      { displayPhoneNumber: info.display_phone_number || null },
      { where: { whatsappId: whatsapp.id } }
    );
    await setStatus(whatsapp.id, "CONNECTED");
  } catch (err) {
    logger.warn({
      info: "Cloud API connection check failed",
      whatsappId: whatsapp.id,
      err: (err as { message?: string })?.message
    });
    sessions.delete(whatsapp.id);
    await setStatus(whatsapp.id, "DISCONNECTED");
  }
};

const sendMessage = async (
  sessionId: number,
  to: string,
  body: string,
  options?: SendMessageOptions
): Promise<ProviderMessage> => {
  const secrets = await secretsFor(sessionId);
  const number = numberOf(to);
  const result = await graph<{ messages: { id: string }[] }>(
    secrets,
    `${secrets.phoneNumberId}/messages`,
    {
      body: {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: number,
        type: "text",
        text: { body, preview_url: Boolean(options?.linkPreview) },
        ...(options?.quotedMessageId
          ? { context: { message_id: options.quotedMessageId } }
          : {})
      }
    }
  );
  const { id } = result.messages[0];
  await recordOutgoing({
    sessionId,
    number,
    id,
    body,
    type: "chat",
    quotedMsgId: options?.quotedMessageId
  });
  return providerMessage(id, body, "chat", number);
};

// Media types the Cloud API accepts; anything else goes as a document.
const IMAGE_TYPES = ["image/jpeg", "image/png"];

const mediaKind = (
  mimetype: string,
  asDocument?: boolean
): "image" | "video" | "audio" | "document" => {
  if (asDocument) return "document";
  if (IMAGE_TYPES.includes(mimetype)) return "image";
  if (mimetype.startsWith("video/")) return "video";
  if (mimetype.startsWith("audio/")) return "audio";
  return "document";
};

const sendMedia = async (
  sessionId: number,
  to: string,
  media: ProviderMediaInput,
  options?: SendMediaOptions
): Promise<ProviderMessage> => {
  const secrets = await secretsFor(sessionId);
  const number = numberOf(to);
  const data = media.data || fs.readFileSync(media.path as string);

  const form = new FormData();
  form.append("messaging_product", "whatsapp");
  form.append("type", media.mimetype);
  form.append(
    "file",
    new Blob([data], { type: media.mimetype }),
    media.filename
  );
  const uploaded = await graph<{ id: string }>(
    secrets,
    `${secrets.phoneNumberId}/media`,
    { form }
  );

  const kind = mediaKind(media.mimetype, options?.sendMediaAsDocument);
  const caption = kind === "audio" ? undefined : options?.caption;
  const result = await graph<{ messages: { id: string }[] }>(
    secrets,
    `${secrets.phoneNumberId}/messages`,
    {
      body: {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: number,
        type: kind,
        [kind]: {
          id: uploaded.id,
          ...(caption ? { caption } : {}),
          ...(kind === "document" ? { filename: media.filename } : {})
        },
        ...(options?.quotedMessageId
          ? { context: { message_id: options.quotedMessageId } }
          : {})
      }
    }
  );

  const { id } = result.messages[0];
  const type: MessageType = kind === "document" ? "document" : kind;
  await recordOutgoing({
    sessionId,
    number,
    id,
    body: caption || "",
    type,
    quotedMsgId: options?.quotedMessageId,
    media: { filename: media.filename, mimetype: media.mimetype, data }
  });
  return providerMessage(id, caption || media.filename, type, number, true);
};

export interface TemplateComponentParam {
  type: "text";
  text: string;
}

// Approved templates are the only messages allowed outside the 24-hour
// window. Body parameters fill {{1}}, {{2}}... in order.
export const sendTemplate = async (
  sessionId: number,
  to: string,
  template: { name: string; language: string; bodyParams: string[] },
  bodyText: string
): Promise<ProviderMessage> => {
  const secrets = await secretsFor(sessionId);
  const number = numberOf(to);
  const result = await graph<{ messages: { id: string }[] }>(
    secrets,
    `${secrets.phoneNumberId}/messages`,
    {
      body: {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: number,
        type: "template",
        template: {
          name: template.name,
          language: { code: template.language },
          ...(template.bodyParams.length
            ? {
                components: [
                  {
                    type: "body",
                    parameters: template.bodyParams.map(text => ({
                      type: "text",
                      text
                    }))
                  }
                ]
              }
            : {})
        }
      }
    }
  );
  const { id } = result.messages[0];
  await recordOutgoing({ sessionId, number, id, body: bodyText, type: "chat" });
  return providerMessage(id, bodyText, "chat", number);
};

export interface CloudTemplate {
  name: string;
  language: string;
  category: string;
  body: string;
  params: number;
}

// Approved templates of the connection's WhatsApp Business account.
export const listTemplates = async (
  sessionId: number
): Promise<CloudTemplate[]> => {
  const secrets = await secretsFor(sessionId);
  const result = await graph<{
    data: {
      name: string;
      language: string;
      status: string;
      category: string;
      components: { type: string; text?: string }[];
    }[];
  }>(
    secrets,
    `${secrets.wabaId}/message_templates?fields=name,language,status,category,components&limit=200`
  );
  return result.data
    .filter(template => template.status === "APPROVED")
    .map(template => {
      const body =
        template.components.find(component => component.type === "BODY")
          ?.text || "";
      const params = new Set(body.match(/\{\{\d+\}\}/g) || []).size;
      return {
        name: template.name,
        language: template.language,
        category: template.category,
        body,
        params
      };
    });
};

const sendSeen = async (sessionId: number, chatId: string): Promise<void> => {
  const key = `${sessionId}:${chatId.split("@")[0]}`;
  const messageId = lastInbound.get(key);
  if (!messageId) return;
  try {
    const secrets = await secretsFor(sessionId);
    await graph(secrets, `${secrets.phoneNumberId}/messages`, {
      body: {
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId
      }
    });
    lastInbound.delete(key);
  } catch {
    // Read receipts are a courtesy; a failure changes nothing here.
  }
};

export const CloudApiProvider: WhatsappProvider = {
  init,
  removeSession: sessionId => {
    sessions.delete(sessionId);
  },
  logout: async sessionId => {
    sessions.delete(sessionId);
    await setStatus(sessionId, "DISCONNECTED");
  },
  sendMessage,
  sendMedia,
  deleteMessage: async () => {
    throw new AppError("ERR_CLOUD_NOT_SUPPORTED");
  },
  checkNumber: async (_sessionId, number) => number.replace(/\D/g, ""),
  getProfilePicUrl: async () => "",
  getContacts: async () => [],
  sendSeen,
  fetchChatMessages: async () => []
};

// ---------------------------------------------------------------------
// Webhook

export const isValidSignature = (
  rawBody: Buffer,
  header: string | undefined,
  appSecret: string
): boolean => {
  if (!header || !header.startsWith("sha256=")) return false;
  const expected = Buffer.from(
    `sha256=${crypto
      .createHmac("sha256", appSecret)
      .update(rawBody)
      .digest("hex")}`
  );
  const received = Buffer.from(header);
  return (
    expected.length === received.length &&
    crypto.timingSafeEqual(expected, received)
  );
};

interface CloudMedia {
  id: string;
  mime_type?: string;
  caption?: string;
  filename?: string;
  voice?: boolean;
}

interface CloudMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  context?: { id?: string };
  text?: { body: string };
  image?: CloudMedia;
  video?: CloudMedia;
  audio?: CloudMedia;
  document?: CloudMedia;
  sticker?: CloudMedia;
  location?: { latitude: number; longitude: number; name?: string };
  button?: { text: string };
  interactive?: {
    button_reply?: { title: string };
    list_reply?: { title: string };
  };
}

interface CloudChangeValue {
  metadata?: { phone_number_id?: string };
  contacts?: { wa_id: string; profile?: { name?: string } }[];
  messages?: CloudMessage[];
  statuses?: { id: string; status: string }[];
}

export interface CloudWebhookPayload {
  object?: string;
  entry?: { changes?: { field?: string; value?: CloudChangeValue }[] }[];
}

const ACK_BY_STATUS: Record<string, MessageAck> = {
  sent: 1,
  delivered: 2,
  read: 3
};

const extension = (mimetype: string): string =>
  (mimetype.split("/")[1] || "bin").split(";")[0].replace(/[^a-z0-9]/gi, "");

const downloadMedia = async (
  secrets: CloudApiSecrets,
  media: CloudMedia
): Promise<{ filename: string; mimetype: string; data: string }> => {
  const info = await graph<{ url: string; mime_type: string }>(
    secrets,
    media.id
  );
  const response = await fetch(info.url, {
    headers: { Authorization: `Bearer ${secrets.accessToken}` }
  });
  if (!response.ok) throw new AppError("ERR_CLOUD_MEDIA_DOWNLOAD");
  const mimetype =
    info.mime_type || media.mime_type || "application/octet-stream";
  const data = Buffer.from(await response.arrayBuffer()).toString("base64");
  return {
    filename: media.filename || `${media.id}.${extension(mimetype)}`,
    mimetype,
    data
  };
};

const toMessageType = (message: CloudMessage): MessageType | null => {
  switch (message.type) {
    case "text":
    case "button":
    case "interactive":
      return "chat";
    case "image":
      return "image";
    case "video":
      return "video";
    case "audio":
      return message.audio?.voice ? "ptt" : "audio";
    case "document":
      return "document";
    case "sticker":
      return "sticker";
    case "location":
      return "location";
    default:
      return null;
  }
};

const bodyOf = (message: CloudMessage): string => {
  if (message.text) return message.text.body;
  if (message.button) return message.button.text;
  if (message.interactive) {
    return (
      message.interactive.button_reply?.title ||
      message.interactive.list_reply?.title ||
      ""
    );
  }
  if (message.location) {
    const { latitude, longitude, name } = message.location;
    return `https://maps.google.com/maps?q=${latitude}%2C${longitude}&z=17&hl=pt-BR|${
      name || `${latitude}, ${longitude}`
    }`;
  }
  const media =
    message.image || message.video || message.document || message.audio;
  return media?.caption || "";
};

const handleIncoming = async (
  secrets: CloudApiSecrets,
  value: CloudChangeValue,
  message: CloudMessage
): Promise<void> => {
  const type = toMessageType(message);
  if (!type) return;

  const name =
    value.contacts?.find(contact => contact.wa_id === message.from)?.profile
      ?.name || message.from;
  const media =
    message.image ||
    message.video ||
    message.audio ||
    message.document ||
    message.sticker;

  lastInbound.set(`${secrets.whatsappId}:${message.from}`, message.id);

  await handlers().handleMessage(
    {
      id: message.id,
      body: bodyOf(message),
      fromMe: false,
      hasMedia: Boolean(media),
      type,
      timestamp: Number(message.timestamp),
      from: message.from,
      to: secrets.phoneNumberId,
      hasQuotedMsg: Boolean(message.context?.id),
      quotedMsgId: message.context?.id,
      ack: 0
    },
    { name, number: message.from, isGroup: false },
    { whatsappId: secrets.whatsappId, unreadMessages: 1 },
    media ? await downloadMedia(secrets, media) : undefined
  );
};

// Processes a verified webhook delivery for one connection.
export const processCloudWebhook = async (
  whatsappId: number,
  payload: CloudWebhookPayload
): Promise<void> => {
  const secrets = await secretsFor(whatsappId);

  const changes = (payload.entry || []).reduce(
    (all, entry) => all.concat(entry.changes || []),
    [] as { field?: string; value?: CloudChangeValue }[]
  );
  const values = changes
    .filter(change => change.field === "messages" && change.value)
    .map(change => change.value as CloudChangeValue)
    // A number never posts for another connection's number.
    .filter(value => value.metadata?.phone_number_id === secrets.phoneNumberId);

  // In order: a reply must be stored after the message it answers.
  // eslint-disable-next-line no-restricted-syntax
  for (const value of values) {
    // eslint-disable-next-line no-restricted-syntax
    for (const message of value.messages || []) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await handleIncoming(secrets, value, message);
      } catch (err) {
        logger.error({ info: "Cloud API message failed", whatsappId, err });
      }
    }
    // eslint-disable-next-line no-restricted-syntax
    for (const status of value.statuses || []) {
      const ack = ACK_BY_STATUS[status.status];
      if (ack !== undefined) {
        // eslint-disable-next-line no-await-in-loop
        await handlers()
          .handleMessageAck(status.id, ack)
          .catch(() => null);
      }
    }
  }
};
