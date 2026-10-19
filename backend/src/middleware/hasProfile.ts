import { Request, Response, NextFunction } from "express";

import AppError from "../errors/AppError";

export type Profile = "admin" | "supervisor" | "user";

export const PROFILES: Profile[] = ["admin", "supervisor", "user"];

// Allows the request only for the given profiles (admin is always allowed).
const hasProfile =
  (...profiles: Profile[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const { profile } = req.user || {};

    if (profile !== "admin" && !profiles.includes(profile as Profile)) {
      throw new AppError("ERR_NO_PERMISSION", 403);
    }

    return next();
  };

export const isManager = hasProfile("supervisor");

export default hasProfile;
