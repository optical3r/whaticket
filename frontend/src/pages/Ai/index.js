import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";

import { makeStyles } from "tss-react/mui";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import Paper from "@mui/material/Paper";
import Switch from "@mui/material/Switch";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { DeleteOutline, Edit } from "@mui/icons-material";

import ConfirmationModal from "../../components/ConfirmationModal";
import KnowledgeModal from "../../components/KnowledgeModal";
import { clearAiStatus } from "../../hooks/useAiStatus";
import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import toastError from "../../errors/toastError";

const useStyles = makeStyles()(theme => ({
	root: {
		padding: theme.spacing(8, 8, 3),
		overflowY: "auto",
		...theme.scrollbarStyles,
		[theme.breakpoints.down("md")]: {
			padding: theme.spacing(4, 2, 3),
		},
	},
	paper: {
		padding: theme.spacing(3),
		marginBottom: theme.spacing(2),
	},
	sectionTitle: {
		marginBottom: theme.spacing(1),
	},
	help: {
		marginBottom: theme.spacing(2),
		color: theme.palette.text.secondary,
	},
	usageLabel: {
		display: "flex",
		justifyContent: "space-between",
		margin: theme.spacing(2, 0, 0.5),
	},
	mono: {
		fontFamily: theme.typography.monoFontFamily,
	},
	usageHelp: {
		marginTop: theme.spacing(1),
		color: theme.palette.text.secondary,
	},
	actions: {
		display: "flex",
		justifyContent: "flex-end",
		marginTop: theme.spacing(2),
	},
	knowledgeHeader: {
		display: "flex",
		alignItems: "flex-start",
		justifyContent: "space-between",
		gap: theme.spacing(2),
	},
	empty: {
		padding: theme.spacing(3),
		textAlign: "center",
		color: theme.palette.text.secondary,
	},
}));

const editableFields = ["enabled", "assistantEnabled", "assistantName", "instructions", "handoffMessage", "maxReplies"];

const Ai = () => {
	const { classes } = useStyles();
	const [status, setStatus] = useState(null);
	const [values, setValues] = useState(null);
	const [saving, setSaving] = useState(false);
	const [articles, setArticles] = useState([]);
	const [modalOpen, setModalOpen] = useState(false);
	const [selected, setSelected] = useState(null);
	const [toDelete, setToDelete] = useState(null);

	useEffect(() => {
		void (async () => {
			try {
				const [{ data: settings }, { data: knowledge }] = await Promise.all([
					api.get("/ai/settings"),
					api.get("/ai/knowledge"),
				]);
				setStatus(settings);
				setValues(Object.fromEntries(editableFields.map(key => [key, settings[key]])));
				setArticles(knowledge);
			} catch (err) {
				toastError(err);
			}
		})();
	}, []);

	const change = (key, value) => setValues(prev => ({ ...prev, [key]: value }));

	const save = async e => {
		e.preventDefault();
		setSaving(true);
		try {
			const { data } = await api.put("/ai/settings", {
				...values,
				maxReplies: Number(values.maxReplies),
			});
			setValues(Object.fromEntries(editableFields.map(key => [key, data[key]])));
			clearAiStatus();
			toast.success(i18n.t("ai.assistant.saved"));
		} catch (err) {
			toastError(err);
		}
		setSaving(false);
	};

	const onArticleSaved = article =>
		setArticles(prev =>
			[...prev.filter(item => item.id !== article.id), article].sort((a, b) =>
				a.title.localeCompare(b.title)
			)
		);

	const deleteArticle = async article => {
		try {
			await api.delete(`/ai/knowledge/${article.id}`);
			setArticles(prev => prev.filter(item => item.id !== article.id));
			toast.success(i18n.t("ai.knowledge.deleted"));
		} catch (err) {
			toastError(err);
		}
	};

	if (!status || !values) {
		return <LinearProgress aria-label={i18n.t("ai.loading")} />;
	}

	const toggleCompanyAi = async enabled => {
		change("enabled", enabled);
		try {
			await api.put("/ai/settings", { enabled });
			clearAiStatus();
			toast.success(enabled ? i18n.t("ai.usage.turnedOn") : i18n.t("ai.usage.turnedOff"));
		} catch (err) {
			change("enabled", !enabled);
			toastError(err);
		}
	};

	const { used, limit } = status.usage;
	const planAllows = status.planEnabled && limit > 0;
	const percent = limit > 0 ? Math.min(100, (used / limit) * 100) : 100;

	return (
		<div className={classes.root}>
			<KnowledgeModal
				open={modalOpen}
				article={selected}
				onClose={() => setModalOpen(false)}
				onSaved={onArticleSaved}
			/>
			<ConfirmationModal
				title={toDelete ? i18n.t("ai.knowledge.confirmDelete", { title: toDelete.title }) : ""}
				open={Boolean(toDelete)}
				onClose={() => setToDelete(null)}
				onConfirm={() => deleteArticle(toDelete)}
			>
				{i18n.t("ai.knowledge.confirmDeleteMessage")}
			</ConfirmationModal>

			<Container maxWidth="md">
				<Typography variant="h5" component="h1" gutterBottom>
					{i18n.t("ai.title")}
				</Typography>

				<Paper className={classes.paper} variant="outlined">
					<Typography variant="h6" component="h2" className={classes.sectionTitle}>
						{i18n.t("ai.usage.title")}
					</Typography>
					{!status.configured && (
						<Alert severity="warning">{i18n.t("ai.usage.notConfigured")}</Alert>
					)}
					{status.configured && !planAllows && (
						<Alert severity="info">{i18n.t("ai.usage.notInPlan")}</Alert>
					)}
					{status.configured && planAllows && (
						<>
							<FormControlLabel
								control={
									<Switch
										color="primary"
										checked={values.enabled}
										onChange={e => toggleCompanyAi(e.target.checked)}
									/>
								}
								label={i18n.t("ai.usage.enabled")}
							/>
							<Typography variant="body2" className={classes.help}>
								{i18n.t("ai.usage.enabledHelp")}
							</Typography>
							<div className={classes.usageLabel}>
								<Typography variant="body2">{i18n.t("ai.usage.requests")}</Typography>
								<Typography variant="body2" className={classes.mono}>
									{used} {i18n.t("settings.company.of")} {limit}
								</Typography>
							</div>
							<LinearProgress
								variant="determinate"
								value={percent}
								aria-label={`${i18n.t("ai.usage.requests")}: ${used} ${i18n.t("settings.company.of")} ${limit}`}
							/>
							<Typography variant="body2" className={classes.usageHelp}>
								{i18n.t("ai.usage.help")}{" "}
								<span className={classes.mono}>{status.model}</span>
							</Typography>
						</>
					)}
				</Paper>

				<Paper className={classes.paper} variant="outlined" component="form" onSubmit={save}>
					<Typography variant="h6" component="h2" className={classes.sectionTitle}>
						{i18n.t("ai.assistant.title")}
					</Typography>
					<Typography variant="body2" className={classes.help}>
						{i18n.t("ai.assistant.help")}
					</Typography>
					<FormControlLabel
						control={
							<Switch
								color="primary"
								checked={values.assistantEnabled}
								onChange={e => change("assistantEnabled", e.target.checked)}
								disabled={!planAllows || !values.enabled}
							/>
						}
						label={i18n.t("ai.assistant.enabled")}
					/>
					<TextField
						id="ai-assistant-name"
						label={i18n.t("ai.assistant.name")}
						value={values.assistantName}
						onChange={e => change("assistantName", e.target.value)}
						inputProps={{ maxLength: 60 }}
						variant="outlined"
						margin="dense"
						fullWidth
						required
					/>
					<TextField
						id="ai-instructions"
						label={i18n.t("ai.assistant.instructions")}
						helperText={i18n.t("ai.assistant.instructionsHelp")}
						value={values.instructions}
						onChange={e => change("instructions", e.target.value)}
						inputProps={{ maxLength: 4000 }}
						variant="outlined"
						margin="dense"
						fullWidth
						multiline
						minRows={4}
					/>
					<TextField
						id="ai-handoff-message"
						label={i18n.t("ai.assistant.handoffMessage")}
						helperText={i18n.t("ai.assistant.handoffMessageHelp")}
						value={values.handoffMessage}
						onChange={e => change("handoffMessage", e.target.value)}
						inputProps={{ maxLength: 1000 }}
						variant="outlined"
						margin="dense"
						fullWidth
						multiline
						minRows={2}
						required
					/>
					<TextField
						id="ai-max-replies"
						type="number"
						label={i18n.t("ai.assistant.maxReplies")}
						helperText={i18n.t("ai.assistant.maxRepliesHelp")}
						value={values.maxReplies}
						onChange={e => change("maxReplies", e.target.value)}
						inputProps={{ min: 1, max: 50, step: 1 }}
						variant="outlined"
						margin="dense"
						required
					/>
					<div className={classes.actions}>
						<Button type="submit" variant="contained" color="primary" disabled={saving}>
							{i18n.t("ai.assistant.save")}
						</Button>
					</div>
				</Paper>

				<Paper className={classes.paper} variant="outlined">
					<div className={classes.knowledgeHeader}>
						<div>
							<Typography variant="h6" component="h2" className={classes.sectionTitle}>
								{i18n.t("ai.knowledge.title")}
							</Typography>
							<Typography variant="body2" className={classes.help}>
								{i18n.t("ai.knowledge.help")}
							</Typography>
						</div>
						<Button
							variant="contained"
							color="primary"
							onClick={() => {
								setSelected(null);
								setModalOpen(true);
							}}
						>
							{i18n.t("ai.knowledge.add")}
						</Button>
					</div>
					{articles.length === 0 ? (
						<Typography className={classes.empty}>{i18n.t("ai.knowledge.empty")}</Typography>
					) : (
						<Table size="small">
							<TableHead>
								<TableRow>
									<TableCell>{i18n.t("ai.knowledge.table.title")}</TableCell>
									<TableCell align="right">{i18n.t("ai.knowledge.table.size")}</TableCell>
									<TableCell align="center">{i18n.t("ai.knowledge.table.status")}</TableCell>
									<TableCell align="center">{i18n.t("ai.knowledge.table.actions")}</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{articles.map(article => (
									<TableRow key={article.id}>
										<TableCell>{article.title}</TableCell>
										<TableCell align="right" className={classes.mono}>
											{article.content.length}
										</TableCell>
										<TableCell align="center">
											{article.active
												? i18n.t("ai.knowledge.active")
												: i18n.t("ai.knowledge.inactive")}
										</TableCell>
										<TableCell align="center">
											<IconButton
												size="small"
												aria-label={i18n.t("ai.knowledge.edit")}
												onClick={() => {
													setSelected(article);
													setModalOpen(true);
												}}
											>
												<Edit />
											</IconButton>
											<IconButton
												size="small"
												aria-label={i18n.t("ai.knowledge.delete")}
												onClick={() => setToDelete(article)}
											>
												<DeleteOutline />
											</IconButton>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</Paper>
			</Container>
		</div>
	);
};

export default Ai;
