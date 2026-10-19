import Whatsapp from "../../models/Whatsapp";
import AppError from "../../errors/AppError";
import {
  ProviderMessage,
  ProviderMediaInput,
  ProviderContact,
  SendMessageOptions,
  SendMediaOptions
} from "./types";
import { WhatsappWebJsProvider } from "./Implementations/wwebjs";
import { ZapoProvider } from "./Implementations/zapo";

export interface WhatsappProvider {
  init(whatsapp: Whatsapp): Promise<void>;
  removeSession(whatsappId: number): void;
  logout(sessionId: number): Promise<void>;
  sendMessage(
    sessionId: number,
    to: string,
    body: string,
    options?: SendMessageOptions
  ): Promise<ProviderMessage>;
  sendMedia(
    sessionId: number,
    to: string,
    media: ProviderMediaInput,
    options?: SendMediaOptions
  ): Promise<ProviderMessage>;
  deleteMessage(
    sessionId: number,
    chatId: string,
    messageId: string,
    fromMe: boolean
  ): Promise<void>;
  checkNumber(sessionId: number, number: string): Promise<string>;
  getProfilePicUrl(sessionId: number, number: string): Promise<string>;
  getContacts(sessionId: number): Promise<ProviderContact[]>;
  sendSeen(sessionId: number, chatId: string): Promise<void>;
  fetchChatMessages(
    sessionId: number,
    chatId: string,
    limit: number
  ): Promise<ProviderMessage[]>;
}

// How a connection talks to WhatsApp. Stored in Whatsapps.channel.
//  - qrcode: unofficial clients (wwebjs or zapo, chosen by WHATSAPP_PROVIDER)
//  - cloudapi: official WhatsApp Cloud API (not implemented yet, see
//    docs/whatsapp-cloud-api.md)
export type WhatsappChannel = "qrcode" | "cloudapi";

const qrcodeImplementations: Record<string, WhatsappProvider> = {
  wwebjs: WhatsappWebJsProvider,
  zapo: ZapoProvider,
  whaileys: ZapoProvider
};

const providersByChannel: Partial<Record<WhatsappChannel, WhatsappProvider>> = {
  qrcode: qrcodeImplementations[process.env.WHATSAPP_PROVIDER || "wwebjs"]
  // cloudapi: CloudApiProvider
};

export const availableChannels = Object.keys(
  providersByChannel
) as WhatsappChannel[];

const channelBySession = new Map<number, WhatsappChannel>();

const providerFor = (channel: WhatsappChannel): WhatsappProvider => {
  const provider = providersByChannel[channel];
  if (!provider) {
    throw new AppError("ERR_CHANNEL_NOT_AVAILABLE");
  }
  return provider;
};

// Sessions are addressed by connection id only, so the channel recorded at
// init() decides which implementation handles each call.
const resolve = (sessionId: number): WhatsappProvider =>
  providerFor(channelBySession.get(sessionId) || "qrcode");

const whatsappProvider: WhatsappProvider = {
  init: async whatsapp => {
    const channel = (whatsapp.channel || "qrcode") as WhatsappChannel;
    const provider = providerFor(channel);
    channelBySession.set(whatsapp.id, channel);
    return provider.init(whatsapp);
  },
  removeSession: whatsappId => {
    const provider = resolve(whatsappId);
    channelBySession.delete(whatsappId);
    return provider.removeSession(whatsappId);
  },
  logout: sessionId => resolve(sessionId).logout(sessionId),
  sendMessage: (sessionId, to, body, options) =>
    resolve(sessionId).sendMessage(sessionId, to, body, options),
  sendMedia: (sessionId, to, media, options) =>
    resolve(sessionId).sendMedia(sessionId, to, media, options),
  deleteMessage: (sessionId, chatId, messageId, fromMe) =>
    resolve(sessionId).deleteMessage(sessionId, chatId, messageId, fromMe),
  checkNumber: (sessionId, number) =>
    resolve(sessionId).checkNumber(sessionId, number),
  getProfilePicUrl: (sessionId, number) =>
    resolve(sessionId).getProfilePicUrl(sessionId, number),
  getContacts: sessionId => resolve(sessionId).getContacts(sessionId),
  sendSeen: (sessionId, chatId) =>
    resolve(sessionId).sendSeen(sessionId, chatId),
  fetchChatMessages: (sessionId, chatId, limit) =>
    resolve(sessionId).fetchChatMessages(sessionId, chatId, limit)
};

export { whatsappProvider };
