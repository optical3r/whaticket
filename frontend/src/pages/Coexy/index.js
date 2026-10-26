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
		wordBreak: "break-all",
	},
	status: {
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

// Platform screen (superadmin): the Coexy key, the webhook every channel
// posts to, and the channels the platform pays for.
const Coexy = () => {
	const { classes } = useStyles();
	const [status, setStatus] = useState(null);
	const [keyInput, setKeyInput] = useState("");
	const [saving, setSaving] = useState(false);
	const [confirm, setConfirm] = useState(null);

	const load = useCallback(async () => {
		try {
			const { data } = await api.get("/platform/coexy");
			setStatus(data);
		} catch (err) {
			toastError(err);
		}
	}, []);

	useEffect(() => {
		void load();
	}, [load]);

	const saveKey = async e => {
		e.preventDefault();
		setSaving(true);
		try {
			await api.put("/platform/coexy/key", { apiKey: keyInput.trim() });
			setKeyInput("");
			toast.success(i18n.t("coexy.key.saved"));
			await load();
		} catch (err) {
			toastError(err);
		}
		setSaving(false);
	};

	const removeKey = async () => {
		try {
			await api.delete("/platform/coexy/key");
			toast.success(i18n.t("coexy.key.removed"));
			await load();
		} catch (err) {
			toastError(err);
		}
	};

	const setupWebhook = async () => {
		setSaving(true);
		try {
			await api.post("/platform/coexy/webhook");
			toast.success(i18n.t("coexy.webhook.saved"));
			await load();
		} catch (err) {
			toastError(err);
		}
		setSaving(false);
	};

	const date = value =>
		new Date(value).toLocaleDateString(i18n.language === "en" ? "en-US" : "pt-BR");

	const webhookOutdated =
		status?.webhook.configured && status.webhook.url && status.webhook.url !== status.webhook.expectedUrl;

	return (
		<MainContainer>
			<ConfirmationModal
				title={confirm === "key" ? i18n.t("coexy.key.confirmRemove") : i18n.t("coexy.webhook.confirmReplace")}
				open={Boolean(confirm)}
				onClose={() => setConfirm(null)}
				onConfirm={confirm === "key" ? removeKey : setupWebhook}
			>
				{confirm === "key"
					? i18n.t("coexy.key.confirmRemoveMessage")
					: i18n.t("coexy.webhook.confirmReplaceMessage")}
			</ConfirmationModal>
			<MainHeader>
				<Title>{i18n.t("coexy.title")}</Title>
			</MainHeader>
			<div className={classes.root}>
				{!status ? (
					<LinearProgress aria-label={i18n.t("coexy.loading")} />
				) : (
					<>
						<Paper variant="outlined" className={classes.paper} component="form" onSubmit={saveKey}>
							<Typography variant="h6" component="h2" className={classes.sectionTitle}>
								{i18n.t("coexy.key.title")}
							</Typography>
							<Typography variant="body2" className={classes.help}>
								{i18n.t("coexy.key.help")}
							</Typography>
							{status.source === "platform" && (
								<Alert severity="success" className={classes.status}>
									{i18n.t("coexy.key.savedHint")} <span className={classes.mono}>…{status.hint}</span>
								</Alert>
							)}
							{status.source === "env" && (
								<Alert severity="info" className={classes.status}>
									{i18n.t("coexy.key.envHint")} <span className={classes.mono}>…{status.hint}</span>
								</Alert>
							)}
							{!status.configured && (
								<Alert severity="warning" className={classes.status}>
									{i18n.t("coexy.key.missing")}
								</Alert>
							)}
							<TextField
								id="coexy-api-key"
								type="password"
								autoComplete="off"
								label={status.configured ? i18n.t("coexy.key.replace") : i18n.t("coexy.key.label")}
								placeholder="crt_pk_..."
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
									<Button variant="outlined" onClick={() => setConfirm("key")}>
										{i18n.t("coexy.key.remove")}
									</Button>
								)}
								<Button type="submit" variant="contained" color="primary" disabled={saving || !keyInput.trim()}>
									{i18n.t("coexy.key.save")}
								</Button>
							</div>
						</Paper>

						<Paper variant="outlined" className={classes.paper}>
							<Typography variant="h6" component="h2" className={classes.sectionTitle}>
								{i18n.t("coexy.webhook.title")}
							</Typography>
							<Typography variant="body2" className={classes.help}>
								{i18n.t("coexy.webhook.help")}
							</Typography>
							{status.webhook.configured ? (
								<Alert severity={webhookOutdated ? "warning" : "success"} className={classes.status}>
									{webhookOutdated ? i18n.t("coexy.webhook.outdated") : i18n.t("coexy.webhook.active")}{" "}
									<span className={classes.mono}>{status.webhook.url || status.webhook.expectedUrl}</span>
								</Alert>
							) : (
								<Alert severity="warning" className={classes.status}>
									{i18n.t("coexy.webhook.missing")}{" "}
									<span className={classes.mono}>{status.webhook.expectedUrl}</span>
								</Alert>
							)}
							<div className={classes.actions}>
								<Button
									variant={status.webhook.configured ? "outlined" : "contained"}
									color="primary"
									disabled={saving || !status.configured}
									onClick={() => (status.webhook.configured ? setConfirm("webhook") : setupWebhook())}
								>
									{status.webhook.configured ? i18n.t("coexy.webhook.replace") : i18n.t("coexy.webhook.create")}
								</Button>
							</div>
						</Paper>

						<Paper variant="outlined" className={classes.paper}>
							<Typography variant="h6" component="h2" className={classes.sectionTitle}>
								{i18n.t("coexy.channels.title")}
							</Typography>
							<Typography variant="body2" className={classes.help}>
								{i18n.t("coexy.channels.help", { count: status.channels.length })}
							</Typography>
							<ResponsiveTable>
								<TableHead>
									<TableRow>
										<TableCell>{i18n.t("coexy.channels.company")}</TableCell>
										<TableCell>{i18n.t("coexy.channels.connection")}</TableCell>
										<TableCell>{i18n.t("coexy.channels.number")}</TableCell>
										<TableCell>{i18n.t("coexy.channels.status")}</TableCell>
										<TableCell>{i18n.t("coexy.channels.verification")}</TableCell>
										<TableCell>{i18n.t("coexy.channels.since")}</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{status.channels.map(channel => (
										<TableRow key={channel.whatsappId}>
											<TableCell>
												{channel.company || "—"}
												{channel.plan && (
													<Typography variant="body2" color="textSecondary" component="span" display="block">
														{channel.plan}
													</Typography>
												)}
											</TableCell>
											<TableCell data-label={i18n.t("coexy.channels.connection")}>{channel.name || "—"}</TableCell>
											<TableCell data-label={i18n.t("coexy.channels.number")} className={classes.mono}>
												{channel.number || "—"}
											</TableCell>
											<TableCell data-label={i18n.t("coexy.channels.status")}>
												{i18n.t(`coexy.status.${channel.status || "pending"}`)}
											</TableCell>
											<TableCell data-label={i18n.t("coexy.channels.verification")}>
												{i18n.t(`coexy.verification.${channel.verification || "not_verified"}`)}
											</TableCell>
											<TableCell data-label={i18n.t("coexy.channels.since")}>{date(channel.createdAt)}</TableCell>
										</TableRow>
									))}
								</TableBody>
							</ResponsiveTable>
							{status.channels.length === 0 && (
								<Typography className={classes.empty}>{i18n.t("coexy.channels.empty")}</Typography>
							)}
						</Paper>
					</>
				)}
			</div>
		</MainContainer>
	);
};

export default Coexy;
