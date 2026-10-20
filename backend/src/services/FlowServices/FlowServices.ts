import AppError from "../../errors/AppError";
import Flow, {
  FlowDefinition,
  FlowStep,
  FlowStepType
} from "../../models/Flow";
import Queue from "../../models/Queue";
import Whatsapp from "../../models/Whatsapp";

const MAX_STEPS = 100;
const MAX_OPTIONS = 10;
const STEP_ID = /^[a-z0-9_-]{1,32}$/i;
const TYPES: FlowStepType[] = ["message", "menu", "question", "queue", "close"];

const fail = (code: string): never => {
  throw new AppError(code);
};

const text = (value: unknown, max: number, required: boolean): string => {
  const result = typeof value === "string" ? value.trim() : "";
  if ((required && !result) || result.length > max) {
    fail("ERR_FLOW_INVALID_TEXT");
  }
  return result;
};

// Where the step sits on the editor's board; ignored when it is not a
// pair of reasonable numbers.
const boardPosition = (value: unknown): Pick<FlowStep, "position"> => {
  const point = (value || {}) as { x?: unknown; y?: unknown };
  const x = Number(point.x);
  const y = Number(point.y);
  if (
    point.x === undefined ||
    point.y === undefined ||
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    Math.abs(x) > 100000 ||
    Math.abs(y) > 100000
  ) {
    return {};
  }
  return { position: { x: Math.round(x), y: Math.round(y) } };
};

// Cleans and checks a definition sent by the editor. Every reference must
// point to an existing step or to a queue of the company, and message
// steps cannot loop among themselves (they would send forever).
export const validateDefinition = async (
  companyId: number,
  input: unknown
): Promise<FlowDefinition> => {
  const raw = (input || {}) as { startId?: unknown; steps?: unknown };
  if (!Array.isArray(raw.steps) || raw.steps.length === 0) {
    fail("ERR_FLOW_EMPTY");
  }
  const rawSteps = raw.steps as Record<string, unknown>[];
  if (rawSteps.length > MAX_STEPS) fail("ERR_FLOW_TOO_LARGE");

  const ids = new Set<string>();
  rawSteps.forEach(step => {
    const id = String(step.id || "");
    if (!STEP_ID.test(id) || ids.has(id)) fail("ERR_FLOW_INVALID_STEP");
    ids.add(id);
  });
  const reference = (value: unknown, required: boolean): string | null => {
    if (value === null || value === undefined || value === "") {
      if (required) fail("ERR_FLOW_BROKEN_LINK");
      return null;
    }
    const id = String(value);
    if (!ids.has(id)) fail("ERR_FLOW_BROKEN_LINK");
    return id;
  };

  const queueIds = (
    await Queue.findAll({ where: { companyId }, attributes: ["id"] })
  ).map(queue => queue.id);

  const steps: FlowStep[] = rawSteps.map(step => {
    const type = step.type as FlowStepType;
    if (!TYPES.includes(type)) fail("ERR_FLOW_INVALID_STEP");
    const base = { id: String(step.id), type, ...boardPosition(step.position) };

    switch (type) {
      case "message":
        return {
          ...base,
          text: text(step.text, 2000, true),
          next: reference(step.next, false)
        };
      case "question":
        return {
          ...base,
          text: text(step.text, 2000, true),
          field: text(step.field, 40, true),
          next: reference(step.next, false)
        };
      case "menu": {
        const options = Array.isArray(step.options) ? step.options : [];
        if (options.length === 0 || options.length > MAX_OPTIONS) {
          fail("ERR_FLOW_INVALID_OPTIONS");
        }
        return {
          ...base,
          text: text(step.text, 2000, true),
          invalidText: text(step.invalidText, 500, false),
          options: options.map((option: Record<string, unknown>) => ({
            label: text(option.label, 60, true),
            next: reference(option.next, true) as string
          }))
        };
      }
      case "queue": {
        const queueId = Number(step.queueId);
        if (!queueIds.includes(queueId)) fail("ERR_FLOW_INVALID_QUEUE");
        return { ...base, text: text(step.text, 2000, false), queueId };
      }
      default:
        return { ...base, text: text(step.text, 2000, false) };
    }
  });

  const startId = reference(raw.startId, true) as string;

  const byId = new Map(steps.map(step => [step.id, step]));
  steps
    .filter(step => step.type === "message")
    .forEach(step => {
      const seen = new Set<string>();
      let current: FlowStep | undefined = step;
      while (current && current.type === "message") {
        if (seen.has(current.id)) fail("ERR_FLOW_LOOP");
        seen.add(current.id);
        current = current.next ? byId.get(current.next) : undefined;
      }
    });

  return { startId, steps };
};

export const ListFlowsService = async (companyId: number): Promise<Flow[]> =>
  Flow.findAll({ where: { companyId }, order: [["name", "ASC"]] });

const findFlow = async (
  companyId: number,
  flowId: number | string
): Promise<Flow> => {
  const flow = await Flow.findOne({ where: { id: flowId, companyId } });
  if (!flow) throw new AppError("ERR_FLOW_NOT_FOUND", 404);
  return flow;
};

export const ShowFlowService = findFlow;

export const SaveFlowService = async (
  companyId: number,
  data: { name?: unknown; definition?: unknown },
  flowId?: number | string
): Promise<Flow> => {
  const name = typeof data.name === "string" ? data.name.trim() : "";
  if (name.length < 2 || name.length > 80) fail("ERR_FLOW_INVALID_NAME");
  const definition = await validateDefinition(companyId, data.definition);

  if (!flowId) return Flow.create({ name, definition, companyId });

  const flow = await findFlow(companyId, flowId);
  await flow.update({ name, definition });
  return flow;
};

export const DeleteFlowService = async (
  companyId: number,
  flowId: number | string
): Promise<void> => {
  const flow = await findFlow(companyId, flowId);
  await flow.destroy();
};

// Connections of the company that run each flow.
export const FlowConnectionsService = async (
  companyId: number
): Promise<Whatsapp[]> =>
  Whatsapp.findAll({
    where: { companyId },
    attributes: ["id", "name", "flowId"]
  });

export const assertFlowInCompany = async (
  flowId: unknown,
  companyId: number
): Promise<number | null> => {
  if (flowId === null || flowId === undefined || flowId === "") return null;
  return (await findFlow(companyId, Number(flowId))).id;
};
