import React from "react";

import { makeStyles } from "tss-react/mui";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";

import { i18n } from "../../translate/i18n";
import { MAX_OPTIONS, STEP_TYPES } from "./flowLogic";

const useStyles = makeStyles()(theme => ({
	root: {
		display: "flex",
		flexDirection: "column",
		gap: theme.spacing(2),
	},
	row: {
		display: "flex",
		flexWrap: "wrap",
		gap: theme.spacing(2),
		"& > *": {
			flex: "1 1 220px",
		},
	},
	option: {
		display: "flex",
		alignItems: "flex-start",
		gap: theme.spacing(1),
		"& > .MuiTextField-root": {
			flex: 1,
			minWidth: 0,
		},
	},
	optionFields: {
		flex: 1,
		minWidth: 0,
		display: "flex",
		flexWrap: "wrap",
		gap: theme.spacing(1),
		"& > *": {
			flex: "1 1 180px",
			minWidth: 0,
		},
	},
	optionFieldsColumn: {
		flex: 1,
		minWidth: 0,
		display: "flex",
		flexDirection: "column",
		gap: theme.spacing(1),
	},
	optionNumber: {
		fontFamily: theme.typography.monoFontFamily,
		color: theme.palette.text.secondary,
		minWidth: 24,
		paddingTop: theme.spacing(1.25),
	},
	errorText: {
		color: theme.palette.error.main,
	},
}));

const NONE = "";

export const stepLabel = (step, index) => {
	const type = i18n.t(`flowEditor.types.${step.type}`);
	const snippet = step.text.trim().slice(0, 40);
	return `${index + 1}. ${type}${snippet ? `: ${snippet}` : ""}`;
};

// The fields of one step: type, text and what the type needs (next step,
// options, answer field or queue). Used by the list and by the board panel.
const StepEditor = ({
	step,
	steps,
	queues,
	problem,
	showErrors,
	compact,
	onChange,
	onChangeType,
}) => {
	const { classes } = useStyles();

	const updateOption = (index, changes) =>
		onChange({
			options: step.options.map((option, position) =>
				position === index ? { ...option, ...changes } : option
			),
		});

	const nextSelect = (value, change, required, label) => (
		<TextField
			select
			size="small"
			label={label}
			value={value || NONE}
			onChange={event => change(event.target.value || null)}
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
			{steps.map((target, index) =>
				target.id === step.id ? null : (
					<MenuItem key={target.id} value={target.id}>
						{stepLabel(target, index)}
					</MenuItem>
				)
			)}
		</TextField>
	);

	const textLabel = ["queue", "close"].includes(step.type)
		? i18n.t("flowEditor.textOptional")
		: i18n.t(`flowEditor.textLabel.${step.type}`);

	let fields = null;
	if (step.type === "message" || step.type === "question") {
		fields = (
			<div className={classes.row}>
				{step.type === "question" && (
					<TextField
						size="small"
						label={i18n.t("flowEditor.field")}
						helperText={i18n.t("flowEditor.fieldHelp")}
						value={step.field}
						inputProps={{ maxLength: 40 }}
						error={showErrors && !step.field.trim()}
						onChange={event => onChange({ field: event.target.value })}
					/>
				)}
				{nextSelect(step.next, value => onChange({ next: value }), false, i18n.t("flowEditor.next"))}
			</div>
		);
	} else if (step.type === "menu") {
		fields = (
			<>
				{step.options.map((option, index) => (
					// Options have no id of their own; the position is their identity.
					// eslint-disable-next-line react/no-array-index-key
					<div className={classes.option} key={index}>
						<span className={classes.optionNumber}>{index + 1}</span>
						<div className={compact ? classes.optionFieldsColumn : classes.optionFields}>
							<TextField
								size="small"
								label={i18n.t("flowEditor.optionLabel")}
								value={option.label}
								inputProps={{ maxLength: 60 }}
								error={showErrors && !option.label.trim()}
								onChange={event => updateOption(index, { label: event.target.value })}
							/>
							{nextSelect(
								option.next,
								value => updateOption(index, { next: value || "" }),
								true,
								i18n.t("flowEditor.optionNext")
							)}
						</div>
						<IconButton
							aria-label={i18n.t("flowEditor.removeOption")}
							disabled={step.options.length === 1}
							onClick={() =>
								onChange({ options: step.options.filter((_, position) => position !== index) })
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
						onClick={() => onChange({ options: [...step.options, { label: "", next: "" }] })}
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
					onChange={event => onChange({ invalidText: event.target.value })}
				/>
			</>
		);
	} else if (step.type === "queue") {
		fields = (
			<TextField
				select
				size="small"
				label={i18n.t("flowEditor.queue")}
				value={step.queueId || NONE}
				error={showErrors && !step.queueId}
				helperText={queues.length === 0 ? i18n.t("flowEditor.noQueues") : " "}
				onChange={event => onChange({ queueId: Number(event.target.value) })}
			>
				{queues.map(queue => (
					<MenuItem key={queue.id} value={queue.id}>
						{queue.name}
					</MenuItem>
				))}
			</TextField>
		);
	}

	return (
		<div className={classes.root}>
			<TextField
				select
				size="small"
				label={i18n.t("flowEditor.type")}
				value={step.type}
				helperText={i18n.t(`flowEditor.typeHelp.${step.type}`)}
				onChange={event => onChangeType(event.target.value)}
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
				label={textLabel}
				value={step.text}
				inputProps={{ maxLength: 2000 }}
				error={problem === "flowEditor.errors.text"}
				onChange={event => onChange({ text: event.target.value })}
			/>
			{fields}
			{problem && (
				<Typography variant="body2" className={classes.errorText} role="alert">
					{i18n.t(problem)}
				</Typography>
			)}
		</div>
	);
};

export default StepEditor;
