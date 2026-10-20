// Helpers shared by the flow editor and its simulator. The simulator
// follows the same rules as the backend engine (FlowEngine.ts), so what
// the admin tests here is what the customer gets.

export const STEP_TYPES = ["message", "menu", "question", "queue", "close"];
export const MAX_STEPS = 100;
export const MAX_OPTIONS = 10;
export const MAX_ATTEMPTS = 3;

const SAMPLE_NAME = "Maria Silva";

export const nextStepId = steps => {
	const used = steps
		.map(step => /^s(\d+)$/.exec(step.id))
		.filter(Boolean)
		.map(match => Number(match[1]));
	return `s${used.length ? Math.max(...used) + 1 : 1}`;
};

export const newStep = (steps, type = "message") => withType({ id: nextStepId(steps), text: "" }, type);

// Keeps only the fields the new type uses.
export const withType = (step, type) => {
	const base = { id: step.id, type, text: step.text || "" };
	switch (type) {
		case "message":
			return { ...base, next: step.next || null };
		case "question":
			return { ...base, field: step.field || "", next: step.next || null };
		case "menu":
			return {
				...base,
				invalidText: step.invalidText || "",
				options: step.options && step.options.length ? step.options : [{ label: "", next: "" }],
			};
		case "queue":
			return { ...base, queueId: step.queueId || "" };
		default:
			return base;
	}
};

// Removes a step and every link that pointed to it.
export const removeStep = (definition, id) => {
	const steps = definition.steps
		.filter(step => step.id !== id)
		.map(step => ({
			...step,
			...(step.next === id ? { next: null } : {}),
			...(step.options
				? { options: step.options.map(option => (option.next === id ? { ...option, next: "" } : option)) }
				: {}),
		}));
	const startId = definition.startId === id ? (steps[0] ? steps[0].id : "") : definition.startId;
	return { startId, steps };
};

// The first problem of a step, as a translation key, or null.
export const stepProblem = step => {
	const needsText = !["queue", "close"].includes(step.type);
	if (needsText && !step.text.trim()) return "flowEditor.errors.text";
	if (step.type === "menu" && step.options.some(option => !option.label.trim() || !option.next)) {
		return "flowEditor.errors.option";
	}
	if (step.type === "question" && !step.field.trim()) return "flowEditor.errors.field";
	if (step.type === "queue" && !step.queueId) return "flowEditor.errors.queue";
	return null;
};

const render = text =>
	text
		.replace(/\{\{\s*name\s*\}\}/g, SAMPLE_NAME)
		.replace(/\{\{\s*firstName\s*\}\}/g, SAMPLE_NAME.split(" ")[0]);

const normalize = value =>
	value
		.trim()
		.toLowerCase()
		.normalize("NFD")
		.replace(/\p{M}/gu, "")
		.replace(/[^a-z0-9 ]/g, "")
		.replace(/\s+/g, " ");

export const menuText = step => {
	const options = step.options.map((option, index) => `*${index + 1}* - ${option.label}`).join("\n");
	return `${render(step.text)}\n\n${options}`;
};

export const matchOption = (step, answer) => {
	const value = normalize(answer || "");
	const number = Number(value);
	if (value && Number.isInteger(number) && number >= 1 && number <= step.options.length) {
		return step.options[number - 1];
	}
	return step.options.find(option => normalize(option.label) === value) || null;
};

// Walks steps from `id` until one waits for an answer or ends the flow.
// Returns the messages sent and the new state of the conversation.
const walk = (definition, id, state, t) => {
	const steps = new Map(definition.steps.map(step => [step.id, step]));
	const messages = [];
	let current = id;
	for (let count = 0; count < 50; count += 1) {
		const step = current ? steps.get(current) : undefined;
		if (!step) {
			return { messages, state: { ...state, stepId: null, ended: t("flowEditor.simulator.endTeam") } };
		}
		if (step.type === "message") {
			messages.push(render(step.text));
			current = step.next;
		} else if (step.type === "menu") {
			messages.push(menuText(step));
			return { messages, state: { ...state, stepId: step.id, attempts: 0 } };
		} else if (step.type === "question") {
			messages.push(render(step.text));
			return { messages, state: { ...state, stepId: step.id, attempts: 0 } };
		} else {
			if (step.text) messages.push(render(step.text));
			const ended =
				step.type === "queue"
					? t("flowEditor.simulator.endQueue", { queue: state.queueName(step.queueId) })
					: t("flowEditor.simulator.endClosed");
			return { messages, state: { ...state, stepId: null, ended } };
		}
	}
	return { messages, state: { ...state, stepId: null, ended: t("flowEditor.simulator.endTeam") } };
};

export const startSimulation = (definition, queueName, t) =>
	walk(definition, definition.startId, { stepId: null, attempts: 0, answers: {}, ended: null, queueName }, t);

export const answerSimulation = (definition, state, body, t) => {
	const step = definition.steps.find(item => item.id === state.stepId);
	if (!step) {
		return { messages: [], state: { ...state, stepId: null, ended: t("flowEditor.simulator.endTeam") } };
	}
	if (step.type === "menu") {
		const option = matchOption(step, body);
		if (option) return walk(definition, option.next, state, t);
		const attempts = state.attempts + 1;
		if (attempts >= MAX_ATTEMPTS) {
			return {
				messages: [t("flowEditor.simulator.giveUp")],
				state: { ...state, stepId: null, ended: t("flowEditor.simulator.endTeam") },
			};
		}
		return {
			messages: [step.invalidText || t("flowEditor.simulator.invalid"), menuText(step)],
			state: { ...state, attempts },
		};
	}
	const answers = { ...state.answers, [step.field || "Resposta"]: body };
	return walk(definition, step.next, { ...state, answers }, t);
};
