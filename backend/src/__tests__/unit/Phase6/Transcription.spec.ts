import http from "http";
import { AddressInfo } from "net";
import faker from "faker";

import AppError from "../../../errors/AppError";
import { buildTranscript } from "../../../helpers/AiTranscript";
import { enqueue } from "../../../libs/queue";
import { saveMedia } from "../../../libs/storage";
import {
  audioFileName,
  getPlatformKey,
  getTranscriptionAccess,
  oggOpusSeconds,
  removePlatformKey,
  resetTranscriptionClient,
  savePlatformKey
} from "../../../libs/transcription";
import Contact from "../../../models/Contact";
import Message from "../../../models/Message";
import Plan from "../../../models/Plan";
import PlatformSetting from "../../../models/PlatformSetting";
import Ticket from "../../../models/Ticket";
import TranscriptionUsage from "../../../models/TranscriptionUsage";
import Whatsapp from "../../../models/Whatsapp";
import {
  QueueTranscription,
  TranscribeMessage
} from "../../../services/TranscriptionServices/TranscriptionService";
import { disconnect, truncate } from "../../utils/database";

jest.mock("../../../libs/socket", () => {
  const emitter = { to: () => emitter, emit: () => true };
  return {
    getIO: () => emitter,
    emitToCompany: () => undefined,
    companyRoom: (companyId: number, room?: string | number) =>
      room === undefined
        ? `company-${companyId}`
        : `company-${companyId}-${room}`
  };
});

// Jobs are run by hand; the queue only records them.
jest.mock("../../../libs/queue", () => ({
  defineJob: jest.fn(),
  enqueue: jest.fn().mockResolvedValue(undefined)
}));

const queued = enqueue as jest.Mock;

const GOOD_KEY = "sk-test-transcription-key-0000000000";

// A stand-in for the OpenAI API.
const calls: { url: string; auth: string; body: string }[] = [];
let server: http.Server;

// A minimal Ogg Opus file: 5 seconds after a pre-skip of 312 samples.
const oggOpus = (seconds: number): Buffer => {
  const head = Buffer.alloc(19);
  head.write("OpusHead", 0);
  head.writeUInt8(1, 8);
  head.writeUInt8(1, 9);
  head.writeUInt16LE(312, 10);
  const page = Buffer.alloc(27);
  page.write("OggS", 0);
  page.writeBigUInt64LE(BigInt(seconds * 48000 + 312), 6);
  return Buffer.concat([Buffer.from("OggS"), Buffer.alloc(24), head, page]);
};

const expectAppError = async (promise: Promise<unknown>, message: string) => {
  await expect(promise).rejects.toBeInstanceOf(AppError);
  await expect(promise).rejects.toHaveProperty("message", message);
};

const setup = async (fileBody = oggOpus(5)) => {
  const contact = await Contact.create({
    name: "Maria Souza",
    number: faker.phone.phoneNumber("55119########"),
    companyId: 1
  });
  const whatsapp = await Whatsapp.create({
    name: faker.random.uuid(),
    companyId: 1
  });
  const ticket = await Ticket.create({
    contactId: contact.id,
    whatsappId: whatsapp.id,
    status: "pending",
    companyId: 1
  });
  const filename = `${faker.random.uuid()}.ogg`;
  await saveMedia(filename, fileBody, "audio/ogg; codecs=opus");
  const audio = await Message.create({
    id: faker.random.uuid(),
    ticketId: ticket.id,
    contactId: contact.id,
    body: filename,
    mediaUrl: filename,
    mediaType: "audio",
    fromMe: false
  });
  return { contact, ticket, audio };
};

describe("Phase 6: voice note transcription", () => {
  beforeAll(async () => {
    server = http.createServer((req, res) => {
      let body = "";
      req.on("data", chunk => {
        body += chunk;
      });
      req.on("end", () => {
        const url = req.url || "";
        const auth = req.headers.authorization || "";
        calls.push({ url, auth, body });
        res.setHeader("content-type", "application/json");
        if (auth !== `Bearer ${GOOD_KEY}`) {
          res.statusCode = 401;
          res.end(JSON.stringify({ error: { message: "Incorrect API key" } }));
          return;
        }
        if (url.endsWith("/models/gpt-transcribe")) {
          res.end(JSON.stringify({ id: "gpt-transcribe", object: "model" }));
        } else if (url.endsWith("/audio/transcriptions")) {
          res.end(
            JSON.stringify({
              text: " Oi, queria saber do meu pedido 4521. ",
              usage: { type: "duration", seconds: 7 }
            })
          );
        } else {
          res.statusCode = 404;
          res.end(JSON.stringify({ error: { message: "not found" } }));
        }
      });
    });
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address() as AddressInfo;
    process.env.OPENAI_BASE_URL = `http://127.0.0.1:${port}/v1`;
  });

  beforeEach(async () => {
    await truncate();
    await PlatformSetting.destroy({ where: {} });
    await Plan.update(
      { transcriptionEnabled: true, transcriptionMonthlyMinutes: 600 },
      { where: { id: 1 } }
    );
    delete process.env.OPENAI_API_KEY;
    resetTranscriptionClient();
    calls.length = 0;
    queued.mockClear();
  });

  afterAll(async () => {
    delete process.env.OPENAI_BASE_URL;
    await new Promise(resolve => server.close(resolve));
    await truncate();
    await disconnect();
  });

  it("checks the platform key with OpenAI and keeps it encrypted", async () => {
    await expectAppError(
      savePlatformKey("not-a-key"),
      "ERR_TRANSCRIPTION_INVALID_KEY"
    );
    await expectAppError(
      savePlatformKey("sk-wrong-key-000000000000000000"),
      "ERR_TRANSCRIPTION_INVALID_KEY"
    );

    await expect(savePlatformKey(GOOD_KEY)).resolves.toBe("0000");
    const stored = await PlatformSetting.findByPk("openai.apiKey");
    expect(stored?.value).toBeTruthy();
    expect(stored?.value).not.toContain(GOOD_KEY);
    await expect(getPlatformKey()).resolves.toEqual({
      key: GOOD_KEY,
      hint: "0000",
      source: "platform"
    });

    await removePlatformKey();
    process.env.OPENAI_API_KEY = "sk-from-environment-1234";
    await expect(getPlatformKey()).resolves.toMatchObject({
      source: "env",
      hint: "1234"
    });
  });

  it("follows the plan, the key and the monthly minutes", async () => {
    await expect(getTranscriptionAccess(1)).resolves.toMatchObject({
      allowed: false,
      reason: "ERR_TRANSCRIPTION_NOT_CONFIGURED"
    });
    await savePlatformKey(GOOD_KEY);
    await expect(getTranscriptionAccess(1)).resolves.toMatchObject({
      allowed: true
    });

    await Plan.update({ transcriptionMonthlyMinutes: 1 }, { where: { id: 1 } });
    await TranscriptionUsage.create({
      companyId: 1,
      model: "gpt-transcribe",
      seconds: 60
    });
    await expect(getTranscriptionAccess(1)).resolves.toMatchObject({
      allowed: false,
      reason: "ERR_TRANSCRIPTION_LIMIT_REACHED"
    });

    await Plan.update({ transcriptionEnabled: false }, { where: { id: 1 } });
    await expect(getTranscriptionAccess(1)).resolves.toMatchObject({
      allowed: false,
      reason: "ERR_TRANSCRIPTION_NOT_IN_PLAN"
    });
  });

  it("transcribes customer voice notes and records the minutes", async () => {
    await savePlatformKey(GOOD_KEY);
    const { ticket, audio } = await setup();

    await QueueTranscription(audio, 1);
    await audio.reload();
    expect(audio.transcriptionStatus).toBe("pending");
    expect(queued).toHaveBeenCalledWith("audio.transcribe", {
      messageId: audio.id,
      companyId: 1
    });

    await TranscribeMessage({ messageId: audio.id, companyId: 1 });
    await audio.reload();
    expect(audio.transcriptionStatus).toBe("done");
    expect(audio.transcription).toBe("Oi, queria saber do meu pedido 4521.");

    const request = calls.find(call =>
      call.url.endsWith("/audio/transcriptions")
    );
    expect(request?.body).toContain('name="model"');
    expect(request?.body).toContain("gpt-transcribe");
    expect(request?.body).toContain('filename="audio.ogg"');
    const usage = await TranscriptionUsage.findAll();
    expect(usage.map(row => [row.companyId, row.seconds])).toEqual([[1, 7]]);

    // The AI reads what the customer said.
    const transcript = await buildTranscript(ticket, "America/Sao_Paulo");
    expect(transcript.text).toContain(
      "[áudio transcrito]: Oi, queria saber do meu pedido 4521."
    );

    // Another company's job cannot touch this message.
    await audio.update({ transcriptionStatus: "pending" });
    await TranscribeMessage({ messageId: audio.id, companyId: 2 });
    expect(await TranscriptionUsage.count()).toBe(1);
  });

  it("leaves out agents' audio, other media and plans without the module", async () => {
    await savePlatformKey(GOOD_KEY);
    const { audio } = await setup();

    await audio.update({ fromMe: true });
    await QueueTranscription(audio, 1);
    await audio.update({ fromMe: false, mediaType: "image" });
    await QueueTranscription(audio, 1);
    await audio.update({ mediaType: "audio" });
    await Plan.update({ transcriptionEnabled: false }, { where: { id: 1 } });
    await QueueTranscription(audio, 1);

    expect(queued).not.toHaveBeenCalled();
    await audio.reload();
    expect(audio.transcriptionStatus).toBeNull();
  });

  it("reads the length of WhatsApp voice notes and knows the formats", () => {
    expect(oggOpusSeconds(oggOpus(5))).toBe(5);
    expect(oggOpusSeconds(Buffer.from("not audio"))).toBeNull();
    expect(audioFileName("audio/ogg; codecs=opus")).toBe("audio.ogg");
    expect(audioFileName("audio/mpeg")).toBe("audio.mp3");
    expect(audioFileName("audio/amr")).toBeNull();
  });
});
