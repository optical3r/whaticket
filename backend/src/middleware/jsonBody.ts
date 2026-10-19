import express from "express";

// JSON body parser that also keeps the raw bytes for the Cloud API
// webhook, whose signature is computed over them.
const jsonBody = express.json({
  verify: (req, _res, buf) => {
    if (req.url?.startsWith("/webhooks/whatsapp-cloud/")) {
      (req as unknown as { rawBody: Buffer }).rawBody = buf;
    }
  }
});

export default jsonBody;
