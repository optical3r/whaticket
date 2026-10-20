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
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import Title from "../../components/Title";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { i18n } from "../../translate/i18n";
import FlowCanvas from "./FlowCanvas";
import FlowSimulator from "./FlowSimulator";
import StepEditor, { stepLabel } from "./StepEditor";
import {
	COLUMN_WIDTH,
	MAX_STEPS,
	autoLayout,
	newStep,
	removeStep,
	stepProblem,
	withType,
	withoutPositions,
} from "./flowLogic";

const VIEW_KEY = "flowEditor.view";

const useStyles = makeStyles()(theme => ({
	page: {
		flex: 1,
		minHeight: 0,
		display: "flex",
		flexDirection: "column",
		gap: theme.spacing(2),
		[theme.breakpoints.down("md")]: {
			overflowY: "auto",
		},
	},
	top: {
		padding: theme.spacing(2),
		display: "flex",
		flexDirection: "column",
		gap: theme.spacing(1.5),
	},
	help: {
		color: theme.palette.text.secondary,
	},
	row: {
		display: "flex",
		flexWrap: "wrap",
		alignItems: "flex-start",
		gap: theme.spacing(2),
		"& > .MuiTextField-root": {
			flex: "1 1 220px",
		},
	},
	layout: {
		flex: 1,
		minHeight: 0,
		display: "grid",
		gridTemplateColumns: "minmax(0, 1fr) 380px",
		gap: theme.spacing(2),
		[theme.breakpoints.down("md")]: {
			display: "flex",
			flexDirection: "column",
		},
	},
	board: {
		minHeight: 0,
		[theme.breakpoints.down("md")]: {
			flexShrink: 0,
			height: 480,
		},
	},
	list: {
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
	side: {
		minHeight: 0,
		display: "flex",
		flexDirection: "column",
		[theme.breakpoints.down("md")]: {
			flexShrink: 0,
			height: 560,
		},
	},
	sidePaper: {
		flex: 1,
		minHeight: 0,
		display: "flex",
		flexDirection: "column",
	},
	sideBody: {
		flex: 1,
		minHeight: 0,
		overflowY: "auto",
		padding: theme.spacing(2),
		...theme.scrollbarStyles,
	},
	simulatorBox: {
		flex: 1,
		minHeight: 0,
		display: "flex",
		"& > *": {
			flex: 1,
			border: "none",
		},
	},
	section: {
		padding: theme.spacing(2),
		display: "flex",
		flexDirection: "column",
		gap: theme.spacing(2),
	},
	panelStep: {
		display: "flex",
		flexDirection: "column",
		gap: theme.spacing(2),
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
	empty: {
		color: theme.palette.text.secondary,
	},
	loading: {
		flex: 1,
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
	},
}));

// Steps saved before the board existed have no position: lay them out.
const withPositions = definition => {
	if (definition.steps.every(step => step.position)) return definition;
	const positions = autoLayout(definition);
	return {
		...definition,
		steps: definition.steps.map(step => (step.position ? step : { ...step, position: positions[step.id] })),
	};
};

const emptyDefinition = () => ({
	startId: "s1",
	steps: [
		{
			id: "s1",
			type: "message",
			text: i18n.t("flowEditor.defaultGreeting").replace("%FIRST_NAME%", "{{firstName}}"),
			next: null,
			position: { x: 0, y: 0 },
		},
	],
});

const readView = () => {
	try {
		return localStorage.getItem(VIEW_KEY) === "list" ? "list" : "board";
	} catch {
		return "board";
	}
};

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
	const [view, setView] = useState(readView);
	const [selectedId, setSelectedId] = useState(null);
	const [sideTab, setSideTab] = useState("step");

	useEffect(() => {
		const load = async () => {
			try {
				const { data } = await api.get("/queue");
				setQueues(data);
				if (!isNew) {
					const { data: flow } = await api.get(`/flows/${flowId}`);
					setName(flow.name);
					setDefinition(withPositions(flow.definition));
				}
			} catch (err) {
				toastError(err);
			}
		};
		void load();
	}, [flowId, isNew]);

	const problems = useMemo(() => (definition ? definition.steps.map(stepProblem) : []), [definition]);
	const hasProblems = problems.some(Boolean);

	// Moving steps on the board must not restart the simulator.
	const logicKey = definition ? JSON.stringify(withoutPositions(definition)) : "";
	const simulated = useMemo(() => (logicKey ? JSON.parse(logicKey) : null), [logicKey]);

	const changeView = (event, value) => {
		if (!value) return;
		setView(value);
		try {
			localStorage.setItem(VIEW_KEY, value);
		} catch {
			// The choice only lasts for this visit.
		}
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

	const addStep = position => {
		if (definition.steps.length >= MAX_STEPS) return;
		const last = definition.steps[definition.steps.length - 1];
		const created = newStep(
			definition.steps,
			"message",
			position || (last?.position ? { x: last.position.x + COLUMN_WIDTH, y: last.position.y } : { x: 0, y: 0 })
		);
		setDefinition(current => ({ ...current, steps: [...current.steps, created] }));
		setSelectedId(created.id);
		setSideTab("step");
	};

	const deleteStep = id =>
		setDefinition(current => {
			if (current.steps.length <= 1) return current;
			return removeStep(current, id);
		});

	const moveStep = (index, offset) =>
		setDefinition(current => {
			const steps = [...current.steps];
			const [step] = steps.splice(index, 1);
			steps.splice(index + offset, 0, step);
			return { ...current, steps };
		});

	// Links made on the board: the exit is "next" or "opt-<n>".
	const link = (sourceId, exit, targetId) =>
		setDefinition(current => ({
			...current,
			steps: current.steps.map(step => {
				if (step.id !== sourceId) return step;
				if (exit === "next" && (step.type === "message" || step.type === "question")) {
					return { ...step, next: targetId };
				}
				const match = /^opt-(\d+)$/.exec(exit || "");
				if (match && step.type === "menu") {
					const position = Number(match[1]);
					return {
						...step,
						options: step.options.map((option, index) => (index === position ? { ...option, next: targetId || "" } : option)),
					};
				}
				return step;
			}),
		}));

	const organize = () =>
		setDefinition(current => {
			const positions = autoLayout(current);
			return { ...current, steps: current.steps.map(step => ({ ...step, position: positions[step.id] })) };
		});

	const save = async () => {
		if (!name.trim() || hasProblems) {
			setShowErrors(true);
			toast.error(i18n.t("flowEditor.errors.fix"));
			const firstProblem = definition.steps[problems.findIndex(Boolean)];
			if (firstProblem) {
				setSelectedId(firstProblem.id);
				setSideTab("step");
			}
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

	if (!definition) {
		return (
			<MainContainer>
				<div className={classes.loading}>
					<CircularProgress aria-label={i18n.t("flowEditor.loading")} />
				</div>
			</MainContainer>
		);
	}

	const selectedIndex = definition.steps.findIndex(step => step.id === selectedId);
	const selected = selectedIndex >= 0 ? definition.steps[selectedIndex] : null;

	const editorFor = (step, index, compact) => (
		<StepEditor
			step={step}
			steps={definition.steps}
			queues={queues}
			problem={showErrors ? problems[index] : null}
			showErrors={showErrors}
			compact={compact}
			onChange={changes => updateStep(step.id, changes)}
			onChangeType={type => changeType(step.id, type)}
		/>
	);

	const simulator = <FlowSimulator definition={simulated} queues={queues} disabled={hasProblems} />;

	const selectedPanel = selected ? (
		<div className={classes.panelStep}>
			<div className={classes.stepHeader}>
				<Typography className={classes.stepTitle}>
					{i18n.t("flowEditor.stepTitle", { number: selectedIndex + 1 })}
				</Typography>
				<span className={classes.stepId}>{selected.id}</span>
				{definition.startId === selected.id && (
					<Chip size="small" color="primary" label={i18n.t("flowEditor.startTag")} />
				)}
				<span className={classes.spacer} />
				<Tooltip title={i18n.t("flowEditor.removeStep")}>
					<span>
						<IconButton
							aria-label={i18n.t("flowEditor.removeStep")}
							disabled={definition.steps.length === 1}
							onClick={() => {
								deleteStep(selected.id);
								setSelectedId(null);
							}}
						>
							<DeleteOutlineIcon />
						</IconButton>
					</span>
				</Tooltip>
			</div>
			{definition.startId !== selected.id && (
				<div>
					<Button
						size="small"
						onClick={() => setDefinition(current => ({ ...current, startId: selected.id }))}
					>
						{i18n.t("flowEditor.board.makeStart")}
					</Button>
				</div>
			)}
			{editorFor(selected, selectedIndex, true)}
		</div>
	) : (
		<Typography variant="body2" className={classes.empty}>
			{i18n.t("flowEditor.board.selectHint")}
		</Typography>
	);

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
			<div className={classes.page}>
				<Paper variant="outlined" className={classes.top}>
					<Typography variant="body2" className={classes.help}>
						{i18n
							.t(view === "board" ? "flowEditor.board.help" : "flowEditor.help")
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
							onChange={event => setDefinition(current => ({ ...current, startId: event.target.value }))}
						>
							{definition.steps.map((step, index) => (
								<MenuItem key={step.id} value={step.id}>
									{stepLabel(step, index)}
								</MenuItem>
							))}
						</TextField>
						<ToggleButtonGroup
							exclusive
							size="small"
							color="primary"
							value={view}
							onChange={changeView}
							aria-label={i18n.t("flowEditor.board.view")}
						>
							<ToggleButton value="board">{i18n.t("flowEditor.board.viewBoard")}</ToggleButton>
							<ToggleButton value="list">{i18n.t("flowEditor.board.viewList")}</ToggleButton>
						</ToggleButtonGroup>
					</div>
				</Paper>

				<div className={classes.layout}>
					{view === "board" ? (
						<div className={classes.board}>
							<FlowCanvas
								definition={definition}
								queues={queues}
								problems={problems}
								showErrors={showErrors}
								selectedId={selectedId}
								onSelect={id => {
									setSelectedId(id);
									if (id) setSideTab("step");
								}}
								onMove={(id, position) =>
									updateStep(id, { position: { x: Math.round(position.x), y: Math.round(position.y) } })
								}
								onLink={link}
								onUnlink={(id, exit) => link(id, exit, null)}
								onAdd={addStep}
								onRemove={id => {
									deleteStep(id);
									setSelectedId(null);
								}}
								onOrganize={organize}
							/>
						</div>
					) : (
						<div className={classes.list}>
							{definition.steps.map((step, index) => (
								<Paper
									key={step.id}
									variant="outlined"
									className={cx(classes.section, showErrors && problems[index] && classes.error)}
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
													onClick={() => deleteStep(step.id)}
												>
													<DeleteOutlineIcon />
												</IconButton>
											</span>
										</Tooltip>
									</div>
									{editorFor(step, index, false)}
								</Paper>
							))}
							<div>
								<Button
									variant="outlined"
									startIcon={<AddIcon />}
									disabled={definition.steps.length >= MAX_STEPS}
									onClick={() => addStep()}
								>
									{i18n.t("flowEditor.addStep")}
								</Button>
							</div>
						</div>
					)}

					<div className={classes.side}>
						{view === "board" ? (
							<Paper variant="outlined" className={classes.sidePaper}>
								<Tabs
									value={sideTab}
									onChange={(event, value) => setSideTab(value)}
									variant="fullWidth"
									aria-label={i18n.t("flowEditor.board.panel")}
								>
									<Tab value="step" label={i18n.t("flowEditor.board.stepTab")} />
									<Tab value="simulator" label={i18n.t("flowEditor.simulator.title")} />
								</Tabs>
								{sideTab === "step" ? (
									<div className={classes.sideBody}>{selectedPanel}</div>
								) : (
									<div className={classes.simulatorBox}>{simulator}</div>
								)}
							</Paper>
						) : (
							simulator
						)}
					</div>
				</div>
			</div>
		</MainContainer>
	);
};

export default FlowEditor;
