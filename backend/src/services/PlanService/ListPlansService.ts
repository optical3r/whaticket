import Plan from "../../models/Plan";

const ListPlansService = async (): Promise<Plan[]> => {
  return Plan.findAll({ order: [["name", "ASC"]] });
};

export default ListPlansService;
