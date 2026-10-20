import Message from "../models/Message";
import Ticket from "../models/Ticket";

// Turns the latest messages of a ticket into plain text for the AI.

const MEDIA_LABELS: Record<string, string> = {
  image: "imagem",
  audio: "áudio",
  ptt: "áudio",
  video: "vídeo",
  application: "arquivo",
  document: "arquivo",
  sticker: "figurinha",
  location: "localização",
  vcard: "contato"
};

// Messages the system sends by itself start with this mark.
const AUTOMATIC_MARK = "\u200e";

export interface Transcript {
  text: string;
  lastMessage: Message | null;
}

const describe = (message: Message): string => {
  const body = (message.body || "").replace(
    new RegExp(AUTOMATIC_MARK, "g"),
    ""
  );
  const label = MEDIA_LABELS[message.mediaType];
  if (!label) return body;

  // Transcribed voice notes count as what the customer said.
  if (message.transcriptionStatus === "done" && message.transcription) {
    return `[áudio transcrito]: ${message.transcription}`;
  }

  // Media without a caption keeps the file name as body.
  const filename = message.getDataValue("mediaUrl") as string | null;
  const caption = body && body !== filename ? `: ${body}` : "";
  return `[${label}]${caption}`;
};

const speaker = (message: Message): string => {
  if (!message.fromMe) return "Cliente";
  return (message.body || "").startsWith(AUTOMATIC_MARK)
    ? "Atendimento automático"
    : "Atendente";
};

const formatTime = (date: Date, timezone: string): string =>
  new Intl.DateTimeFormat("pt-BR", {
    timeZone: timezone,
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);

export const buildTranscript = async (
  ticket: Ticket,
  timezone: string,
  limit = 40
): Promise<Transcript> => {
  const messages = (
    await Message.findAll({
      where: { ticketId: ticket.id, isDeleted: false },
      order: [["createdAt", "DESC"]],
      limit
    })
  ).reverse();

  const text = messages
    .map(
      message =>
        `[${formatTime(message.createdAt, timezone)}] ${speaker(
          message
        )}: ${describe(message)}`
    )
    .join("\n")
    // The transcript goes inside <conversa> tags; a customer can't close them.
    .replace(/<\/?conversa>/gi, "");

  return { text, lastMessage: messages[messages.length - 1] || null };
};
