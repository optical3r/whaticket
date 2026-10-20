import { mkdtempSync, rmSync, unlinkSync, writeFileSync } from "fs";
import os from "os";
import path from "path";
import express from "express";
import request from "supertest";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: s3rver ships no types
import S3rver from "s3rver";

import uploadConfig from "../../../config/upload";
import { getSignedMediaPath } from "../../../helpers/MediaUrl";
import {
  isSafeFilename,
  readMedia,
  resetStorageClient,
  saveMedia
} from "../../../libs/storage";
import mediaRoutes from "../../../routes/mediaRoutes";

const app = express();
app.use("/public", mediaRoutes);

describe("media storage", () => {
  it("only accepts plain file names", () => {
    expect(isSafeFilename("foto.abc12.jpg")).toBe(true);
    expect(isSafeFilename("../../etc/passwd")).toBe(false);
    expect(isSafeFilename("a/b.jpg")).toBe(false);
    expect(isSafeFilename(".env")).toBe(false);
  });

  describe("S3 driver (S3-compatible server)", () => {
    let server: { run(): Promise<{ port: number }>; close(): Promise<void> };
    let directory: string;
    const env = { ...process.env };

    beforeAll(async () => {
      directory = mkdtempSync(path.join(os.tmpdir(), "s3rver-"));
      server = new S3rver({
        port: 0,
        address: "127.0.0.1",
        silent: true,
        directory,
        configureBuckets: [{ name: "media-test" }]
      });
      const { port } = await server.run();

      Object.assign(process.env, {
        STORAGE_DRIVER: "s3",
        S3_ENDPOINT: `http://127.0.0.1:${port}`,
        S3_FORCE_PATH_STYLE: "true",
        S3_ACCESS_KEY_ID: "S3RVER",
        S3_SECRET_ACCESS_KEY: "S3RVER",
        S3_REGION: "us-east-1",
        S3_BUCKET: "media-test"
      });
      resetStorageClient();
    });

    afterAll(async () => {
      process.env = env;
      resetStorageClient();
      await server.close();
      rmSync(directory, { recursive: true, force: true });
    });

    it("saves and reads files, including byte ranges", async () => {
      await saveMedia("audio.test.ogg", Buffer.from("0123456789"), "audio/ogg");

      const full = await readMedia("audio.test.ogg");
      expect(full?.contentType).toBe("audio/ogg");

      const part = await readMedia("audio.test.ogg", "bytes=2-5");
      expect(part?.partial).toBe(true);
      expect(part?.contentRange).toBe("bytes 2-5/10");
    });

    it("streams through the signed media route", async () => {
      await saveMedia("foto.test.jpg", Buffer.from("imagem"), "image/jpeg");

      const ok = await request(app).get(
        `/public/${getSignedMediaPath("foto.test.jpg")}`
      );
      expect(ok.status).toBe(200);
      expect(ok.headers["content-type"]).toBe("image/jpeg");
      expect(Buffer.from(ok.body).toString()).toBe("imagem");

      const ranged = await request(app)
        .get(`/public/${getSignedMediaPath("foto.test.jpg")}`)
        .set("Range", "bytes=0-1");
      expect(ranged.status).toBe(206);

      const unsigned = await request(app).get(
        "/public/9999999999/x/foto.test.jpg"
      );
      expect(unsigned.status).toBe(403);

      const missing = await request(app).get(
        `/public/${getSignedMediaPath("nada.jpg")}`
      );
      expect(missing.status).toBe(404);
    });

    it("still serves files saved locally before the switch", async () => {
      const legacy = "antigo.test.txt";
      writeFileSync(path.join(uploadConfig.directory, legacy), "legado");
      try {
        const object = await readMedia(legacy);
        expect(object).not.toBeNull();
        object?.body.on("error", () => undefined);
        object?.body.destroy();
      } finally {
        unlinkSync(path.join(uploadConfig.directory, legacy));
      }
    });
  });
});
