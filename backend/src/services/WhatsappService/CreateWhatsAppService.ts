import * as Yup from "yup";

import AppError from "../../errors/AppError";
import Whatsapp from "../../models/Whatsapp";
import Company from "../../models/Company";
import AssociateWhatsappQueue from "./AssociateWhatsappQueue";
import { assertQueuesInCompany } from "../../helpers/AssertCompanyOwnership";
import CheckCompanyLimit from "../CompanyService/CheckCompanyLimit";
import {
  CloudApiInput,
  saveCloudCredentials
} from "../../helpers/CloudApiCredentials";
import { assertFlowInCompany } from "../FlowServices/FlowServices";
import { isQrcodeAllowed } from "../../helpers/PlanFeatures";
import {
  availableChannels,
  WhatsappChannel
} from "../../providers/WhatsApp/whatsappProvider";

interface Request {
  name: string;
  queueIds?: number[];
  greetingMessage?: string;
  farewellMessage?: string;
  status?: string;
  isDefault?: boolean;
  channel?: string;
  cloud?: CloudApiInput;
  flowId?: number | string | null;
  companyId: number;
}

interface Response {
  whatsapp: Whatsapp;
  oldDefaultWhatsapp: Whatsapp | null;
}

const CreateWhatsAppService = async ({
  name,
  status = "OPENING",
  queueIds = [],
  greetingMessage,
  farewellMessage,
  isDefault = false,
  channel = "qrcode",
  cloud,
  flowId,
  companyId
}: Request): Promise<Response> => {
  if (!availableChannels.includes(channel as WhatsappChannel)) {
    throw new AppError("ERR_CHANNEL_NOT_AVAILABLE");
  }

  const schema = Yup.object().shape({
    name: Yup.string()
      .required()
      .min(2)
      .test(
        "Check-name",
        "This whatsapp name is already used.",
        async value => {
          if (!value) return false;
          const nameExists = await Whatsapp.findOne({
            where: { name: value, companyId }
          });
          return !nameExists;
        }
      ),
    isDefault: Yup.boolean().required()
  });

  try {
    await schema.validate({ name, status, isDefault });
  } catch (err) {
    throw new AppError(err.message);
  }

  // QR code connections can get the number banned; the company admin has to
  // accept that risk before the first connection is created.
  if (channel === "qrcode" && !(await isQrcodeAllowed(companyId))) {
    throw new AppError("ERR_QRCODE_NOT_IN_PLAN", 403);
  }
  const company = await Company.findByPk(companyId);
  if (channel === "qrcode" && !company?.termsAcceptedAt) {
    throw new AppError("ERR_TERMS_NOT_ACCEPTED", 403);
  }

  await CheckCompanyLimit(companyId, "connections");
  await assertQueuesInCompany(queueIds, companyId);
  const checkedFlowId = await assertFlowInCompany(flowId, companyId);

  const whatsappFound = await Whatsapp.findOne({ where: { companyId } });

  isDefault = !whatsappFound;

  let oldDefaultWhatsapp: Whatsapp | null = null;

  if (isDefault) {
    oldDefaultWhatsapp = await Whatsapp.findOne({
      where: { isDefault: true, companyId }
    });
    if (oldDefaultWhatsapp) {
      await oldDefaultWhatsapp.update({ isDefault: false });
    }
  }

  if (queueIds.length > 1 && !greetingMessage) {
    throw new AppError("ERR_WAPP_GREETING_REQUIRED");
  }

  const whatsapp = await Whatsapp.create(
    {
      name,
      status,
      greetingMessage,
      farewellMessage,
      isDefault,
      channel,
      flowId: checkedFlowId,
      companyId
    },
    { include: ["queues"] }
  );

  if (channel === "cloudapi") {
    try {
      await saveCloudCredentials(whatsapp.id, cloud || {});
    } catch (err) {
      // A connection without valid credentials would never work.
      await whatsapp.destroy();
      if (oldDefaultWhatsapp)
        await oldDefaultWhatsapp.update({ isDefault: true });
      throw err;
    }
  }

  await AssociateWhatsappQueue(whatsapp, queueIds);

  return { whatsapp, oldDefaultWhatsapp };
};

export default CreateWhatsAppService;
