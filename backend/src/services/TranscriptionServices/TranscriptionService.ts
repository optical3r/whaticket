import { Readable } from "stream";
import { Op } from "sequelize";

import { readMedia } from "../../libs/storage";
import { defineJob, enqueue } from "../../libs/queue";
import { companyRoom, getIO } from "../../libs/socket";
import {
  MAX_AUDIO_BYTES,
  getTranscriptionAccess,
  transcribeAudio,
  transcriptionModel
} from "../../libs/transcription";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import TranscriptionUsage from "../../models/TranscriptionUsage";
import { logger } from "../../utils/logger";

// Voice notes a customer sends are transcribed in the background: the
// message shows "transcribing" and then the text, for the agent and for
// the AI (which cannot hear audio).

interface TranscriptionJob {
  messageId: string;
  companyId: number;
}

const readBuffer = async (body: Readable): Promise<Buffer | null> => {
  const chunks: Buffer[] = [];
  let size = 0;
  // eslint-disable-next-line no-restricted-syntax
  for await (const chunk of body) {
    const piece = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += piece.length;
    if (size > MAX_AUDIO_BYTES) {
      body.destroy();
      return null;
    }
    chunks.push(piece);
  }
  return Buffer.concat(chunks);
};

const contentTypeFor = (filename: string): string => {
  const extension = filename.split(".").pop()?.toLowerCase() || "";
  const types: Record<string, string> = {
    ogg: "audio/ogg",
    oga: "audio/ogg",
    opus: "audio/ogg",
    mp3: "audio/mpeg",
    mpeg: "audio/mpeg",
    m4a: "audio/mp4",
    mp4: "audio/mp4",
    aac: "audio/aac",
    webm: "audio/webm",
    wav: "audio/wav",
    amr: "audio/amr"
  };
  return types[extension] || "audio/ogg";
};

// Sends the new state to the ticket's screen, with what the message list
// needs to draw the message.
const emitUpdate = async (messageId: string): Promise<void> => {
  const message = await Message.findByPk(messageId, {
    include: [
      "contact",
      { model: Ticket, as: "ticket", attributes: ["id", "companyId"] },
      { model: Message, as: "quotedMsg", include: ["contact"] }
    ]
  });
  if (!message) return;
  getIO()
    .to(companyRoom(message.ticket.companyId, message.ticketId.toString()))
    .emit("appMessage", { action: "update", message });
};

// Called for every message a customer sends: only audio on plans with
// transcription, while the platform has a key and minutes left.
export const QueueTranscription = async (
  message: Message,
  companyId: number
): Promise<void> => {
  if (
    message.fromMe ||
    message.mediaType !== "audio" ||
    !message.getDataValue("mediaUrl")
  ) {
    return;
  }
  const access = await getTranscriptionAccess(companyId);
  if (!access.allowed) return;

  await message.update({ transcriptionStatus: "pending" });
  await emitUpdate(message.id);
  await enqueue<TranscriptionJob>("audio.transcribe", {
    messageId: message.id,
    companyId
  });
};

const finish = async (
  messageId: string,
  values: Partial<Pick<Message, "transcription" | "transcriptionStatus">>
): Promise<void> => {
  await Message.update(values, { where: { id: messageId } });
  await emitUpdate(messageId);
};

// Exported for tests, which run the job directly.
export const TranscribeMessage = async ({
  messageId,
  companyId
}: TranscriptionJob): Promise<void> => {
  const message = await Message.findByPk(messageId, {
    include: [{ model: Ticket, as: "ticket", attributes: ["companyId"] }]
  });
  if (
    !message ||
    message.ticket?.companyId !== companyId ||
    message.transcriptionStatus !== "pending"
  ) {
    return;
  }

  // The limit may have been reached while the note waited in the queue.
  const access = await getTranscriptionAccess(companyId);
  if (!access.allowed || !access.apiKey) {
    await finish(messageId, { transcriptionStatus: null });
    return;
  }

  const filename = message.getDataValue("mediaUrl") as string;
  const stored = await readMedia(filename);
  const data = stored ? await readBuffer(stored.body) : null;
  if (!data) {
    await finish(messageId, { transcriptionStatus: "failed" });
    return;
  }

  const result = await transcribeAudio(
    access.apiKey,
    data,
    stored?.contentType || contentTypeFor(filename)
  );
  await TranscriptionUsage.create({
    companyId,
    messageId,
    model: transcriptionModel(),
    seconds: result.seconds
  });
  await finish(messageId, {
    transcription: result.text.slice(0, 20000),
    transcriptionStatus: result.text ? "done" : "failed"
  });
};

defineJob<TranscriptionJob>("audio.transcribe", async data => {
  try {
    await TranscribeMessage(data);
  } catch (err) {
    logger.error({ info: "Could not transcribe audio", data, err });
    await finish(data.messageId, { transcriptionStatus: "failed" }).catch(
      () => undefined
    );
  }
});

// True while a note of this ticket from the last few minutes is still
// being transcribed, so the assistant waits for the text.
export const hasPendingTranscription = async (
  ticketId: number
): Promise<boolean> => {
  const pending = await Message.count({
    where: {
      ticketId,
      transcriptionStatus: "pending",
      createdAt: { [Op.gte]: new Date(Date.now() - 3 * 60 * 1000) }
    }
  });
  return pending > 0;
};
