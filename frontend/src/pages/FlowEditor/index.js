import React, { useEffect, useMemo, useState } from "react";
import { useHistory, useParams } from "react-router-dom";
import { toast } from "react-toastify";

import { makeStyles } from "tss-react/mui";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import Title from "../../components/Title";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { i18n } from "../../translate/i18n";
import FlowSimulator from "./FlowSimulator";
import {
	MAX_OPTIONS,
	MAX_STEPS,
	STEP_TYPES,
	newStep,
	removeStep,
	stepProblem,
	withType,
} from "./flowLogic";

const useStyles = makeStyles()(theme => ({
	layout: {
		flex: 1,
		minHeight: 0,
		display: "grid",
		gridTemplateColumns: "minmax(0, 1fr) 360px",
		gap: theme.spacing(2),
		[theme.breakpoints.down("md")]: {
			display: "flex",
			flexDirection: "column",
			overflowY: "auto",
		},
	},
	editor: {
		minHeight: 0,
		overflowY: "auto",
		display: "flex",
		flexDirection: "column",
		gap: theme.spacing(2),
		paddingRight: theme.spacing(0.5),
		...theme.scrollbarStyles,
		[theme.breakpoints.down("md")]: {
			flexShrink: 0,
			overflowY: "visible",
		},
	},
	simulator: {
		minHeight: 0,
		[theme.breakpoints.down("md")]: {
			flexShrink: 0,
			height: 520,
		},
	},
	section: {
		padding: theme.spacing(2),
		display: "flex",
		flexDirection: "column",
		gap: theme.spacing(2),
	},
	help: {
		color: theme.palette.text.secondary,
	},
	row: {
		display: "flex",
		flexWrap: "wrap",
		gap: theme.spacing(2),
		"& > *": {
			flex: "1 1 220px",
		},
	},
	stepHeader: {
		display: "flex",
		alignItems: "center",
		gap: theme.spacing(1),
		flexWrap: "wrap",
	},
	stepTitle: {
		fontWeight: 600,
	},
	stepId: {
		fontFamily: theme.typography.monoFontFamily,
		color: theme.palette.text.secondary,
	},
	spacer: {
		flex: 1,
	},
	error: {
		borderColor: theme.palette.error.main,
	},
	errorText: {
		color: theme.palette.error.main,
	},
	option: {
		display: "flex",
		alignItems: "flex-start",
		gap: theme.spacing(1),
		"& > .MuiTextField-root": {
			flex: 1,
		},
	},
	optionNumber: {
		fontFamily: theme.typography.monoFontFamily,
		color: theme.palette.text.secondary,
		minWidth: 24,
		paddingTop: theme.spacing(1.25),
	},
	loading: {
		flex: 1,
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
	},
}));

const NONE = "";

const emptyDefinition = () => ({
	startId: "s1",
	steps: [
		{
			id: "s1",
			type: "message",
			text: i18n.t("flowEditor.defaultGreeting").replace("%FIRST_NAME%", "{{firstName}}"),
			next: null,
		},
	],
});

const FlowEditor = () => {
	const { classes, cx } = useStyles();
	const history = useHistory();
	const { flowId } = useParams();
	const isNew = flowId === "new";

	const [name, setName] = useState("");
	const [definition, setDefinition] = useState(isNew ? emptyDefinition() : null);
	const [queues, setQueues] = useState([]);
	const [showErrors, setShowErrors] = useState(false);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		const load = async () => {
			try {
				const { data } = await api.get("/queue");
				setQueues(data);
				if (!isNew) {
					const { data: flow } = await api.get(`/flows/${flowId}`);
					setName(flow.name);
					setDefinition(flow.definition);
				}
			} catch (err) {
				toastError(err);
			}
		};
		void load();
	}, [flowId, isNew]);

	const problems = useMemo(
		() => (definition ? definition.steps.map(stepProblem) : []),
		[definition]
	);
	const hasProblems = problems.some(Boolean);

	const stepLabel = (step, index) => {
		const type = i18n.t(`flowEditor.types.${step.type}`);
		const snippet = step.text.trim().slice(0, 40);
		return `${index + 1}. ${type}${snippet ? `: ${snippet}` : ""}`;
	};

	const updateStep = (id, changes) =>
		setDefinition(current => ({
			...current,
			steps: current.steps.map(step => (step.id === id ? { ...step, ...changes } : step)),
		}));

	const changeType = (id, type) =>
		setDefinition(current => ({
			...current,
			steps: current.steps.map(step => (step.id === id ? withType(step, type) : step)),
		}));

	const updateOption = (step, index, changes) =>
		updateStep(step.id, {
			options: step.options.map((option, position) =>
				position === index ? { ...option, ...changes } : option
			),
		});

	const addStep = () =>
		setDefinition(current => ({
			...current,
			steps: [...current.steps, newStep(current.steps)],
		}));

	const moveStep = (index, offset) =>
		setDefinition(current => {
			const steps = [...current.steps];
			const [step] = steps.splice(index, 1);
			steps.splice(index + offset, 0, step);
			return { ...current, steps };
		});

	const save = async () => {
		if (!name.trim() || hasProblems) {
			setShowErrors(true);
			toast.error(i18n.t("flowEditor.errors.fix"));
			return;
		}
		setSaving(true);
		try {
			const payload = { name: name.trim(), definition };
			if (isNew) {
				const { data } = await api.post("/flows", payload);
				history.replace(`/flows/${data.id}`);
			} else {
				await api.put(`/flows/${flowId}`, payload);
			}
			toast.success(i18n.t("flowEditor.saved"));
		} catch (err) {
			toastError(err);
		}
		setSaving(false);
	};

	const nextSelect = (step, value, onChange, required, label) => (
		<TextField
			select
			size="small"
			label={label}
			value={value || NONE}
			onChange={event => onChange(event.target.value || null)}
			error={showErrors && required && !value}
			SelectProps={{ displayEmpty: true }}
			InputLabelProps={{ shrink: true }}
		>
			{!required && <MenuItem value={NONE}>{i18n.t("flowEditor.endFlow")}</MenuItem>}
			{required && (
				<MenuItem value={NONE} disabled>
					{i18n.t("flowEditor.chooseStep")}
				</MenuItem>
			)}
			{definition.steps.map((target, index) =>
				target.id === step.id ? null : (
					<MenuItem key={target.id} value={target.id}>
						{stepLabel(target, index)}
					</MenuItem>
				)
			)}
		</TextField>
	);

	const renderStepFields = step => {
		switch (step.type) {
			case "message":
			case "question":
				return (
					<div className={classes.row}>
						{step.type === "question" && (
							<TextField
								size="small"
								label={i18n.t("flowEditor.field")}
								helperText={i18n.t("flowEditor.fieldHelp")}
								value={step.field}
								inputProps={{ maxLength: 40 }}
								error={showErrors && !step.field.trim()}
								onChange={event => updateStep(step.id, { field: event.target.value })}
							/>
						)}
						{nextSelect(
							step,
							step.next,
							value => updateStep(step.id, { next: value }),
							false,
							i18n.t("flowEditor.next")
						)}
					</div>
				);
			case "menu":
				return (
					<>
						{step.options.map((option, index) => (
							// Options have no id of their own; the position is their identity.
							// eslint-disable-next-line react/no-array-index-key
							<div className={classes.option} key={index}>
								<span className={classes.optionNumber}>{index + 1}</span>
								<TextField
									size="small"
									label={i18n.t("flowEditor.optionLabel")}
									value={option.label}
									inputProps={{ maxLength: 60 }}
									error={showErrors && !option.label.trim()}
									onChange={event => updateOption(step, index, { label: event.target.value })}
								/>
								{nextSelect(
									step,
									option.next,
									value => updateOption(step, index, { next: value || "" }),
									true,
									i18n.t("flowEditor.optionNext")
								)}
								<IconButton
									aria-label={i18n.t("flowEditor.removeOption")}
									disabled={step.options.length === 1}
									onClick={() =>
										updateStep(step.id, {
											options: step.options.filter((_, position) => position !== index),
										})
									}
								>
									<CloseIcon />
								</IconButton>
							</div>
						))}
						<div>
							<Button
								size="small"
								startIcon={<AddIcon />}
								disabled={step.options.length >= MAX_OPTIONS}
								onClick={() =>
									updateStep(step.id, { options: [...step.options, { label: "", next: "" }] })
								}
							>
								{i18n.t("flowEditor.addOption")}
							</Button>
						</div>
						<TextField
							size="small"
							label={i18n.t("flowEditor.invalidText")}
							helperText={i18n.t("flowEditor.invalidTextHelp")}
							value={step.invalidText}
							inputProps={{ maxLength: 500 }}
							onChange={event => updateStep(step.id, { invalidText: event.target.value })}
						/>
					</>
				);
			case "queue":
				return (
					<TextField
						select
						size="small"
						label={i18n.t("flowEditor.queue")}
						value={step.queueId || NONE}
						error={showErrors && !step.queueId}
						helperText={queues.length === 0 ? i18n.t("flowEditor.noQueues") : " "}
						onChange={event => updateStep(step.id, { queueId: Number(event.target.value) })}
					>
						{queues.map(queue => (
							<MenuItem key={queue.id} value={queue.id}>
								{queue.name}
							</MenuItem>
						))}
					</TextField>
				);
			default:
				return null;
		}
	};

	const textLabel = step =>
		["queue", "close"].includes(step.type)
			? i18n.t("flowEditor.textOptional")
			: i18n.t(`flowEditor.textLabel.${step.type}`);

	if (!definition) {
		return (
			<MainContainer>
				<div className={classes.loading}>
					<CircularProgress aria-label={i18n.t("flowEditor.loading")} />
				</div>
			</MainContainer>
		);
	}

	return (
		<MainContainer>
			<MainHeader>
				<Title>{isNew ? i18n.t("flowEditor.newTitle") : i18n.t("flowEditor.editTitle")}</Title>
				<MainHeaderButtonsWrapper>
					<Button variant="outlined" onClick={() => history.push("/flows")}>
						{i18n.t("flowEditor.back")}
					</Button>
					<Button variant="contained" color="primary" onClick={save} disabled={saving}>
						{i18n.t("flowEditor.save")}
					</Button>
				</MainHeaderButtonsWrapper>
			</MainHeader>
			<div className={classes.layout}>
				<div className={classes.editor}>
					<Paper variant="outlined" className={classes.section}>
						<Typography variant="body2" className={classes.help}>
							{i18n.t("flowEditor.help")
								.replace("%NAME%", "{{name}}")
								.replace("%FIRST_NAME%", "{{firstName}}")}
						</Typography>
						<div className={classes.row}>
							<TextField
								size="small"
								label={i18n.t("flowEditor.name")}
								value={name}
								inputProps={{ maxLength: 80 }}
								error={showErrors && !name.trim()}
								helperText={showErrors && !name.trim() ? i18n.t("flowEditor.errors.name") : " "}
								onChange={event => setName(event.target.value)}
							/>
							<TextField
								select
								size="small"
								label={i18n.t("flowEditor.start")}
								value={definition.startId}
								helperText=" "
								onChange={event =>
									setDefinition(current => ({ ...current, startId: event.target.value }))
								}
							>
								{definition.steps.map((step, index) => (
									<MenuItem key={step.id} value={step.id}>
										{stepLabel(step, index)}
									</MenuItem>
								))}
							</TextField>
						</div>
					</Paper>

					{definition.steps.map((step, index) => {
						const problem = showErrors && problems[index];
						return (
							<Paper
								key={step.id}
								variant="outlined"
								className={cx(classes.section, problem && classes.error)}
								component="section"
								aria-label={i18n.t("flowEditor.stepTitle", { number: index + 1 })}
							>
								<div className={classes.stepHeader}>
									<Typography className={classes.stepTitle}>
										{i18n.t("flowEditor.stepTitle", { number: index + 1 })}
									</Typography>
									<span className={classes.stepId}>{step.id}</span>
									{definition.startId === step.id && (
										<Chip size="small" color="primary" label={i18n.t("flowEditor.startTag")} />
									)}
									<span className={classes.spacer} />
									<Tooltip title={i18n.t("flowEditor.moveUp")}>
										<span>
											<IconButton
												aria-label={i18n.t("flowEditor.moveUp")}
												disabled={index === 0}
												onClick={() => moveStep(index, -1)}
											>
												<ArrowUpwardIcon />
											</IconButton>
										</span>
									</Tooltip>
									<Tooltip title={i18n.t("flowEditor.moveDown")}>
										<span>
											<IconButton
												aria-label={i18n.t("flowEditor.moveDown")}
												disabled={index === definition.steps.length - 1}
												onClick={() => moveStep(index, 1)}
											>
												<ArrowDownwardIcon />
											</IconButton>
										</span>
									</Tooltip>
									<Tooltip title={i18n.t("flowEditor.removeStep")}>
										<span>
											<IconButton
												aria-label={i18n.t("flowEditor.removeStep")}
												disabled={definition.steps.length === 1}
												onClick={() => setDefinition(current => removeStep(current, step.id))}
											>
												<DeleteOutlineIcon />
											</IconButton>
										</span>
									</Tooltip>
								</div>
								<TextField
									select
									size="small"
									label={i18n.t("flowEditor.type")}
									value={step.type}
									helperText={i18n.t(`flowEditor.typeHelp.${step.type}`)}
									onChange={event => changeType(step.id, event.target.value)}
								>
									{STEP_TYPES.map(type => (
										<MenuItem key={type} value={type}>
											{i18n.t(`flowEditor.types.${type}`)}
										</MenuItem>
									))}
								</TextField>
								<TextField
									multiline
									minRows={2}
									size="small"
									label={textLabel(step)}
									value={step.text}
									inputProps={{ maxLength: 2000 }}
									error={problem === "flowEditor.errors.text"}
									onChange={event => updateStep(step.id, { text: event.target.value })}
								/>
								{renderStepFields(step)}
								{problem && (
									<Typography variant="body2" className={classes.errorText} role="alert">
										{i18n.t(problem)}
									</Typography>
								)}
							</Paper>
						);
					})}

					<div>
						<Button
							variant="outlined"
							startIcon={<AddIcon />}
							disabled={definition.steps.length >= MAX_STEPS}
							onClick={addStep}
						>
							{i18n.t("flowEditor.addStep")}
						</Button>
					</div>
				</div>
				<div className={classes.simulator}>
					<FlowSimulator definition={definition} queues={queues} disabled={hasProblems} />
				</div>
			</div>
		</MainContainer>
	);
};

export default FlowEditor;
