import Company from "../models/Company";
import Plan from "../models/Plan";

// Whether the company's plan includes QR code connections (unofficial
// WhatsApp, one browser per number). Plans without it use the official API.
export const isQrcodeAllowed = async (companyId: number): Promise<boolean> => {
  const company = await Company.findByPk(companyId, {
    attributes: ["id", "planId"],
    include: [{ model: Plan, as: "plan", attributes: ["qrcodeEnabled"] }]
  });
  return company?.plan?.qrcodeEnabled !== false;
};
