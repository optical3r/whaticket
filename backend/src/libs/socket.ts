import { Server as SocketIO } from "socket.io";
import { Server } from "http";
import { verify } from "jsonwebtoken";
import AppError from "../errors/AppError";
import { logger } from "../utils/logger";
import authConfig from "../config/auth";

let io: SocketIO;

interface SocketTokenPayload {
  id: string;
  companyId?: number;
}

// Every room is prefixed with the company, so a client can only ever join
// (and receive events from) rooms of its own company.
export const companyRoom = (
  companyId: number,
  room?: string | number
): string =>
  room === undefined ? `company-${companyId}` : `company-${companyId}-${room}`;

export const initIO = (httpServer: Server): SocketIO => {
  io = new SocketIO(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL
    }
  });

  io.on("connection", socket => {
    const { token } = socket.handshake.query;
    let tokenData: SocketTokenPayload;
    try {
      tokenData = verify(
        token as string,
        authConfig.secret
      ) as SocketTokenPayload;
      logger.debug(JSON.stringify(tokenData), "io-onConnection: tokenData");
    } catch (error) {
      logger.error(JSON.stringify(error), "Error decoding token");
      socket.disconnect();
      return io;
    }

    const { companyId } = tokenData;
    if (!companyId) {
      socket.disconnect();
      return io;
    }

    logger.info("Client Connected");
    socket.join(companyRoom(companyId));

    socket.on("joinChatBox", (ticketId: string) => {
      logger.info("A client joined a ticket channel");
      socket.join(companyRoom(companyId, ticketId));
    });

    socket.on("joinNotification", () => {
      logger.info("A client joined notification channel");
      socket.join(companyRoom(companyId, "notification"));
    });

    socket.on("joinTickets", (status: string) => {
      logger.info(`A client joined to ${status} tickets channel.`);
      socket.join(companyRoom(companyId, status));
    });

    socket.on("disconnect", () => {
      logger.info("Client disconnected");
    });

    return socket;
  });
  return io;
};

export const getIO = (): SocketIO => {
  if (!io) {
    throw new AppError("Socket IO not initialized");
  }
  return io;
};

// Shortcut for events every user of a company should receive.
export const emitToCompany = (
  companyId: number,
  event: string,
  payload: unknown
): void => {
  getIO().to(companyRoom(companyId)).emit(event, payload);
};
