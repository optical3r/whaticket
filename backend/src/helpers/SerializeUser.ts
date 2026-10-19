import Company from "../models/Company";
import Queue from "../models/Queue";
import User from "../models/User";
import Whatsapp from "../models/Whatsapp";

interface SerializedCompany {
  id: number;
  name: string;
  status: string;
  termsAcceptedAt: Date | null;
}

interface SerializedUser {
  id: number;
  name: string;
  email: string;
  profile: string;
  super: boolean;
  companyId: number;
  company?: SerializedCompany;
  queues: Queue[];
  whatsapp: Whatsapp;
}

const serializeCompany = (company?: Company): SerializedCompany | undefined =>
  company
    ? {
        id: company.id,
        name: company.name,
        status: company.status,
        termsAcceptedAt: company.termsAcceptedAt || null
      }
    : undefined;

export const SerializeUser = (user: User): SerializedUser => {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    profile: user.profile,
    super: user.super,
    companyId: user.companyId,
    company: serializeCompany(user.company),
    queues: user.queues,
    whatsapp: user.whatsapp
  };
};
