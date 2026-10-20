import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";

import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import TextField from "@mui/material/TextField";

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import toastError from "../../errors/toastError";

// Default color: Electric Azure from the design system.
const emptyTag = { name: "", color: "#3478F6" };

const TagModal = ({ open, onClose, tag, onSaved }) => {
	const [values, setValues] = useState(emptyTag);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (open) setValues(tag ? { name: tag.name, color: tag.color } : emptyTag);
	}, [open, tag]);

	const handleSubmit = async e => {
		e.preventDefault();
		setSaving(true);
		try {
			const { data } = tag
				? await api.put(`/tags/${tag.id}`, values)
				: await api.post("/tags", values);
			toast.success(i18n.t("tags.toasts.saved"));
			if (onSaved) onSaved(data);
			onClose();
		} catch (err) {
			toastError(err);
		}
		setSaving(false);
	};

	return (
		<Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
			<form onSubmit={handleSubmit}>
				<DialogTitle>
					{tag ? i18n.t("tagModal.title.edit") : i18n.t("tagModal.title.add")}
				</DialogTitle>
				<DialogContent dividers>
					<TextField
						id="tag-name"
						label={i18n.t("tagModal.form.name")}
						value={values.name}
						onChange={e => setValues(prev => ({ ...prev, name: e.target.value }))}
						inputProps={{ maxLength: 40 }}
						variant="outlined"
						margin="dense"
						fullWidth
						required
						autoFocus
					/>
					<TextField
						id="tag-color"
						type="color"
						label={i18n.t("tagModal.form.color")}
						value={values.color}
						onChange={e => setValues(prev => ({ ...prev, color: e.target.value }))}
						variant="outlined"
						margin="dense"
						fullWidth
						required
					/>
				</DialogContent>
				<DialogActions>
					<Button variant="outlined" onClick={onClose} disabled={saving}>
						{i18n.t("tagModal.buttons.cancel")}
					</Button>
					<Button type="submit" variant="contained" color="primary" disabled={saving}>
						{i18n.t("tagModal.buttons.save")}
					</Button>
				</DialogActions>
			</form>
		</Dialog>
	);
};

export default TagModal;
