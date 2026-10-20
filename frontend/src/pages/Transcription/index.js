import React, { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";

import { makeStyles } from "tss-react/mui";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import LinearProgress from "@mui/material/LinearProgress";
import Paper from "@mui/material/Paper";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import ResponsiveTable from "../../components/ResponsiveTable";
import Title from "../../components/Title";
import ConfirmationModal from "../../components/ConfirmationModal";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { i18n } from "../../translate/i18n";

const useStyles = makeStyles()(theme => ({
	root: {
		flex: 1,
		overflowY: "auto",
		...theme.scrollbarStyles,
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
	mono: {
		fontFamily: theme.typography.monoFontFamily,
	},
	keyStatus: {
		marginBottom: theme.spacing(1),
	},
	actions: {
		display: "flex",
		justifyContent: "flex-end",
		flexWrap: "wrap",
		gap: theme.spacing(1),
		marginTop: theme.spacing(2),
	},
	empty: {
		padding: theme.spacing(3),
		textAlign: "center",
		color: theme.palette.text.secondary,
	},
}));

const minutes = seconds => Math.ceil(seconds / 60);

// Platform screen (superadmin): the OpenAI key that pays for voice note
// transcriptions, and what each company used this month.
const Transcription = () => {
	const { classes } = useStyles();
	const [status, setStatus] = useState(null);
	const [keyInput, setKeyInput] = useState("");
	const [saving, setSaving] = useState(false);
	const [confirmRemove, setConfirmRemove] = useState(false);

	const load = useCallback(async () => {
		try {
			const { data } = await api.get("/platform/transcription");
			setStatus(data);
		} catch (err) {
			toastError(err);
		}
	}, []);

	useEffect(() => {
		void load();
	}, [load]);

	const number = value => Number(value || 0).toLocaleString(i18n.language === "en" ? "en-US" : "pt-BR");

	const saveKey = async e => {
		e.preventDefault();
		setSaving(true);
		try {
			await api.put("/platform/transcription/key", { apiKey: keyInput.trim() });
			setKeyInput("");
			toast.success(i18n.t("transcription.key.saved"));
			await load();
		} catch (err) {
			toastError(err);
		}
		setSaving(false);
	};

	const removeKey = async () => {
		try {
			await api.delete("/platform/transcription/key");
			toast.success(i18n.t("transcription.key.removed"));
			await load();
		} catch (err) {
			toastError(err);
		}
	};

	return (
		<MainContainer>
			<ConfirmationModal
				title={i18n.t("transcription.key.confirmRemove")}
				open={confirmRemove}
				onClose={() => setConfirmRemove(false)}
				onConfirm={removeKey}
			>
				{i18n.t("transcription.key.confirmRemoveMessage")}
			</ConfirmationModal>
			<MainHeader>
				<Title>{i18n.t("transcription.title")}</Title>
			</MainHeader>
			<div className={classes.root}>
				{!status ? (
					<LinearProgress aria-label={i18n.t("transcription.loading")} />
				) : (
					<>
						<Paper variant="outlined" className={classes.paper} component="form" onSubmit={saveKey}>
							<Typography variant="h6" component="h2" className={classes.sectionTitle}>
								{i18n.t("transcription.key.title")}
							</Typography>
							<Typography variant="body2" className={classes.help}>
								{i18n.t("transcription.key.help", { model: status.model })}
							</Typography>
							{status.source === "platform" && (
								<Alert severity="success" className={classes.keyStatus}>
									{i18n.t("transcription.key.savedHint")}{" "}
									<span className={classes.mono}>sk-…{status.hint}</span>
								</Alert>
							)}
							{status.source === "env" && (
								<Alert severity="info" className={classes.keyStatus}>
									{i18n.t("transcription.key.envHint")}{" "}
									<span className={classes.mono}>sk-…{status.hint}</span>
								</Alert>
							)}
							{!status.configured && (
								<Alert severity="warning" className={classes.keyStatus}>
									{i18n.t("transcription.key.missing")}
								</Alert>
							)}
							<TextField
								id="openai-api-key"
								type="password"
								autoComplete="off"
								label={
									status.configured
										? i18n.t("transcription.key.replace")
										: i18n.t("transcription.key.label")
								}
								placeholder="sk-..."
								value={keyInput}
								onChange={e => setKeyInput(e.target.value)}
								inputProps={{ maxLength: 400 }}
								variant="outlined"
								margin="dense"
								fullWidth
								required
							/>
							<div className={classes.actions}>
								{status.source === "platform" && (
									<Button variant="outlined" onClick={() => setConfirmRemove(true)}>
										{i18n.t("transcription.key.remove")}
									</Button>
								)}
								<Button type="submit" variant="contained" color="primary" disabled={saving || !keyInput.trim()}>
									{i18n.t("transcription.key.save")}
								</Button>
							</div>
						</Paper>

						<Paper variant="outlined" className={classes.paper}>
							<Typography variant="h6" component="h2" className={classes.sectionTitle}>
								{i18n.t("transcription.usage.title")}
							</Typography>
							<Typography variant="body2" className={classes.help}>
								{i18n.t("transcription.usage.help")}
							</Typography>
							<ResponsiveTable>
								<TableHead>
									<TableRow>
										<TableCell>{i18n.t("transcription.usage.company")}</TableCell>
										<TableCell>{i18n.t("transcription.usage.plan")}</TableCell>
										<TableCell>{i18n.t("transcription.usage.module")}</TableCell>
										<TableCell align="right">{i18n.t("transcription.usage.notes")}</TableCell>
										<TableCell align="right">{i18n.t("transcription.usage.minutes")}</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{status.companies.map(company => (
										<TableRow key={company.id}>
											<TableCell>{company.name}</TableCell>
											<TableCell data-label={i18n.t("transcription.usage.plan")}>
												{company.plan || "—"}
											</TableCell>
											<TableCell data-label={i18n.t("transcription.usage.module")}>
												{company.enabled
													? i18n.t("transcription.usage.on")
													: i18n.t("transcription.usage.off")}
											</TableCell>
											<TableCell
												align="right"
												className={classes.mono}
												data-label={i18n.t("transcription.usage.notes")}
											>
												{number(company.notes)}
											</TableCell>
											<TableCell
												align="right"
												className={classes.mono}
												data-label={i18n.t("transcription.usage.minutes")}
											>
												{!company.enabled && !company.seconds
													? "—"
													: company.limitMinutes > 0
													? i18n.t("transcription.usage.ofLimit", {
															used: number(minutes(company.seconds)),
															limit: number(company.limitMinutes),
													})
													: i18n.t("transcription.usage.noLimit", {
															used: number(minutes(company.seconds)),
													})}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</ResponsiveTable>
							{status.companies.length === 0 && (
								<Typography className={classes.empty}>{i18n.t("transcription.usage.empty")}</Typography>
							)}
						</Paper>
					</>
				)}
			</div>
		</MainContainer>
	);
};

export default Transcription;
