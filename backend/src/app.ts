import "./bootstrap";
import "reflect-metadata";
import "express-async-errors";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import * as Sentry from "@sentry/node";

import "./database";
import AppError from "./errors/AppError";
import routes from "./routes";
import mediaRoutes from "./routes/mediaRoutes";
import { logger } from "./utils/logger";

Sentry.init({ dsn: process.env.SENTRY_DSN });

const app = express();

// Set TRUST_PROXY to the number of proxies in front of the backend (1 with the
// bundled nginx) so rate limiting sees the real client IP.
if (process.env.TRUST_PROXY) {
  const hops = Number(process.env.TRUST_PROXY);
  app.set("trust proxy", Number.isNaN(hops) ? process.env.TRUST_PROXY : hops);
}

app.use(
  helmet({
    // Media is loaded by the frontend, which lives on another origin.
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);

app.use(
  cors({
    credentials: true,
    origin: process.env.FRONTEND_URL
  })
);
app.use(cookieParser());
app.use(express.json());
app.use(Sentry.Handlers.requestHandler());
app.use("/public", mediaRoutes);
app.use(routes);

app.use(Sentry.Handlers.errorHandler());

app.use(async (err: Error, req: Request, res: Response, _: NextFunction) => {
  if (err instanceof AppError) {
    logger.warn(err);
    return res.status(err.statusCode).json({ error: err.message });
  }

  logger.error(err);
  return res.status(500).json({ error: "Internal server error" });
});

export default app;
