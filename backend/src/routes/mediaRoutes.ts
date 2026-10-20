import express, { Request, Response, NextFunction } from "express";
import uploadConfig from "../config/upload";
import isSignedMedia from "../middleware/isSignedMedia";
import { readMedia, storageDriver } from "../libs/storage";

const mediaRoutes = express.Router();

const serveLocal = express.static(uploadConfig.directory, { index: false });

// Files in S3 are streamed through the backend: the bucket stays private,
// needs no CORS setup, and the signed link still controls access.
const serveFromStorage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (storageDriver() === "local") {
    serveLocal(req, res, next);
    return;
  }

  const filename = decodeURIComponent(req.url.slice(1));
  const object = await readMedia(filename, req.headers.range);
  if (!object) {
    res.status(404).end();
    return;
  }

  res.status(object.partial ? 206 : 200);
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Cache-Control", "private, max-age=3600");
  if (object.contentType) res.setHeader("Content-Type", object.contentType);
  if (object.contentLength !== undefined) {
    res.setHeader("Content-Length", String(object.contentLength));
  }
  if (object.contentRange) res.setHeader("Content-Range", object.contentRange);

  object.body.on("error", next);
  object.body.pipe(res);
};

mediaRoutes.get(
  "/:expiry/:signature/:filename",
  isSignedMedia,
  serveFromStorage
);

export default mediaRoutes;
