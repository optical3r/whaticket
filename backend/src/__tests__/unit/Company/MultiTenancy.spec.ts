import faker from "faker";
import AppError from "../../../errors/AppError";
import Company from "../../../models/Company";
import Contact from "../../../models/Contact";
import Plan from "../../../models/Plan";
import Ticket from "../../../models/Ticket";
import Whatsapp from "../../../models/Whatsapp";
import { assertCompanyIsActive } from "../../../helpers/CompanyStatus";
import AcceptTermsService from "../../../services/CompanyService/AcceptTermsService";
import CreateCompanyService from "../../../services/CompanyService/CreateCompanyService";
import UpdateCompanyService from "../../../services/CompanyService/UpdateCompanyService";
import CreateContactService from "../../../services/ContactServices/CreateContactService";
import ListContactsService from "../../../services/ContactServices/ListContactsService";
import ShowContactService from "../../../services/ContactServices/ShowContactService";
import CreateQueueService from "../../../services/QueueService/CreateQueueService";
import ListQueuesService from "../../../services/QueueService/ListQueuesService";
import ShowQueueService from "../../../services/QueueService/ShowQueueService";
import ListSettingsService from "../../../services/SettingServices/ListSettingsService";
import ShowTicketService from "../../../services/TicketServices/ShowTicketService";
import UpdateTicketService from "../../../services/TicketServices/UpdateTicketService";
import AuthUserService from "../../../services/UserServices/AuthUserService";
import CreateUserService from "../../../services/UserServices/CreateUserService";
import ListUsersService from "../../../services/UserServices/ListUsersService";
import CreateWhatsAppService from "../../../services/WhatsappService/CreateWhatsAppService";
import { disconnect, truncate } from "../../utils/database";

const expectAppError = async (
  promise: Promise<unknown>,
  message: string
): Promise<void> => {
  await expect(promise).rejects.toBeInstanceOf(AppError);
  await expect(promise).rejects.toHaveProperty("message", message);
};

const createPlan = async (limits: Partial<Plan> = {}): Promise<Plan> =>
  Plan.create({
    name: faker.random.uuid(),
    users: 10,
    connections: 10,
    queues: 10,
    ...limits
  });

const createCompany = async (
  limits: Partial<Plan> = {}
): Promise<{ company: Company; adminEmail: string; adminPassword: string }> => {
  const plan = await createPlan(limits);
  const adminEmail = faker.internet.email();
  const adminPassword = faker.internet.password();
  const company = await CreateCompanyService({
    name: faker.company.companyName(),
    planId: plan.id,
    adminName: faker.name.findName(),
    adminEmail,
    adminPassword
  });
  return { company, adminEmail, adminPassword };
};

describe("Multi-tenancy", () => {
  beforeEach(async () => {
    await truncate();
  });

  afterAll(async () => {
    await truncate();
    await disconnect();
  });

  describe("company creation", () => {
    it("creates the company with its admin and its own API token", async () => {
      const { company, adminEmail } = await createCompany();

      const { users } = await ListUsersService({ companyId: company.id });
      expect(users).toHaveLength(1);
      expect(users[0]).toHaveProperty("email", adminEmail);
      expect(users[0]).toHaveProperty("profile", "admin");

      const [ownToken] = (await ListSettingsService(company.id)) || [];
      expect(ownToken).toHaveProperty("key", "userApiToken");
    });

    it("rejects a duplicated company name or admin e-mail", async () => {
      const { company, adminEmail } = await createCompany();

      await expectAppError(
        CreateCompanyService({
          name: company.name,
          planId: 1,
          adminName: "Admin",
          adminEmail: faker.internet.email(),
          adminPassword: "123456"
        }),
        "ERR_COMPANY_NAME_ALREADY_EXISTS"
      );

      await expectAppError(
        CreateCompanyService({
          name: faker.company.companyName(),
          planId: 1,
          adminName: "Admin",
          adminEmail,
          adminPassword: "123456"
        }),
        "ERR_USER_EMAIL_ALREADY_EXISTS"
      );
    });
  });

  describe("data isolation", () => {
    it("keeps contacts apart, even with the same number", async () => {
      const { company } = await createCompany();
      const number = "5511999990000";

      const own = await CreateContactService({
        name: "A",
        number,
        companyId: 1
      });
      await CreateContactService({ name: "B", number, companyId: company.id });

      const { contacts } = await ListContactsService({ companyId: 1 });
      expect(contacts.map(contact => contact.id)).toEqual([own.id]);

      await expectAppError(
        ShowContactService(own.id, company.id),
        "ERR_NO_CONTACT_FOUND"
      );
    });

    it("keeps queues apart and allows the same name in each company", async () => {
      const { company } = await createCompany();
      const queueData = { name: "Vendas", color: "#3478F6" };

      const own = await CreateQueueService(queueData, 1);
      await CreateQueueService(queueData, company.id);

      expect(await ListQueuesService(1)).toHaveLength(1);
      await expectAppError(
        ShowQueueService(own.id, company.id),
        "ERR_QUEUE_NOT_FOUND"
      );
    });

    it("does not show or change another company's ticket", async () => {
      const { company } = await createCompany();
      const contact = await Contact.create({
        name: "Cliente",
        number: "5511988887777",
        companyId: 1
      });
      const whatsapp = await Whatsapp.create({
        name: "Comercial",
        companyId: 1
      });
      const ticket = await Ticket.create({
        contactId: contact.id,
        whatsappId: whatsapp.id,
        status: "pending",
        companyId: 1
      });

      await expectAppError(
        ShowTicketService(ticket.id, company.id),
        "ERR_NO_TICKET_FOUND"
      );

      // A queue id from another company cannot be linked to the ticket.
      const otherQueue = await CreateQueueService(
        { name: "Suporte", color: "#35C2D6" },
        company.id
      );
      await expectAppError(
        UpdateTicketService({
          ticketId: ticket.id,
          ticketData: { queueId: otherQueue.id },
          companyId: 1
        }),
        "ERR_QUEUE_NOT_FOUND"
      );
    });

    it("does not link users to queues of another company", async () => {
      const { company } = await createCompany();
      const otherQueue = await CreateQueueService(
        { name: "Financeiro", color: "#7158E8" },
        company.id
      );

      await expectAppError(
        CreateUserService({
          name: "Atendente",
          email: faker.internet.email(),
          password: "123456",
          profile: "user",
          queueIds: [otherQueue.id],
          companyId: 1
        }),
        "ERR_QUEUE_NOT_FOUND"
      );
    });
  });

  describe("plan limits", () => {
    it("blocks new users above the plan limit", async () => {
      const { company } = await createCompany({ users: 1 });

      await expectAppError(
        CreateUserService({
          name: "Segundo",
          email: faker.internet.email(),
          password: "123456",
          companyId: company.id
        }),
        "ERR_PLAN_LIMIT_USERS"
      );
    });

    it("blocks new queues above the plan limit", async () => {
      const { company } = await createCompany({ queues: 0 });

      await expectAppError(
        CreateQueueService({ name: "Fila", color: "#3478F6" }, company.id),
        "ERR_PLAN_LIMIT_QUEUES"
      );
    });

    it("requires the terms before connections and respects the limit", async () => {
      const { company } = await createCompany({ connections: 1 });
      const [admin] = (await ListUsersService({ companyId: company.id })).users;

      await expectAppError(
        CreateWhatsAppService({ name: "Principal", companyId: company.id }),
        "ERR_TERMS_NOT_ACCEPTED"
      );

      await AcceptTermsService(company.id, admin.id);

      const { whatsapp } = await CreateWhatsAppService({
        name: "Principal",
        companyId: company.id
      });
      expect(whatsapp).toHaveProperty("companyId", company.id);
      expect(whatsapp).toHaveProperty("channel", "qrcode");

      await expectAppError(
        CreateWhatsAppService({ name: "Segunda", companyId: company.id }),
        "ERR_PLAN_LIMIT_CONNECTIONS"
      );
    });
  });

  describe("suspension", () => {
    it("blocks access to a suspended company until it is reactivated", async () => {
      const { company, adminEmail, adminPassword } = await createCompany();

      await UpdateCompanyService({
        companyId: company.id,
        companyData: { status: "suspended" },
        requesterCompanyId: 1
      });

      await expectAppError(
        assertCompanyIsActive(company.id),
        "ERR_COMPANY_SUSPENDED"
      );
      await expectAppError(
        AuthUserService({ email: adminEmail, password: adminPassword }),
        "ERR_COMPANY_SUSPENDED"
      );

      await UpdateCompanyService({
        companyId: company.id,
        companyData: { status: "active" },
        requesterCompanyId: 1
      });

      await expect(assertCompanyIsActive(company.id)).resolves.toBeUndefined();
      await expect(
        AuthUserService({ email: adminEmail, password: adminPassword })
      ).resolves.toHaveProperty("token");
    });

    it("does not let the super admin suspend their own company", async () => {
      await expectAppError(
        UpdateCompanyService({
          companyId: 1,
          companyData: { status: "suspended" },
          requesterCompanyId: 1
        }),
        "ERR_CANNOT_SUSPEND_OWN_COMPANY"
      );
    });
  });
});
