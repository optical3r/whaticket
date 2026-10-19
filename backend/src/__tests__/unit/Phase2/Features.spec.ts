import http from "http";
import { AddressInfo } from "net";
import faker from "faker";

import AppError from "../../../errors/AppError";
import Contact from "../../../models/Contact";
import Message from "../../../models/Message";
import Ticket from "../../../models/Ticket";
import TicketRating from "../../../models/TicketRating";
import Whatsapp from "../../../models/Whatsapp";
import CreateCompanyService from "../../../services/CompanyService/CreateCompanyService";
import SaveTagService from "../../../services/TagServices/SaveTagService";
import SetTicketTagsService from "../../../services/TagServices/SetTicketTagsService";
import ListTicketsService from "../../../services/TicketServices/ListTicketsService";
import {
  CreateTicketNoteService,
  DeleteTicketNoteService
} from "../../../services/TicketNoteServices/TicketNoteServices";
import { SaveCloseReasonService } from "../../../services/CloseReasonServices/CloseReasonServices";
import UpdateSettingService from "../../../services/SettingServices/UpdateSettingService";
import ListSettingsService from "../../../services/SettingServices/ListSettingsService";
import UpdateTicketService from "../../../services/TicketServices/UpdateTicketService";
import {
  FindPendingRating,
  RegisterRatingAnswer
} from "../../../services/TicketServices/TicketRatingService";
import ReportService from "../../../services/ReportServices/ReportService";
import {
  SaveWebhookService,
  deliverWebhook,
  signPayload
} from "../../../services/WebhookServices/WebhookServices";
import CreateUserService from "../../../services/UserServices/CreateUserService";
import { disconnect, truncate } from "../../utils/database";

// Ticket updates notify connected browsers; there are none in tests.
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

const expectAppError = async (promise: Promise<unknown>, message: string) => {
  await expect(promise).rejects.toBeInstanceOf(AppError);
  await expect(promise).rejects.toHaveProperty("message", message);
};

const createTicket = async (companyId = 1, status = "open") => {
  const contact = await Contact.create({
    name: faker.name.findName(),
    number: faker.phone.phoneNumber("55119########"),
    companyId
  });
  const whatsapp = await Whatsapp.create({
    name: faker.random.uuid(),
    companyId
  });
  const ticket = await Ticket.create({
    contactId: contact.id,
    whatsappId: whatsapp.id,
    status,
    companyId
  });
  return { contact, whatsapp, ticket };
};

const createUser = (profile = "user", companyId = 1) =>
  CreateUserService({
    name: faker.name.findName(),
    email: faker.internet.email(),
    password: "123456",
    profile,
    companyId
  });

describe("Phase 2 features", () => {
  beforeEach(async () => {
    await truncate();
  });

  afterAll(async () => {
    await truncate();
    await disconnect();
  });

  describe("profiles", () => {
    it("accepts supervisors and rejects unknown profiles", async () => {
      await expect(createUser("supervisor")).resolves.toHaveProperty(
        "profile",
        "supervisor"
      );
      await expect(createUser("owner")).rejects.toBeInstanceOf(AppError);
    });
  });

  describe("tags", () => {
    it("are unique per company and cannot be borrowed from another company", async () => {
      const other = await CreateCompanyService({
        name: "Outra",
        planId: 1,
        adminName: "Admin",
        adminEmail: faker.internet.email(),
        adminPassword: "123456"
      });
      await SaveTagService(1, { name: "VIP", color: "#3478F6" });
      const foreignTag = await SaveTagService(other.id, {
        name: "VIP",
        color: "#3478F6"
      });

      await expectAppError(
        SaveTagService(1, { name: "VIP", color: "#000000" }),
        "ERR_TAG_NAME_ALREADY_EXISTS"
      );

      const { ticket } = await createTicket();
      await expectAppError(
        SetTicketTagsService(ticket.id, [foreignTag.id], 1),
        "ERR_TAG_NOT_FOUND"
      );
    });

    it("filters the ticket list by tag", async () => {
      const user = await createUser("admin");
      const vip = await SaveTagService(1, { name: "VIP", color: "#3478F6" });
      const { ticket: tagged } = await createTicket(1, "pending");
      await createTicket(1, "pending");

      await SetTicketTagsService(tagged.id, [vip.id], 1);

      const { tickets } = await ListTicketsService({
        userId: String(user.id),
        queueIds: [],
        showAll: "true",
        tagIds: [vip.id],
        companyId: 1
      });

      expect(tickets.map(ticket => ticket.id)).toEqual([tagged.id]);
      expect(tickets[0].tags.map(tag => tag.name)).toEqual(["VIP"]);
    });
  });

  describe("internal notes", () => {
    it("only the author or a manager can delete a note", async () => {
      const author = await createUser("user");
      const colleague = await createUser("user");
      const supervisor = await createUser("supervisor");
      const { ticket } = await createTicket();

      const note = await CreateTicketNoteService({
        ticketId: ticket.id,
        body: "Cliente prefere contato à tarde",
        userId: author.id,
        companyId: 1
      });
      expect(note).toHaveProperty("user.name", author.name);

      await expectAppError(
        DeleteTicketNoteService({
          noteId: note.id,
          userId: colleague.id,
          profile: "user",
          companyId: 1
        }),
        "ERR_NO_PERMISSION"
      );

      await expect(
        DeleteTicketNoteService({
          noteId: note.id,
          userId: supervisor.id,
          profile: "supervisor",
          companyId: 1
        })
      ).resolves.toHaveProperty("id", note.id);
    });

    it("rejects empty notes", async () => {
      const { ticket } = await createTicket();
      await expectAppError(
        CreateTicketNoteService({
          ticketId: ticket.id,
          body: "  ",
          userId: 1,
          companyId: 1
        }),
        "ERR_NOTE_EMPTY"
      );
    });
  });

  describe("settings", () => {
    it("lists defaults and only accepts known keys and values", async () => {
      const settings = await ListSettingsService(1);
      expect(settings).toEqual(
        expect.arrayContaining([{ key: "csatEnabled", value: "disabled" }])
      );

      await expectAppError(
        UpdateSettingService({ key: "userApiToken", value: "x", companyId: 1 }),
        "ERR_NO_SETTING_FOUND"
      );
      await expectAppError(
        UpdateSettingService({
          key: "csatEnabled",
          value: "maybe",
          companyId: 1
        }),
        "ERR_INVALID_SETTING_VALUE"
      );
      await UpdateSettingService({
        key: "csatEnabled",
        value: "enabled",
        companyId: 1
      });
      expect(await ListSettingsService(1)).toEqual(
        expect.arrayContaining([{ key: "csatEnabled", value: "enabled" }])
      );
    });
  });

  describe("closing tickets", () => {
    it("requires a reason when the company asks for one", async () => {
      const reason = await SaveCloseReasonService(1, "Resolvido");
      await UpdateSettingService({
        key: "closeReasonRequired",
        value: "enabled",
        companyId: 1
      });
      const { ticket } = await createTicket();

      await expectAppError(
        UpdateTicketService({
          ticketId: ticket.id,
          ticketData: { status: "closed" },
          companyId: 1
        }),
        "ERR_CLOSE_REASON_REQUIRED"
      );

      const { ticket: closed } = await UpdateTicketService({
        ticketId: ticket.id,
        ticketData: { status: "closed", closeReasonId: reason.id },
        companyId: 1
      });
      expect(closed.closeReasonId).toBe(reason.id);
      expect(closed.closedAt).toBeInstanceOf(Date);

      const { ticket: reopened } = await UpdateTicketService({
        ticketId: ticket.id,
        ticketData: { status: "open" },
        companyId: 1
      });
      expect(reopened.closedAt).toBeNull();
      expect(reopened.closeReasonId).toBeNull();
    });
  });

  describe("satisfaction survey", () => {
    it("stores a 1-5 answer for the closed ticket and ignores other text", async () => {
      const { ticket, contact, whatsapp } = await createTicket(1, "closed");
      await TicketRating.create({ ticketId: ticket.id, companyId: 1 });

      const pending = await FindPendingRating(contact, whatsapp.id);
      expect(pending).not.toBeNull();

      expect(
        await RegisterRatingAnswer(pending as TicketRating, "obrigado", contact)
      ).toBe(false);
      expect(
        await RegisterRatingAnswer(pending as TicketRating, "4", contact)
      ).toBe(true);

      const saved = await TicketRating.findOne({
        where: { ticketId: ticket.id }
      });
      expect(saved?.rating).toBe(4);
      expect(await FindPendingRating(contact, whatsapp.id)).toBeNull();
    });
  });

  describe("reports", () => {
    it("measures first response without counting automatic messages", async () => {
      const { ticket } = await createTicket(1, "closed");
      const created = new Date("2026-10-19T13:00:00Z"); // 10:00 in São Paulo
      await Ticket.update(
        { createdAt: created, closedAt: new Date("2026-10-19T14:00:00Z") },
        { where: { id: ticket.id }, silent: true }
      );
      const message = (id: string, body: string, minutes: number) =>
        Message.create({
          id,
          ticketId: ticket.id,
          body,
          fromMe: true,
          createdAt: new Date(created.getTime() + minutes * 60000)
        });
      await message("auto", "\u200eOlá! Escolha uma opção", 0);
      await message("agent", "Oi, aqui é a Maria", 5);
      await TicketRating.create({
        ticketId: ticket.id,
        companyId: 1,
        rating: 5,
        ratedAt: new Date()
      });
      await TicketRating.update(
        { createdAt: new Date("2026-10-19T14:05:00Z") },
        { where: { ticketId: ticket.id }, silent: true }
      );

      const report = await ReportService({
        companyId: 1,
        from: "2026-10-19",
        to: "2026-10-19"
      });

      expect(report.totals.created).toBe(1);
      expect(report.totals.closed).toBe(1);
      expect(report.totals.avgFirstResponseSeconds).toBe(300);
      expect(report.totals.avgResolutionSeconds).toBe(3600);
      expect(report.csat.average).toBe(5);
      expect(report.byDay).toEqual([
        { day: "2026-10-19", created: 1, closed: 1 }
      ]);
    });

    it("rejects invalid or too long periods", async () => {
      await expectAppError(
        ReportService({ companyId: 1, from: "2026-10-20", to: "2026-10-19" }),
        "ERR_REPORT_INVALID_RANGE"
      );
      await expectAppError(
        ReportService({ companyId: 1, from: "2024-01-01", to: "2026-01-01" }),
        "ERR_REPORT_RANGE_TOO_LONG"
      );
    });
  });

  describe("webhooks", () => {
    it("validates url and events", async () => {
      await expectAppError(
        SaveWebhookService(1, {
          name: "CRM",
          url: "ftp://x.com",
          events: ["ticket.closed"]
        }),
        "ERR_WEBHOOK_INVALID_URL"
      );
      await expectAppError(
        SaveWebhookService(1, {
          name: "CRM",
          url: "https://x.com",
          events: ["user.deleted"]
        }),
        "ERR_WEBHOOK_INVALID_EVENTS"
      );
    });

    it("signs the payload and records the delivery", async () => {
      let received: { body: string; signature?: string } | null = null;
      const server = http.createServer((req, res) => {
        let body = "";
        req.on("data", chunk => {
          body += chunk;
        });
        req.on("end", () => {
          received = {
            body,
            signature: req.headers["x-webhook-signature"] as string
          };
          res.writeHead(204);
          res.end();
        });
      });
      await new Promise<void>(resolve =>
        server.listen(0, "127.0.0.1", resolve)
      );
      const { port } = server.address() as AddressInfo;

      process.env.WEBHOOK_ALLOW_PRIVATE_URLS = "true";
      try {
        const webhook = await SaveWebhookService(1, {
          name: "Local",
          url: `http://127.0.0.1:${port}/hook`,
          events: ["ticket.closed"]
        });
        const delivered = await deliverWebhook(webhook, "ticket.closed", {
          id: 1
        });

        expect(delivered.lastStatus).toBe(204);
        expect(delivered.lastError).toBeNull();
        const { body, signature } = received as unknown as {
          body: string;
          signature: string;
        };
        expect(signature).toBe(signPayload(webhook.secret, body));
        expect(JSON.parse(body)).toMatchObject({
          event: "ticket.closed",
          data: { id: 1 }
        });
      } finally {
        delete process.env.WEBHOOK_ALLOW_PRIVATE_URLS;
        server.close();
      }
    });

    it("records an error instead of calling internal addresses", async () => {
      const webhook = await SaveWebhookService(1, {
        name: "Interno",
        url: "http://127.0.0.1:9/hook",
        events: ["ticket.closed"]
      });
      const delivered = await deliverWebhook(webhook, "ticket.closed", {});
      expect(delivered.lastStatus).toBeNull();
      expect(delivered.lastError).toBe("ERR_WEBHOOK_BLOCKED_ADDRESS");
    });
  });
});
