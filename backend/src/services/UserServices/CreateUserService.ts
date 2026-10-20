import * as Yup from "yup";

import AppError from "../../errors/AppError";
import { SerializeUser } from "../../helpers/SerializeUser";
import User from "../../models/User";
import { PROFILES } from "../../middleware/hasProfile";
import CheckCompanyLimit from "../CompanyService/CheckCompanyLimit";
import {
  assertQueuesInCompany,
  assertWhatsappInCompany
} from "../../helpers/AssertCompanyOwnership";

interface Request {
  email: string;
  password: string;
  name: string;
  queueIds?: number[];
  profile?: string;
  whatsappId?: number;
  companyId: number;
}

interface Response {
  email: string;
  name: string;
  id: number;
  profile: string;
}

const CreateUserService = async ({
  email,
  password,
  name,
  queueIds = [],
  profile = "admin",
  whatsappId,
  companyId
}: Request): Promise<Response> => {
  const schema = Yup.object().shape({
    name: Yup.string().required().min(2),
    email: Yup.string()
      .email()
      .required()
      .test(
        "Check-email",
        "An user with this email already exists.",
        async value => {
          if (!value) return false;
          const emailExists = await User.findOne({
            where: { email: value }
          });
          return !emailExists;
        }
      ),
    password: Yup.string().required().min(5),
    profile: Yup.string().oneOf(PROFILES, "ERR_INVALID_PROFILE")
  });

  try {
    await schema.validate({ email, password, name, profile });
  } catch (err) {
    throw new AppError(err.message);
  }

  await CheckCompanyLimit(companyId, "users");
  await assertQueuesInCompany(queueIds, companyId);
  await assertWhatsappInCompany(whatsappId, companyId);

  const user = await User.create(
    {
      email,
      password,
      name,
      profile,
      whatsappId: whatsappId || null,
      companyId
    },
    { include: ["queues", "whatsapp"] }
  );

  await user.$set("queues", queueIds);

  await user.reload();

  return SerializeUser(user);
};

export default CreateUserService;
