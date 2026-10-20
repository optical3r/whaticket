import React, { useContext, useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { toast } from "react-toastify";

import { makeStyles } from "tss-react/mui";
import { useTheme } from "@mui/material/styles";
import Autocomplete from "@mui/material/Autocomplete";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

import { WhatsAppsContext } from "../../context/WhatsApp/WhatsAppsContext";
import useTags from "../../hooks/useTags";
import { tagChipStyle } from "../TagChips";
import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import toastError from "../../errors/toastError";

const useStyles = makeStyles()(theme => ({
	row: {
		display: "grid",
		gridTemplateColumns: "1fr 1fr",
		gap: theme.spacing(1, 2),
		[theme.breakpoints.down("sm")]: {
			gridTemplateColumns: "1fr",
		},
	},
	preview: {
		marginTop: theme.spacing(1),
		padding: theme.spacing(1.5, 2),
		borderRadius: theme.borderRadius.table,
		backgroundColor: theme.palette.tintedBackground,
		border: theme.border.divider,
		whiteSpace: "pre-wrap",
	},
	audience: {
		marginTop: theme.spacing(0.5),
		color: theme.palette.text.secondary,
	},
	mono: {
		fontFamily: theme.typography.monoFontFamily,
	},
}));

const emptyCampaign = {
	name: "",
	message: "",
	whatsappId: "",
	tagIds: [],
	scheduledAt: "",
	minDelaySeconds: 20,
	maxDelaySeconds: 60,
	windowStart: "08:00",
	windowEnd: "20:00",
	includeOptOut: true,
};

const SAMPLE_NAME = "Maria Souza";
const OPT_OUT_LINE = "Para não receber mais mensagens como esta, responda SAIR.";

const renderPreview = (message, includeOptOut) => {
	const filled = message
		.replace(/\{\{\s*firstName\s*\}\}/g, SAMPLE_NAME.split(" ")[0])
		.replace(/\{\{\s*name\s*\}\}/g, SAMPLE_NAME);
	return includeOptOut ? `${filled}\n\n${OPT_OUT_LINE}` : filled;
};

const CampaignModal = ({ open, onClose, campaign }) => {
	const { classes } = useStyles();
	const theme = useTheme();
	const { whatsApps } = useContext(WhatsAppsContext);
	const { tags } = useTags();
	const [values, setValues] = useState(emptyCampaign);
	const [audience, setAudience] = useState(null);
	const [saving, setSaving] = useState(false);

	// Campaigns send through QR Code connections for now.
	const connections = useMemo(
		() => whatsApps.filter(whatsApp => (whatsApp.channel || "qrcode") === "qrcode"),
		[whatsApps]
	);

	useEffect(() => {
		if (!open) return;
		setValues(
			campaign
				? {
						...emptyCampaign,
						...campaign,
						whatsappId: campaign.whatsappId || "",
						scheduledAt: campaign.scheduledAt
							? format(parseISO(campaign.scheduledAt), "yyyy-MM-dd'T'HH:mm")
							: "",
				}
				: { ...emptyCampaign, whatsappId: connections[0]?.id || "" }
		);
	}, [open, campaign, connections]);

	useEffect(() => {
		if (!open) return undefined;
		let active = true;
		const timer = setTimeout(() => {
			api
				.get("/campaigns/audience", { params: { tagIds: values.tagIds.join(",") } })
				.then(({ data }) => active && setAudience(data.count))
				.catch(() => active && setAudience(null));
		}, 300);
		return () => {
			active = false;
			clearTimeout(timer);
		};
	}, [open, values.tagIds]);

	const change = (key, value) => setValues(prev => ({ ...prev, [key]: value }));

	const handleSubmit = async e => {
		e.preventDefault();
		setSaving(true);
		const payload = {
			name: values.name,
			message: values.message,
			whatsappId: Number(values.whatsappId),
			tagIds: values.tagIds,
			scheduledAt: values.scheduledAt ? new Date(values.scheduledAt).toISOString() : null,
			minDelaySeconds: Number(values.minDelaySeconds),
			maxDelaySeconds: Number(values.maxDelaySeconds),
			windowStart: values.windowStart,
			windowEnd: values.windowEnd,
			includeOptOut: values.includeOptOut,
		};
		try {
			if (campaign) {
				await api.put(`/campaigns/${campaign.id}`, payload);
			} else {
				await api.post("/campaigns", payload);
			}
			toast.success(i18n.t("campaigns.toasts.saved"));
			onClose();
		} catch (err) {
			toastError(err);
		}
		setSaving(false);
	};

	return (
		<Dialog open={open} onClose={onClose} maxWidth="md" fullWidth scroll="paper">
			<form onSubmit={handleSubmit}>
				<DialogTitle>
					{campaign ? i18n.t("campaignModal.edit") : i18n.t("campaignModal.add")}
				</DialogTitle>
				<DialogContent dividers>
					<div className={classes.row}>
						<TextField
							id="campaign-name"
							label={i18n.t("campaignModal.name")}
							value={values.name}
							onChange={e => change("name", e.target.value)}
							inputProps={{ maxLength: 80 }}
							variant="outlined"
							margin="dense"
							required
							autoFocus
						/>
						<TextField
							id="campaign-connection"
							select
							label={i18n.t("campaignModal.connection")}
							value={values.whatsappId}
							onChange={e => change("whatsappId", e.target.value)}
							variant="outlined"
							margin="dense"
							required
						>
							{connections.map(whatsApp => (
								<MenuItem key={whatsApp.id} value={whatsApp.id}>
									{whatsApp.name}
								</MenuItem>
							))}
						</TextField>
					</div>

					<Autocomplete
						id="campaign-tags"
						multiple
						size="small"
						options={tags}
						value={tags.filter(tag => values.tagIds.includes(tag.id))}
						getOptionLabel={option => option.name}
						isOptionEqualToValue={(option, selected) => option.id === selected.id}
						onChange={(event, selected) => change("tagIds", selected.map(tag => tag.id))}
						renderTags={(selected, getTagProps) =>
							selected.map((tag, index) => (
								<Chip
									key={tag.id}
									size="small"
									label={tag.name}
									style={tagChipStyle(theme, tag.color)}
									{...getTagProps({ index })}
								/>
							))
						}
						renderInput={params => (
							<TextField
								{...params}
								variant="outlined"
								margin="dense"
								label={i18n.t("campaignModal.audience")}
								placeholder={i18n.t("campaignModal.audienceAll")}
							/>
						)}
					/>
					<Typography variant="body2" className={classes.audience} role="status">
						{audience === null
							? i18n.t("campaignModal.audienceUnknown")
							: i18n.t("campaignModal.audienceCount", { count: audience })}
					</Typography>

					<TextField
						id="campaign-message"
						label={i18n.t("campaignModal.message")}
						// The variables have i18next's own syntax, so they go in after
						// the translation.
						helperText={i18n
							.t("campaignModal.messageHelp")
							.replace("%NAME%", "{{name}}")
							.replace("%FIRST_NAME%", "{{firstName}}")}
						value={values.message}
						onChange={e => change("message", e.target.value)}
						inputProps={{ maxLength: 4000 }}
						variant="outlined"
						margin="dense"
						fullWidth
						required
						multiline
						minRows={4}
					/>
					<FormControlLabel
						control={
							<Switch
								color="primary"
								checked={values.includeOptOut}
								onChange={e => change("includeOptOut", e.target.checked)}
							/>
						}
						label={i18n.t("campaignModal.includeOptOut")}
					/>
					{values.message.trim() && (
						<>
							<Typography variant="body2" color="textSecondary">
								{i18n.t("campaignModal.preview", { name: SAMPLE_NAME })}
							</Typography>
							<Typography variant="body2" className={classes.preview}>
								{renderPreview(values.message, values.includeOptOut)}
							</Typography>
						</>
					)}

					<div className={classes.row}>
						<TextField
							id="campaign-scheduled"
							type="datetime-local"
							label={i18n.t("campaignModal.scheduledAt")}
							helperText={i18n.t("campaignModal.scheduledAtHelp")}
							value={values.scheduledAt}
							onChange={e => change("scheduledAt", e.target.value)}
							InputLabelProps={{ shrink: true }}
							variant="outlined"
							margin="dense"
						/>
						<div />
						<TextField
							id="campaign-window-start"
							type="time"
							label={i18n.t("campaignModal.windowStart")}
							value={values.windowStart}
							onChange={e => change("windowStart", e.target.value)}
							InputLabelProps={{ shrink: true }}
							variant="outlined"
							margin="dense"
							required
						/>
						<TextField
							id="campaign-window-end"
							type="time"
							label={i18n.t("campaignModal.windowEnd")}
							helperText={i18n.t("campaignModal.windowHelp")}
							value={values.windowEnd}
							onChange={e => change("windowEnd", e.target.value)}
							InputLabelProps={{ shrink: true }}
							variant="outlined"
							margin="dense"
							required
						/>
						<TextField
							id="campaign-min-delay"
							type="number"
							label={i18n.t("campaignModal.minDelay")}
							value={values.minDelaySeconds}
							onChange={e => change("minDelaySeconds", e.target.value)}
							inputProps={{ min: 5, max: 600, step: 1 }}
							variant="outlined"
							margin="dense"
							required
						/>
						<TextField
							id="campaign-max-delay"
							type="number"
							label={i18n.t("campaignModal.maxDelay")}
							helperText={i18n.t("campaignModal.delayHelp")}
							value={values.maxDelaySeconds}
							onChange={e => change("maxDelaySeconds", e.target.value)}
							inputProps={{ min: 5, max: 600, step: 1 }}
							variant="outlined"
							margin="dense"
							required
						/>
					</div>
				</DialogContent>
				<DialogActions>
					<Button variant="outlined" onClick={onClose} disabled={saving}>
						{i18n.t("campaignModal.cancel")}
					</Button>
					<Button type="submit" variant="contained" color="primary" disabled={saving}>
						{i18n.t("campaignModal.save")}
					</Button>
				</DialogActions>
			</form>
		</Dialog>
	);
};

export default CampaignModal;
