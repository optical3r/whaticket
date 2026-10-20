import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";

import { makeStyles } from "tss-react/mui";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Typography from "@mui/material/Typography";

import { clearAiStatus } from "../../hooks/useAiStatus";
import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import toastError from "../../errors/toastError";

const useStyles = makeStyles()(theme => ({
	loading: {
		display: "flex",
		alignItems: "center",
		gap: theme.spacing(2),
		padding: theme.spacing(2, 0),
	},
	summary: {
		whiteSpace: "pre-wrap",
	},
	notice: {
		marginTop: theme.spacing(2),
	},
}));

const AiSummaryDialog = ({ open, ticketId, onClose }) => {
	const { classes } = useStyles();
	const [summary, setSummary] = useState("");
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (!open) return undefined;
		let active = true;
		setSummary("");
		setLoading(true);
		api
			.post(`/tickets/${ticketId}/ai/summary`, { language: i18n.language })
			.then(({ data }) => active && setSummary(data.text))
			.catch(err => {
				toastError(err);
				if (active) onClose();
			})
			.finally(() => {
				clearAiStatus();
				if (active) setLoading(false);
			});
		return () => {
			active = false;
		};
	}, [open, ticketId, onClose]);

	const saveAsNote = async () => {
		setSaving(true);
		try {
			await api.post(`/tickets/${ticketId}/notes`, {
				body: `${i18n.t("aiSummary.notePrefix")}\n${summary}`,
			});
			toast.success(i18n.t("aiSummary.saved"));
			onClose();
		} catch (err) {
			toastError(err);
		}
		setSaving(false);
	};

	return (
		<Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
			<DialogTitle>{i18n.t("aiSummary.title")}</DialogTitle>
			<DialogContent dividers>
				{loading ? (
					<div className={classes.loading} role="status">
						<CircularProgress size={24} />
						<Typography variant="body2">{i18n.t("aiSummary.loading")}</Typography>
					</div>
				) : (
					<>
						<Typography variant="body1" className={classes.summary}>
							{summary}
						</Typography>
						<Typography variant="body2" color="textSecondary" className={classes.notice}>
							{i18n.t("aiSummary.notice")}
						</Typography>
					</>
				)}
			</DialogContent>
			<DialogActions>
				<Button variant="outlined" onClick={onClose} disabled={saving}>
					{i18n.t("aiSummary.close")}
				</Button>
				<Button
					variant="contained"
					color="primary"
					onClick={saveAsNote}
					disabled={loading || saving || !summary}
				>
					{i18n.t("aiSummary.saveAsNote")}
				</Button>
			</DialogActions>
		</Dialog>
	);
};

export default AiSummaryDialog;
