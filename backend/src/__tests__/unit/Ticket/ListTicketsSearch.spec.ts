import faker from "faker";

import Contact from "../../../models/Contact";
import Message from "../../../models/Message";
import Ticket from "../../../models/Ticket";
import Whatsapp from "../../../models/Whatsapp";
import CreateCompanyService from "../../../services/CompanyService/CreateCompanyService";
import SaveTagService from "../../../services/TagServices/SaveTagService";
import SetTicketTagsService from "../../../services/TagServices/SetTicketTagsService";
import ListTicketsService from "../../../services/TicketServices/ListTicketsService";
import CreateUserService from "../../../services/UserServices/CreateUserService";
import { disconnect, truncate } from "../../utils/database";

const createTicket = async ({
  name = faker.name.findName(),
  number = faker.phone.phoneNumber("55119########"),
  status = "pending",
  userId = null as number | null,
  companyId = 1
} = {}) => {
  const contact = await Contact.create({ name, number, companyId });
  const whatsapp = await Whatsapp.create({
    name: faker.datatype.uuid(),
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

const createUser = (profile = "admin") =>
  CreateUserService({
    name: faker.name.findName(),
    email: faker.internet.email(),
    password: "123456",
    profile,
    companyId: 1
  });

const search = (userId: number, searchParam: string, extra = {}) =>
  ListTicketsService({
    userId: String(userId),
    queueIds: [],
    showAll: "true",
    status: "pending",
    pageNumber: "1",
    searchParam,
    companyId: 1,
    ...extra
  });

describe("ListTicketsService search", () => {
  beforeEach(async () => {
    await truncate();
  });

  afterAll(async () => {
    await truncate();
    await disconnect();
  });

  it("finds tickets by contact name, ignoring case", async () => {
    const user = await createUser();
    const clara = await createTicket({ name: "Clara Souza" });
    await createTicket({ name: "Bruno Lima" });

    const { tickets, count, hasMore } = await search(user.id, "clara");

    expect(tickets.map(ticket => ticket.id)).toEqual([clara.id]);
    expect(tickets[0].contact.name).toBe("Clara Souza");
    expect(count).toBe(1);
    expect(hasMore).toBe(false);
  });

  it("finds tickets by contact number and by message body", async () => {
    const user = await createUser();
    const byNumber = await createTicket({ number: "5511987650000" });
    const byMessage = await createTicket();
    await createTicket();
    await Message.create({
      id: faker.datatype.uuid(),
      body: "Quero o ORÇAMENTO da lente",
      ticketId: byMessage.id,
      contactId: byMessage.contactId,
      fromMe: false,
      read: true
    });

    const numberResult = await search(user.id, "98765");
    expect(numberResult.tickets.map(ticket => ticket.id)).toEqual([
      byNumber.id
    ]);

    const messageResult = await search(user.id, "orçamento");
    expect(messageResult.tickets.map(ticket => ticket.id)).toEqual([
      byMessage.id
    ]);
  });

  it("keeps tags and paginates the results", async () => {
    const user = await createUser();
    const vip = await SaveTagService(1, { name: "VIP", color: "#3478F6" });
    const tickets: Ticket[] = [];
    for (let i = 0; i < 41; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      tickets.push(await createTicket({ name: `Clara ${i}` }));
    }
    await SetTicketTagsService(tickets[0].id, [vip.id], 1);

    const first = await search(user.id, "clara");
    expect(first.tickets).toHaveLength(40);
    expect(first.count).toBe(41);
    expect(first.hasMore).toBe(true);

    const second = await search(user.id, "clara", { pageNumber: "2" });
    expect(second.tickets).toHaveLength(1);
    expect(second.hasMore).toBe(false);

    const tagged = [...first.tickets, ...second.tickets].find(
      ticket => ticket.id === tickets[0].id
    );
    expect(tagged?.tags.map(tag => tag.name)).toEqual(["VIP"]);
  });

  it("treats % and _ in the search as plain characters", async () => {
    const user = await createUser();
    await createTicket({ name: "Clara" });

    await expect(search(user.id, "%")).resolves.toHaveProperty("count", 0);
    await expect(search(user.id, "_")).resolves.toHaveProperty("count", 0);
  });

  it("stays within the user's company and visible tickets", async () => {
    const user = await createUser("user");
    const colleague = await createUser("user");
    const other = await CreateCompanyService({
      name: "Outra",
      planId: 1,
      adminName: "Admin",
      adminEmail: faker.internet.email(),
      adminPassword: "123456"
    });
    const pending = await createTicket({ name: "Clara Pendente" });
    const mine = await createTicket({
      name: "Clara Minha",
      status: "open",
      userId: user.id
    });
    await createTicket({
      name: "Clara Colega",
      status: "open",
      userId: colleague.id
    });
    await createTicket({ name: "Clara Outra", companyId: other.id });

    const { tickets } = await search(user.id, "clara", {
      showAll: undefined,
      status: undefined
    });

    expect(tickets.map(ticket => ticket.id).sort()).toEqual(
      [pending.id, mine.id].sort()
    );
  });
});
