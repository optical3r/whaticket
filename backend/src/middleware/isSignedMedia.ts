import { Request, Response, NextFunction } from "express";

import AppError from "../errors/AppError";
import { isValidMediaSignature } from "../helpers/MediaUrl";

const isSignedMedia = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { expiry, signature, filename } = req.params;

  if (!isValidMediaSignature(filename, expiry, signature)) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  req.url = `/${encodeURIComponent(filename)}`;
  return next();
};

export default isSignedMedia;
