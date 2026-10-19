import React, { useEffect, useRef, useState } from "react";

import { makeStyles } from "tss-react/mui";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import SendIcon from "@mui/icons-material/Send";

import { i18n } from "../../translate/i18n";
import { answerSimulation, startSimulation } from "./flowLogic";

const useStyles = makeStyles()(theme => ({
	root: {
		display: "flex",
		flexDirection: "column",
		minHeight: 0,
		height: "100%",
	},
	header: {
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		gap: theme.spacing(1),
		padding: theme.spacing(1.5, 2),
		borderBottom: theme.border.divider,
	},
	title: {
		fontWeight: 600,
	},
	chat: {
		flex: 1,
		minHeight: 240,
		overflowY: "auto",
		display: "flex",
		flexDirection: "column",
		gap: theme.spacing(1),
		padding: theme.spacing(2),
		backgroundColor: theme.palette.background.chat,
		...theme.scrollbarStyles,
	},
	bubble: {
		maxWidth: "85%",
		padding: theme.spacing(1, 1.5),
		borderRadius: theme.borderRadius.medium,
		whiteSpace: "pre-wrap",
		wordBreak: "break-word",
		fontSize: 14,
		lineHeight: 1.55,
		color: theme.palette.text.primary,
	},
	company: {
		alignSelf: "flex-end",
		backgroundColor: theme.palette.userMessage.main,
	},
	customer: {
		alignSelf: "flex-start",
		backgroundColor: theme.palette.contactMessage.main,
		border: theme.border.divider,
	},
	note: {
		alignSelf: "center",
		textAlign: "center",
		fontSize: 14,
		color: theme.palette.text.secondary,
		padding: theme.spacing(0.5, 1),
	},
	footer: {
		padding: theme.spacing(1.5, 2),
		borderTop: theme.border.divider,
	},
	hint: {
		color: theme.palette.text.secondary,
		marginBottom: theme.spacing(1),
	},
}));

const t = (key, values) => i18n.t(key, values);

// A chat that plays the flow as the customer would see it. Nothing is
// sent: it runs in the browser, on the definition being edited.
const FlowSimulator = ({ definition, queues, disabled }) => {
	const { classes, cx } = useStyles();
	const [entries, setEntries] = useState([]);
	const [state, setState] = useState(null);
	const [input, setInput] = useState("");
	const chatRef = useRef(null);

	const queueName = id => {
		const queue = queues.find(item => item.id === Number(id));
		return queue ? queue.name : "";
	};

	useEffect(() => {
		if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
	}, [entries]);

	// Editing the flow restarts the conversation.
	useEffect(() => {
		setEntries([]);
		setState(null);
	}, [definition]);

	const start = () => {
		const result = startSimulation(definition, queueName, t);
		setEntries([
			{ kind: "customer", text: t("flowEditor.simulator.firstMessage") },
			...result.messages.map(text => ({ kind: "company", text })),
			...(result.state.ended ? [{ kind: "note", text: result.state.ended }] : []),
		]);
		setState(result.state);
	};

	const send = event => {
		event.preventDefault();
		const body = input.trim();
		if (!body || !state || state.ended) return;
		const result = answerSimulation(definition, state, body, t);
		setEntries(previous => [
			...previous,
			{ kind: "customer", text: body },
			...result.messages.map(text => ({ kind: "company", text })),
			...(result.state.ended ? [{ kind: "note", text: result.state.ended }] : []),
		]);
		setState(result.state);
		setInput("");
	};

	const answers = state ? Object.entries(state.answers) : [];
	const waiting = state && !state.ended;

	return (
		<Paper variant="outlined" className={classes.root}>
			<div className={classes.header}>
				<Typography className={classes.title}>{t("flowEditor.simulator.title")}</Typography>
				<Button size="small" variant="outlined" onClick={start} disabled={disabled}>
					{state ? t("flowEditor.simulator.restart") : t("flowEditor.simulator.start")}
				</Button>
			</div>
			<div className={classes.chat} ref={chatRef} aria-live="polite">
				{entries.length === 0 && (
					<Typography variant="body2" className={classes.note}>
						{disabled ? t("flowEditor.simulator.fixFirst") : t("flowEditor.simulator.empty")}
					</Typography>
				)}
				{entries.map((entry, index) => (
					<div
						// The list only grows until the next restart.
						// eslint-disable-next-line react/no-array-index-key
						key={index}
						className={cx(
							entry.kind === "note" ? classes.note : classes.bubble,
							entry.kind === "company" && classes.company,
							entry.kind === "customer" && classes.customer
						)}
					>
						{entry.text}
					</div>
				))}
				{answers.length > 0 && state.ended && (
					<div className={classes.note}>
						{t("flowEditor.simulator.saved")}{" "}
						{answers.map(([field, value]) => `${field}: ${value}`).join(" · ")}
					</div>
				)}
			</div>
			<form className={classes.footer} onSubmit={send}>
				<Typography variant="body2" className={classes.hint}>
					{t("flowEditor.simulator.hint")}
				</Typography>
				<TextField
					fullWidth
					size="small"
					value={input}
					disabled={!waiting}
					onChange={event => setInput(event.target.value)}
					placeholder={t("flowEditor.simulator.placeholder")}
					inputProps={{ "aria-label": t("flowEditor.simulator.placeholder"), maxLength: 500 }}
					InputProps={{
						endAdornment: (
							<InputAdornment position="end">
								<IconButton
									type="submit"
									size="small"
									disabled={!waiting || !input.trim()}
									aria-label={t("flowEditor.simulator.send")}
								>
									<SendIcon fontSize="small" />
								</IconButton>
							</InputAdornment>
						),
					}}
				/>
			</form>
		</Paper>
	);
};

export default FlowSimulator;
