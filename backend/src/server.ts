import gracefulShutdown from "http-graceful-shutdown";
import app from "./app";
import { initIO } from "./libs/socket";
import { closeQueue, startWorker } from "./libs/queue";
import { logger } from "./utils/logger";
import { StartAllWhatsAppsSessions } from "./services/WbotServices/StartAllWhatsAppsSessions";
import { ResumeCampaigns } from "./services/CampaignServices/CampaignDispatcher";

const server = app.listen(process.env.PORT, () => {
  logger.info(`Server started on port: ${process.env.PORT}`);
});

initIO(server);
startWorker();
StartAllWhatsAppsSessions();
ResumeCampaigns().catch(err =>
  logger.error({ info: "Could not resume campaigns", err })
);
gracefulShutdown(server, {
  onShutdown: () => closeQueue()
});

process.on("uncaughtException", err => {
  logger.error({ info: "Global uncaught exception", err });
});

process.on("unhandledRejection", err => {
  if (err) logger.error({ info: "Global unhandled rejection", err });
});
