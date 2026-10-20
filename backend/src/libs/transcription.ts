import crypto from "crypto";
import OpenAI, { toFile } from "openai";
import { Op, fn, col } from "sequelize";

import AppError from "../errors/AppError";
import { decryptSecret, encryptSecret } from "../helpers/SecretBox";
import Company from "../models/Company";
import Plan from "../models/Plan";
import PlatformSetting from "../models/PlatformSetting";
import TranscriptionUsage from "../models/TranscriptionUsage";

// Voice notes are transcribed with OpenAI (the Claude API does not take
// audio). The platform pays: the OpenAI key is the superadmin's, and each
// plan says whether its companies get transcriptions and how many minutes.

export const transcriptionModel = (): string =>
  process.env.TRANSCRIPTION_MODEL || "gpt-transcribe";

const transcriptionLanguage = (): string =>
  process.env.TRANSCRIPTION_LANGUAGE || "pt";

// OpenAI takes files up to 25 MB; a voice note is far smaller.
export const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

const CLIENT_OPTIONS = { timeout: 60 * 1000, maxRetries: 2 };

let cached: { id: string; client: OpenAI } | null = null;

const clientFor = (apiKey: string): OpenAI => {
  const id = crypto.createHash("sha256").update(apiKey).digest("hex");
  if (!cached || cached.id !== id) {
    cached = { id, client: new OpenAI({ ...CLIENT_OPTIONS, apiKey }) };
  }
  return cached.client;
};

// Tests point the client to a fake server between cases.
export const resetTranscriptionClient = (): void => {
  cached = null;
};

const KEY_SETTING = "openai.apiKey";
const KEY_HINT_SETTING = "openai.apiKeyHint";

export type KeySource = "platform" | "env" | null;

// The key saved on the platform screen wins; OPENAI_API_KEY in the
// environment is the fallback for installations configured by file.
export const getPlatformKey = async (): Promise<{
  key: string | null;
  hint: string | null;
  source: KeySource;
}> => {
  const saved = await PlatformSetting.findAll({
    where: { key: [KEY_SETTING, KEY_HINT_SETTING] }
  });
  const sealed = saved.find(row => row.key === KEY_SETTING)?.value;
  const key = sealed ? decryptSecret(sealed) : null;
  if (key) {
    const hint =
      saved.find(row => row.key === KEY_HINT_SETTING)?.value || key.slice(-4);
    return { key, hint, source: "platform" };
  }
  const env = process.env.OPENAI_API_KEY;
  if (env) return { key: env, hint: env.slice(-4), source: "env" };
  return { key: null, hint: null, source: null };
};

// Checks the key with OpenAI before saving, so a typo does not silently
// turn transcriptions off.
export const savePlatformKey = async (input: unknown): Promise<string> => {
  const key = typeof input === "string" ? input.trim() : "";
  if (!/^sk-[\w-]{20,400}$/.test(key)) {
    throw new AppError("ERR_TRANSCRIPTION_INVALID_KEY");
  }
  try {
    await new OpenAI({ ...CLIENT_OPTIONS, apiKey: key }).models.retrieve(
      transcriptionModel()
    );
  } catch (err) {
    const status = err instanceof OpenAI.APIError ? err.status : undefined;
    if (status === 401 || status === 403) {
      throw new AppError("ERR_TRANSCRIPTION_INVALID_KEY");
    }
    if (status === 404) {
      throw new AppError("ERR_TRANSCRIPTION_MODEL_UNAVAILABLE");
    }
    throw new AppError("ERR_TRANSCRIPTION_UNAVAILABLE", 502);
  }

  const hint = key.slice(-4);
  await PlatformSetting.upsert({ key: KEY_SETTING, value: encryptSecret(key) });
  await PlatformSetting.upsert({ key: KEY_HINT_SETTING, value: hint });
  resetTranscriptionClient();
  return hint;
};

export const removePlatformKey = async (): Promise<void> => {
  await PlatformSetting.destroy({
    where: { key: [KEY_SETTING, KEY_HINT_SETTING] }
  });
  resetTranscriptionClient();
};

const startOfMonth = (now: Date): Date =>
  new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

export const getMonthlySeconds = async (
  companyId: number,
  now: Date = new Date()
): Promise<number> => {
  const total = await TranscriptionUsage.sum("seconds", {
    where: { companyId, createdAt: { [Op.gte]: startOfMonth(now) } }
  });
  return Number(total) || 0;
};

export interface TranscriptionAccess {
  allowed: boolean;
  apiKey?: string;
  reason?: string;
}

export const getTranscriptionAccess = async (
  companyId: number
): Promise<TranscriptionAccess> => {
  const company = await Company.findByPk(companyId, {
    include: [
      {
        model: Plan,
        as: "plan",
        attributes: ["transcriptionEnabled", "transcriptionMonthlyMinutes"]
      }
    ]
  });
  if (!company?.plan?.transcriptionEnabled) {
    return { allowed: false, reason: "ERR_TRANSCRIPTION_NOT_IN_PLAN" };
  }
  const { key } = await getPlatformKey();
  if (!key) {
    return { allowed: false, reason: "ERR_TRANSCRIPTION_NOT_CONFIGURED" };
  }
  const limit = company.plan.transcriptionMonthlyMinutes;
  if (limit > 0 && (await getMonthlySeconds(companyId)) >= limit * 60) {
    return { allowed: false, reason: "ERR_TRANSCRIPTION_LIMIT_REACHED" };
  }
  return { allowed: true, apiKey: key };
};

// Minutes used this month by every company, for the platform screen.
export const getUsageByCompany = async (
  now: Date = new Date()
): Promise<{ companyId: number; seconds: number; notes: number }[]> => {
  const rows = await TranscriptionUsage.findAll({
    where: { createdAt: { [Op.gte]: startOfMonth(now) } },
    attributes: [
      "companyId",
      [fn("SUM", col("seconds")), "seconds"],
      [fn("COUNT", col("id")), "notes"]
    ],
    group: ["companyId"],
    raw: true
  });
  return (rows as unknown as Record<string, unknown>[]).map(row => ({
    companyId: Number(row.companyId),
    seconds: Number(row.seconds) || 0,
    notes: Number(row.notes) || 0
  }));
};

// Length of an Ogg Opus file (the format of WhatsApp voice notes), read
// from the last page's granule position. null for anything else.
export const oggOpusSeconds = (data: Buffer): number | null => {
  const head = data.indexOf("OpusHead");
  const last = data.lastIndexOf("OggS");
  if (
    head < 0 ||
    last < 0 ||
    last + 14 > data.length ||
    head + 12 > data.length
  )
    return null;
  const granule = Number(data.readBigUInt64LE(last + 6));
  const preSkip = data.readUInt16LE(head + 10);
  const seconds = (granule - preSkip) / 48000;
  return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
};

const EXTENSIONS: Record<string, string> = {
  ogg: "ogg",
  opus: "ogg",
  mpeg: "mp3",
  mp3: "mp3",
  mp4: "m4a",
  m4a: "m4a",
  "x-m4a": "m4a",
  aac: "m4a",
  webm: "webm",
  wav: "wav",
  "x-wav": "wav",
  flac: "flac"
};

// The file name OpenAI needs to recognise the format, or null when the
// format is one it does not take (AMR, for instance).
export const audioFileName = (mimetype: string): string | null => {
  const subtype = (mimetype.split(";")[0].split("/")[1] || "").trim();
  const extension = EXTENSIONS[subtype.toLowerCase()];
  return extension ? `audio.${extension}` : null;
};

export interface TranscriptionResult {
  text: string;
  seconds: number;
}

export const transcribeAudio = async (
  apiKey: string,
  data: Buffer,
  mimetype: string
): Promise<TranscriptionResult> => {
  const filename = audioFileName(mimetype);
  if (!filename) throw new AppError("ERR_TRANSCRIPTION_UNSUPPORTED_AUDIO");
  if (data.length > MAX_AUDIO_BYTES) {
    throw new AppError("ERR_TRANSCRIPTION_AUDIO_TOO_LARGE");
  }

  const response = await clientFor(apiKey).audio.transcriptions.create({
    file: await toFile(data, filename, { type: mimetype.split(";")[0] }),
    model: transcriptionModel(),
    language: transcriptionLanguage()
  });

  // Billed by the audio's length: the API says it when it can; otherwise
  // read it from the file, or estimate it from the size (about 16 kbit/s).
  const { usage } = response as { usage?: { type?: string; seconds?: number } };
  const reported =
    usage?.type === "duration" && typeof usage.seconds === "number"
      ? usage.seconds
      : null;
  const seconds =
    reported ?? oggOpusSeconds(data) ?? Math.ceil(data.length / 2000);

  return {
    text: (response.text || "").trim(),
    seconds: Math.max(1, Math.ceil(seconds))
  };
};
