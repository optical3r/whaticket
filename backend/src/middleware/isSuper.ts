import { Request, Response, NextFunction } from "express";

import AppError from "../errors/AppError";

const isSuper = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user?.super) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  return next();
};

export default isSuper;
