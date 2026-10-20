import faker from "faker";

import AppError from "../../../errors/AppError";
import Contact from "../../../models/Contact";
import Ticket from "../../../models/Ticket";
import Whatsapp from "../../../models/Whatsapp";
import CreateCompanyService from "../../../services/CompanyService/CreateCompanyService";
import {
  DeleteStageService,
  ListBoardService,
  MoveTicketService,
  ReorderStagesService,
  SaveStageService
} from "../../../services/KanbanServices/KanbanServices";
import CreateUserService from "../../../services/UserServices/CreateUserService";
import { disconnect, truncate } from "../../utils/database";

const expectAppError = async (promise: Promise<unknown>, message: string) => {
  await expect(promise).rejects.toBeInstanceOf(AppError);
  await expect(promise).rejects.toHaveProperty("message", message);
};

const createTicket = async (
  status: string,
  userId: number | null = null,
  companyId = 1
) => {
  const contact = await Contact.create({
    name: faker.name.findName(),
    number: faker.phone.phoneNumber("55119########"),
    companyId
  });
  const whatsapp = await Whatsapp.create({
    name: faker.random.uuid(),
    companyId
  });
  return Ticket.create({
    contactId: contact.id,
    whatsappId: whatsapp.id,
    status,
    userId,
    companyId
  });
};

const createUser = (profile: string, companyId = 1) =>
  CreateUserService({
    name: faker.name.findName(),
    email: faker.internet.email(),
    password: "123456",
    profile,
    companyId
  });

describe("Phase 5: Kanban", () => {
  beforeEach(async () => {
    await truncate();
  });

  afterAll(async () => {
    await truncate();
    await disconnect();
  });

  it("keeps stages in the order the manager chooses", async () => {
    const lead = await SaveStageService(1, { name: "Novo", color: "#3478F6" });
    const proposal = await SaveStageService(1, {
      name: "Proposta",
      color: "#7158E8"
    });

    await expectAppError(
      SaveStageService(1, { name: " ", color: "#3478F6" }),
      "ERR_KANBAN_INVALID_NAME"
    );
    await expectAppError(
      ReorderStagesService(1, [proposal.id]),
      "ERR_KANBAN_INVALID_ORDER"
    );

    const ordered = await ReorderStagesService(1, [proposal.id, lead.id]);
    expect(ordered.map(stage => stage.name)).toEqual(["Proposta", "Novo"]);
  });

  it("moves tickets between stages and back to no stage when a stage is deleted", async () => {
    const admin = await createUser("admin");
    const stage = await SaveStageService(1, {
      name: "Proposta",
      color: "#7158E8"
    });
    const ticket = await createTicket("open", admin.id);

    await MoveTicketService({
      ticketId: ticket.id,
      stageId: stage.id,
      userId: admin.id,
      profile: "admin",
      companyId: 1
    });
    await ticket.reload();
    expect(ticket.kanbanStageId).toBe(stage.id);

    await DeleteStageService(1, stage.id);
    await ticket.reload();
    expect(ticket.kanbanStageId).toBeNull();
  });

  it("never mixes companies", async () => {
    const other = await CreateCompanyService({
      name: "Outra",
      planId: 1,
      adminName: "Admin",
      adminEmail: faker.internet.email(),
      adminPassword: "123456"
    });
    const foreignStage = await SaveStageService(other.id, {
      name: "Deles",
      color: "#3478F6"
    });
    const admin = await createUser("admin");
    const ticket = await createTicket("open", admin.id);

    await expectAppError(
      MoveTicketService({
        ticketId: ticket.id,
        stageId: foreignStage.id,
        userId: admin.id,
        profile: "admin",
        companyId: 1
      }),
      "ERR_KANBAN_STAGE_NOT_FOUND"
    );
    await expectAppError(
      DeleteStageService(1, foreignStage.id),
      "ERR_KANBAN_STAGE_NOT_FOUND"
    );
  });

  it("shows agents their own and the waiting tickets only", async () => {
    const agent = await createUser("user");
    const colleague = await createUser("user");
    const mine = await createTicket("open", agent.id);
    const waiting = await createTicket("pending");
    const theirs = await createTicket("open", colleague.id);
    await createTicket("closed", agent.id);

    const { tickets } = await ListBoardService(agent.id, "user", 1);
    expect(tickets.map(ticket => ticket.id).sort()).toEqual(
      [mine.id, waiting.id].sort()
    );

    const stage = await SaveStageService(1, { name: "Novo", color: "#3478F6" });
    await expectAppError(
      MoveTicketService({
        ticketId: theirs.id,
        stageId: stage.id,
        userId: agent.id,
        profile: "user",
        companyId: 1
      }),
      "ERR_NO_TICKET_FOUND"
    );

    const supervisor = await createUser("supervisor");
    const board = await ListBoardService(supervisor.id, "supervisor", 1);
    expect(board.tickets).toHaveLength(3);
  });
});
