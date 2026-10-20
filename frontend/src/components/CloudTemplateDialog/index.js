import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";

import { makeStyles } from "tss-react/mui";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import LinearProgress from "@mui/material/LinearProgress";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import toastError from "../../errors/toastError";

const useStyles = makeStyles()(theme => ({
	previewLabel: {
		marginTop: theme.spacing(1),
	},
	preview: {
		marginTop: theme.spacing(1),
		padding: theme.spacing(1.5, 2),
		borderRadius: theme.borderRadius.table,
		backgroundColor: theme.palette.tintedBackground,
		border: theme.border.divider,
		whiteSpace: "pre-wrap",
	},
}));

// Approved templates are the only messages the official API accepts after
// 24 hours without a message from the customer.
const CloudTemplateDialog = ({ open, onClose, ticket }) => {
	const { classes } = useStyles();
	const [templates, setTemplates] = useState([]);
	const [loading, setLoading] = useState(false);
	const [selected, setSelected] = useState("");
	const [params, setParams] = useState([]);
	const [sending, setSending] = useState(false);

	useEffect(() => {
		if (!open || !ticket?.whatsappId) return undefined;
		let active = true;
		setLoading(true);
		setSelected("");
		api
			.get(`/whatsapp/${ticket.whatsappId}/templates`)
			.then(({ data }) => active && setTemplates(data))
			.catch(err => {
				toastError(err);
				if (active) setTemplates([]);
			})
			.finally(() => active && setLoading(false));
		return () => {
			active = false;
		};
	}, [open, ticket]);

	const template = useMemo(
		() => templates.find(item => `${item.name}|${item.language}` === selected),
		[templates, selected]
	);

	useEffect(() => {
		setParams(template ? Array(template.params).fill("") : []);
	}, [template]);

	const preview = template
		? params.reduce(
				(text, value, index) => text.split(`{{${index + 1}}}`).join(value || `{{${index + 1}}}`),
				template.body
		)
		: "";

	const send = async e => {
		e.preventDefault();
		setSending(true);
		try {
			await api.post(`/messages/${ticket.id}/template`, {
				name: template.name,
				language: template.language,
				params,
			});
			toast.success(i18n.t("cloudTemplate.sent"));
			onClose();
		} catch (err) {
			toastError(err);
		}
		setSending(false);
	};

	return (
		<Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
			<form onSubmit={send}>
				<DialogTitle>{i18n.t("cloudTemplate.title")}</DialogTitle>
				<DialogContent dividers>
					{loading && <LinearProgress aria-label={i18n.t("cloudTemplate.loading")} />}
					{!loading && templates.length === 0 && (
						<Alert severity="info">{i18n.t("cloudTemplate.empty")}</Alert>
					)}
					{templates.length > 0 && (
						<TextField
							id="cloud-template"
							select
							label={i18n.t("cloudTemplate.template")}
							value={selected}
							onChange={e => setSelected(e.target.value)}
							variant="outlined"
							margin="dense"
							fullWidth
							required
						>
							{templates.map(item => (
								<MenuItem key={`${item.name}|${item.language}`} value={`${item.name}|${item.language}`}>
									{item.name} ({item.language})
								</MenuItem>
							))}
						</TextField>
					)}
					{params.map((value, index) => (
						<TextField
							// The order of the values is the order of {{1}}, {{2}}...
							// eslint-disable-next-line react/no-array-index-key
							key={index}
							id={`cloud-template-param-${index + 1}`}
							label={i18n.t("cloudTemplate.param", { number: index + 1 })}
							value={value}
							onChange={e =>
								setParams(prev => prev.map((item, position) => (position === index ? e.target.value : item)))
							}
							inputProps={{ maxLength: 1000 }}
							variant="outlined"
							margin="dense"
							fullWidth
							required
						/>
					))}
					{template && (
						<>
							<Typography variant="body2" color="textSecondary" className={classes.previewLabel}>
								{i18n.t("cloudTemplate.preview")}
							</Typography>
							<Typography variant="body2" className={classes.preview}>
								{preview}
							</Typography>
						</>
					)}
				</DialogContent>
				<DialogActions>
					<Button variant="outlined" onClick={onClose} disabled={sending}>
						{i18n.t("cloudTemplate.cancel")}
					</Button>
					<Button type="submit" variant="contained" color="primary" disabled={sending || !template}>
						{i18n.t("cloudTemplate.send")}
					</Button>
				</DialogActions>
			</form>
		</Dialog>
	);
};

export default CloudTemplateDialog;
