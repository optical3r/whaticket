import Setting from "../../models/Setting";

const ListSettingsService = async (
  companyId: number
): Promise<Setting[] | undefined> => {
  const settings = await Setting.findAll({ where: { companyId } });

  return settings;
};

export default ListSettingsService;
