import { writeFileSync, unlinkSync } from "fs";
import { join } from "path";
import request from "supertest";
import express from "express";
import uploadConfig from "../../../config/upload";
import {
  getSignedMediaPath,
  isValidMediaSignature
} from "../../../helpers/MediaUrl";
import mediaRoutes from "../../../routes/mediaRoutes";

const app = express();
app.use("/public", mediaRoutes);

describe("Signed media URLs", () => {
  const filename = "signed-media-test.txt";

  beforeAll(() => {
    writeFileSync(join(uploadConfig.directory, filename), "media");
  });

  afterAll(() => {
    unlinkSync(join(uploadConfig.directory, filename));
  });

  it("accepts the signature it generated", () => {
    const [expiry, signature, encoded] =
      getSignedMediaPath(filename).split("/");

    expect(decodeURIComponent(encoded)).toBe(filename);
    expect(isValidMediaSignature(filename, expiry, signature)).toBe(true);
  });

  it("rejects a signature made for another file", () => {
    const [expiry, signature] = getSignedMediaPath("other.jpg").split("/");

    expect(isValidMediaSignature(filename, expiry, signature)).toBe(false);
  });

  it("rejects an expired link", () => {
    const [, signature] = getSignedMediaPath(filename).split("/");
    const past = String(Math.floor(Date.now() / 1000) - 60);

    expect(isValidMediaSignature(filename, past, signature)).toBe(false);
  });

  it("serves the file only through a signed path", async () => {
    const signed = await request(app).get(
      `/public/${getSignedMediaPath(filename)}`
    );
    expect(signed.status).toBe(200);
    expect(signed.text).toBe("media");

    const unsigned = await request(app).get(`/public/${filename}`);
    expect(unsigned.status).not.toBe(200);

    const tampered = await request(app).get(
      `/public/9999999999/invalid/${filename}`
    );
    expect(tampered.status).toBe(403);
  });
});
