import express from "express";

// JSON body parser that also keeps the raw bytes for the Cloud API and
// Coexy webhooks, whose signatures are computed over them.
const jsonBody = express.json({
  verify: (req, _res, buf) => {
    if (
      req.url?.startsWith("/webhooks/whatsapp-cloud/") ||
      req.url?.startsWith("/webhooks/coexy")
    ) {
      (req as unknown as { rawBody: Buffer }).rawBody = buf;
    }
  }
});

export default jsonBody;
