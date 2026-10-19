import * as Yup from "yup";
import AppError from "../../errors/AppError";
import Queue from "../../models/Queue";
import { QueueSchedule, isValidSchedule } from "../../helpers/BusinessHours";
import CheckCompanyLimit from "../CompanyService/CheckCompanyLimit";

interface QueueData {
  name: string;
  color: string;
  greetingMessage?: string;
  schedules?: QueueSchedule[];
  outOfHoursMessage?: string;
}

const CreateQueueService = async (
  queueData: QueueData,
  companyId: number
): Promise<Queue> => {
  const { color, name } = queueData;

  const queueSchema = Yup.object().shape({
    name: Yup.string()
      .min(2, "ERR_QUEUE_INVALID_NAME")
      .required("ERR_QUEUE_INVALID_NAME")
      .test(
        "Check-unique-name",
        "ERR_QUEUE_NAME_ALREADY_EXISTS",
        async value => {
          if (value) {
            const queueWithSameName = await Queue.findOne({
              where: { name: value, companyId }
            });

            return !queueWithSameName;
          }
          return false;
        }
      ),
    color: Yup.string()
      .required("ERR_QUEUE_INVALID_COLOR")
      .test("Check-color", "ERR_QUEUE_INVALID_COLOR", async value => {
        if (value) {
          const colorTestRegex = /^#[0-9a-f]{3,6}$/i;
          return colorTestRegex.test(value);
        }
        return false;
      })
      .test(
        "Check-color-exists",
        "ERR_QUEUE_COLOR_ALREADY_EXISTS",
        async value => {
          if (value) {
            const queueWithSameColor = await Queue.findOne({
              where: { color: value, companyId }
            });
            return !queueWithSameColor;
          }
          return false;
        }
      )
  });

  if (
    queueData.schedules !== undefined &&
    !isValidSchedule(queueData.schedules)
  ) {
    throw new AppError("ERR_QUEUE_INVALID_SCHEDULE");
  }

  try {
    await queueSchema.validate({ color, name });
  } catch (err) {
    throw new AppError(err.message);
  }

  await CheckCompanyLimit(companyId, "queues");

  const queue = await Queue.create({ ...queueData, companyId });

  return queue;
};

export default CreateQueueService;
