import faker from "faker";

import AppError from "../../../errors/AppError";
import Company from "../../../models/Company";
import Plan from "../../../models/Plan";
import Whatsapp from "../../../models/Whatsapp";
import { whatsappProvider } from "../../../providers/WhatsApp";
import AcceptTermsService from "../../../services/CompanyService/AcceptTermsService";
import CreateCompanyService from "../../../services/CompanyService/CreateCompanyService";
import UpdateCompanyService from "../../../services/CompanyService/UpdateCompanyService";
import SavePlanService from "../../../services/PlanService/SavePlanService";
import ListUsersService from "../../../services/UserServices/ListUsersService";
import { StartWhatsAppSession } from "../../../services/WbotServices/StartWhatsAppSession";
import CreateWhatsAppService from "../../../services/WhatsappService/CreateWhatsAppService";
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

jest.mock("../../../providers/WhatsApp", () => ({
  whatsappProvider: {
    init: jest.fn().mockResolvedValue(undefined),
    removeSession: jest.fn()
  }
}));

const init = whatsappProvider.init as jest.Mock;
const removeSession = whatsappProvider.removeSession as jest.Mock;

const expectAppError = async (promise: Promise<unknown>, message: string) => {
  await expect(promise).rejects.toBeInstanceOf(AppError);
  await expect(promise).rejects.toHaveProperty("message", message);
};

const planData = (qrcodeEnabled: boolean) => ({
  name: faker.random.uuid(),
  users: 5,
  connections: 5,
  queues: 5,
  qrcodeEnabled
});

const createCompany = async (plan: Plan): Promise<Company> => {
  const company = await CreateCompanyService({
    name: faker.company.companyName(),
    planId: plan.id,
    adminName: faker.name.findName(),
    adminEmail: faker.internet.email(),
    adminPassword: "123456"
  });
  const [admin] = (await ListUsersService({ companyId: company.id })).users;
  await AcceptTermsService(company.id, admin.id);
  return company;
};

const qrcodeConnection = (companyId: number) =>
  Whatsapp.create({
    name: faker.random.uuid(),
    status: "CONNECTED",
    channel: "qrcode",
    companyId
  });

describe("Phase 6: plans without QR code", () => {
  beforeEach(async () => {
    await truncate();
    init.mockClear();
    removeSession.mockClear();
  });

  afterAll(async () => {
    await truncate();
    await disconnect();
  });

  it("keeps QR code on existing and new plans unless it is turned off", async () => {
    const plan = await SavePlanService({ ...planData(true), name: "Com QR" });
    expect(plan.qrcodeEnabled).toBe(true);
    const defaults = await Plan.create({
      name: faker.random.uuid(),
      users: 1,
      connections: 1,
      queues: 1
    });
    expect(defaults.qrcodeEnabled).toBe(true);
  });

  it("refuses new QR code connections on an official-API-only plan", async () => {
    const plan = await SavePlanService(planData(false));
    const company = await createCompany(plan);

    await expectAppError(
      CreateWhatsAppService({ name: "Celular", companyId: company.id }),
      "ERR_QRCODE_NOT_IN_PLAN"
    );
  });

  it("does not open a session for QR code outside the plan", async () => {
    const plan = await SavePlanService(planData(false));
    const company = await createCompany(plan);
    const whatsapp = await qrcodeConnection(company.id);

    await StartWhatsAppSession(whatsapp);
    expect(init).not.toHaveBeenCalled();
    await whatsapp.reload();
    expect(whatsapp.status).toBe("DISCONNECTED");
  });

  it("stops and restarts QR code sessions when the plan changes", async () => {
    const plan = await SavePlanService(planData(true));
    const company = await createCompany(plan);
    const whatsapp = await qrcodeConnection(company.id);

    await SavePlanService({ ...planData(false), name: plan.name }, plan.id);
    expect(removeSession).toHaveBeenCalledWith(whatsapp.id);
    await whatsapp.reload();
    expect(whatsapp.status).toBe("DISCONNECTED");

    await SavePlanService({ ...planData(true), name: plan.name }, plan.id);
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(init).toHaveBeenCalledTimes(1);
  });

  it("stops QR code sessions when the company moves to a plan without it", async () => {
    const withQrcode = await SavePlanService(planData(true));
    const officialOnly = await SavePlanService(planData(false));
    const company = await createCompany(withQrcode);
    const whatsapp = await qrcodeConnection(company.id);

    await UpdateCompanyService({
      companyId: company.id,
      companyData: { planId: officialOnly.id },
      requesterCompanyId: 1
    });
    expect(removeSession).toHaveBeenCalledWith(whatsapp.id);
    await whatsapp.reload();
    expect(whatsapp.status).toBe("DISCONNECTED");
  });
});
