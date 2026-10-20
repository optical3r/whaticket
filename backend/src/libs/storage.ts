import { promises as fs, createReadStream } from "fs";
import path from "path";
import { Readable } from "stream";
import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";

import uploadConfig from "../config/upload";

// Where media files (received and sent through WhatsApp) are kept.
//  - local: backend/public (default; needs a persistent volume)
//  - s3:    any S3-compatible bucket (AWS S3, Cloudflare R2, MinIO)
export type StorageDriver = "local" | "s3";

export interface StoredObject {
  body: Readable;
  contentType?: string;
  contentLength?: number;
  contentRange?: string;
  partial: boolean;
}

export const storageDriver = (): StorageDriver =>
  process.env.STORAGE_DRIVER === "s3" ? "s3" : "local";

// Only plain file names are stored; anything else could escape the folder.
export const isSafeFilename = (filename: string): boolean =>
  /^[\w.\- ()]+$/.test(filename) && !filename.startsWith(".");

let s3Client: S3Client | null = null;

const s3 = (): S3Client => {
  if (!s3Client) {
    s3Client = new S3Client({
      region: process.env.S3_REGION || "auto",
      endpoint: process.env.S3_ENDPOINT || undefined,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || ""
      }
    });
  }
  return s3Client;
};

const bucket = (): string => process.env.S3_BUCKET || "";
export const s3Key = (filename: string): string =>
  `${process.env.S3_PREFIX ?? "media/"}${filename}`;

const localPath = (filename: string): string =>
  path.join(uploadConfig.directory, filename);

export const saveMedia = async (
  filename: string,
  data: Buffer,
  contentType?: string
): Promise<void> => {
  if (!isSafeFilename(filename)) {
    throw new Error("ERR_INVALID_MEDIA_FILENAME");
  }

  if (storageDriver() === "s3") {
    await s3().send(
      new PutObjectCommand({
        Bucket: bucket(),
        Key: s3Key(filename),
        Body: data,
        ContentType: contentType
      })
    );
    return;
  }

  await fs.writeFile(localPath(filename), data);
};

const localExists = async (filename: string): Promise<boolean> => {
  try {
    await fs.access(localPath(filename));
    return true;
  } catch {
    return false;
  }
};

// Reads a stored file. `range` is the HTTP Range header, so audio and video
// can be streamed and seeked. Files saved before switching to S3 are still
// read from the local folder until they are migrated.
export const readMedia = async (
  filename: string,
  range?: string
): Promise<StoredObject | null> => {
  if (!isSafeFilename(filename)) return null;

  if (storageDriver() === "s3") {
    try {
      const result = await s3().send(
        new GetObjectCommand({
          Bucket: bucket(),
          Key: s3Key(filename),
          Range: range
        })
      );
      return {
        body: result.Body as Readable,
        contentType: result.ContentType,
        contentLength: result.ContentLength,
        contentRange: result.ContentRange,
        partial: Boolean(result.ContentRange)
      };
    } catch (err) {
      const status = (err as { $metadata?: { httpStatusCode?: number } })
        .$metadata?.httpStatusCode;
      if (status !== 404 && status !== 403) throw err;
      if (!(await localExists(filename))) return null;
    }
  }

  if (!(await localExists(filename))) return null;
  // Local files are served by express.static (which handles Range itself).
  return {
    body: createReadStream(localPath(filename)),
    partial: false
  };
};

export const existsInS3 = async (filename: string): Promise<boolean> => {
  try {
    await s3().send(
      new HeadObjectCommand({ Bucket: bucket(), Key: s3Key(filename) })
    );
    return true;
  } catch {
    return false;
  }
};

export const resetStorageClient = (): void => {
  s3Client = null;
};
