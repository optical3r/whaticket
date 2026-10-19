import * as Yup from "yup";

import AppError from "../../errors/AppError";
import { SerializeUser } from "../../helpers/SerializeUser";
import ShowUserService from "./ShowUserService";
import {
  assertQueuesInCompany,
  assertWhatsappInCompany
} from "../../helpers/AssertCompanyOwnership";

interface UserData {
  email?: string;
  password?: string;
  name?: string;
  profile?: string;
  queueIds?: number[];
  whatsappId?: number;
}

interface Request {
  userData: UserData;
  userId: string | number;
  companyId: number;
}

interface Response {
  id: number;
  name: string;
  email: string;
  profile: string;
}

const UpdateUserService = async ({
  userData,
  userId,
  companyId
}: Request): Promise<Response | undefined> => {
  const user = await ShowUserService(userId, companyId);

  const schema = Yup.object().shape({
    name: Yup.string().min(2),
    email: Yup.string().email(),
    profile: Yup.string(),
    password: Yup.string()
  });

  const {
    email,
    password,
    profile,
    name,
    queueIds = [],
    whatsappId
  } = userData;

  try {
    await schema.validate({ email, password, profile, name });
  } catch (err) {
    throw new AppError(err.message);
  }

  await assertQueuesInCompany(queueIds, companyId);
  await assertWhatsappInCompany(whatsappId, companyId);

  await user.update({
    email,
    password,
    profile,
    name,
    whatsappId: whatsappId ? whatsappId : null
  });

  await user.$set("queues", queueIds);

  await user.reload();

  return SerializeUser(user);
};

export default UpdateUserService;
