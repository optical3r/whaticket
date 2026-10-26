import AppError from "../../errors/AppError";
import EmitWhatsappSession from "../../helpers/EmitWhatsappSession";
import { saveCoexyChannel } from "../../helpers/CloudApiCredentials";
import {
  CoexyChannelStatus,
  createCoexyChannel,
  deleteCoexyChannel,
  getCoexyChannel,
  getCoexyKey,
  coexyRowsToCheck
} from "../../libs/coexy";
import CloudApiCredential from "../../models/CloudApiCredential";
import Company from "../../models/Company";
import Whatsapp from "../../models/Whatsapp";
import { forgetCloudSession } from "../../providers/WhatsApp/Implementations/cloudapi";
import { logger } from "../../utils/logger";

// Connection status for each Coexy channel status. PENDING: the company
// has not connected the number from the link yet.
const SESSION_STATUS: Record<CoexyChannelStatus, string> = {
  pending: "PENDING",
  active: "CONNECTED",
  disconnected: "DISCONNECTED",
  suspended: "DISCONNECTED"
};

const setSessionStatus = async (
  whatsappId: number,
  status: string
): Promise<void> => {
  const whatsapp = await Whatsapp.findByPk(whatsappId);
  if (!whatsapp || whatsapp.status === status) return;
  await whatsapp.update({ status, qrcode: "", retries: 0 });
  EmitWhatsappSession(whatsapp);
};

// Creates the Coexy channel of a new connection. The company then opens
// the channel's link to connect its number.
export const CreateCoexyConnection = async (
  whatsapp: Whatsapp
): Promise<void> => {
  const company = await Company.findByPk(whatsapp.companyId, {
    attributes: ["name"]
  });
  const channel = await createCoexyChannel(
    `${company?.name || "Empresa"} - ${whatsapp.name}`
  );
  try {
    await saveCoexyChannel(whatsapp.id, channel);
  } catch (err) {
    // A channel no connection points to would be paid for nothing.
    await deleteCoexyChannel(channel.id).catch(() => undefined);
    throw err;
  }
  await whatsapp.update({
    status: SESSION_STATUS[channel.status] || "PENDING"
  });
};

// Reads the channel from Coexy and updates the connection: the number's
// ids once connected, the status, the business verification.
export const SyncCoexyChannel = async (
  whatsappId: number
): Promise<CloudApiCredential | null> => {
  const row = await CloudApiCredential.findByPk(whatsappId);
  if (!row || row.provider !== "coexy" || !row.coexyChannelId) return null;

  const channel = await getCoexyChannel(row.coexyChannelId);
  await saveCoexyChannel(whatsappId, channel);
  forgetCloudSession(whatsappId);
  await setSessionStatus(
    whatsappId,
    SESSION_STATUS[channel.status] || "DISCONNECTED"
  );
  return row.reload();
};

// The proxy refused the channel (403/503): the company has to reconnect
// the number from the same link. The channel is never recreated.
export const MarkCoexyDisconnected = async (
  whatsappId: number
): Promise<void> => {
  await CloudApiCredential.update(
    { coexyStatus: "disconnected" },
    { where: { whatsappId, provider: "coexy" } }
  );
  await setSessionStatus(whatsappId, "DISCONNECTED");
};

// The company is about to (re)connect the number: checks now and keeps
// checking often for the next two days.
export const WatchCoexyChannel = async (
  whatsappId: number
): Promise<CloudApiCredential | null> => {
  const row = await CloudApiCredential.findByPk(whatsappId);
  if (!row || row.provider !== "coexy") return null;
  row.changed("updatedAt", true);
  await row.save();
  return SyncCoexyChannel(whatsappId);
};

// Before a connection is deleted: its channel stops being paid for.
export const DeleteCoexyConnection = async (
  whatsappId: number
): Promise<void> => {
  const row = await CloudApiCredential.findByPk(whatsappId, {
    attributes: ["whatsappId", "provider", "coexyChannelId"]
  });
  if (row?.provider !== "coexy" || !row.coexyChannelId) return;
  if (!(await getCoexyKey()).key) {
    logger.warn({
      info: "Coexy channel left behind: no Coexy key",
      whatsappId,
      channelId: row.coexyChannelId
    });
    return;
  }
  await deleteCoexyChannel(row.coexyChannelId);
};

let checking = false;

const checkChannels = async (onlyWaiting: boolean): Promise<void> => {
  if (checking || !(await getCoexyKey()).key) return;
  checking = true;
  try {
    const rows = (await coexyRowsToCheck(onlyWaiting)).filter(
      row => row.coexyChannelId
    );
    // eslint-disable-next-line no-restricted-syntax
    for (const row of rows) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await SyncCoexyChannel(row.whatsappId);
      } catch (err) {
        logger.warn({
          info: "Coexy channel check failed",
          whatsappId: row.whatsappId,
          err: err instanceof AppError ? err.message : err
        });
      }
    }
  } finally {
    checking = false;
  }
};

// Coexy has no event for a channel that got connected or disconnected
// (sends report a lost channel at once, with 403/503). The channels
// waiting for the number are checked every minute, so the connection
// shows up soon after the company finishes; all of them every 20 minutes.
export const StartCoexyMonitor = (): void => {
  const minute = setInterval(() => {
    checkChannels(true).catch(() => undefined);
  }, 60 * 1000);
  const all = setInterval(() => {
    checkChannels(false).catch(() => undefined);
  }, 20 * 60 * 1000);
  minute.unref();
  all.unref();
};
