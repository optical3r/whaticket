import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";

import Button from "@material-ui/core/Button";
import Checkbox from "@material-ui/core/Checkbox";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import FormGroup from "@material-ui/core/FormGroup";
import FormLabel from "@material-ui/core/FormLabel";
import FormControl from "@material-ui/core/FormControl";
import Switch from "@material-ui/core/Switch";
import TextField from "@material-ui/core/TextField";

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import toastError from "../../errors/toastError";

const emptyWebhook = { name: "", url: "", events: [], active: true };

const WebhookModal = ({ open, onClose, webhook, events, onSaved }) => {
	const [values, setValues] = useState(emptyWebhook);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (open) {
			setValues(
				webhook
					? { name: webhook.name, url: webhook.url, events: webhook.events, active: webhook.active }
					: emptyWebhook
			);
		}
	}, [open, webhook]);

	const toggleEvent = event =>
		setValues(prev => ({
			...prev,
			events: prev.events.includes(event)
				? prev.events.filter(item => item !== event)
				: [...prev.events, event],
		}));

	const handleSubmit = async e => {
		e.preventDefault();
		setSaving(true);
		try {
			const { data } = webhook
				? await api.put(`/webhooks/${webhook.id}`, values)
				: await api.post("/webhooks", values);
			toast.success(i18n.t("webhooks.toasts.saved"));
			onSaved(data);
			onClose();
		} catch (err) {
			toastError(err);
		}
		setSaving(false);
	};

	return (
		<Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth scroll="paper">
			<form onSubmit={handleSubmit}>
				<DialogTitle>
					{webhook ? i18n.t("webhookModal.title.edit") : i18n.t("webhookModal.title.add")}
				</DialogTitle>
				<DialogContent dividers>
					<TextField
						id="webhook-name"
						label={i18n.t("webhookModal.form.name")}
						value={values.name}
						onChange={e => setValues(prev => ({ ...prev, name: e.target.value }))}
						inputProps={{ maxLength: 80 }}
						variant="outlined"
						margin="dense"
						fullWidth
						required
						autoFocus
					/>
					<TextField
						id="webhook-url"
						type="url"
						label={i18n.t("webhookModal.form.url")}
						value={values.url}
						onChange={e => setValues(prev => ({ ...prev, url: e.target.value }))}
						inputProps={{ maxLength: 2048 }}
						variant="outlined"
						margin="dense"
						fullWidth
						required
					/>
					<FormControl component="fieldset" margin="normal">
						<FormLabel component="legend">{i18n.t("webhookModal.form.events")}</FormLabel>
						<FormGroup>
							{events.map(event => (
								<FormControlLabel
									key={event}
									control={
										<Checkbox
											color="primary"
											checked={values.events.includes(event)}
											onChange={() => toggleEvent(event)}
										/>
									}
									label={`${i18n.t(`webhooks.events.${event.replace(".", "_")}`)} (${event})`}
								/>
							))}
						</FormGroup>
					</FormControl>
					<div>
						<FormControlLabel
							control={
								<Switch
									color="primary"
									checked={values.active}
									onChange={e => setValues(prev => ({ ...prev, active: e.target.checked }))}
								/>
							}
							label={i18n.t("webhookModal.form.active")}
						/>
					</div>
					{webhook && (
						<TextField
							id="webhook-secret"
							label={i18n.t("webhookModal.form.secret")}
							value={webhook.secret}
							InputProps={{ readOnly: true, style: { fontFamily: '"IBM Plex Mono", monospace' } }}
							variant="outlined"
							margin="dense"
							fullWidth
						/>
					)}
				</DialogContent>
				<DialogActions>
					<Button variant="outlined" onClick={onClose} disabled={saving}>
						{i18n.t("webhookModal.buttons.cancel")}
					</Button>
					<Button
						type="submit"
						variant="contained"
						color="primary"
						disabled={saving || values.events.length === 0}
					>
						{i18n.t("webhookModal.buttons.save")}
					</Button>
				</DialogActions>
			</form>
		</Dialog>
	);
};

export default WebhookModal;
