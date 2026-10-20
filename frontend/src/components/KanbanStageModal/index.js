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
const emptyStage = { name: "", color: "#3478F6" };

const KanbanStageModal = ({ open, onClose, stage }) => {
	const [values, setValues] = useState(emptyStage);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (open) setValues(stage ? { name: stage.name, color: stage.color } : emptyStage);
	}, [open, stage]);

	const handleSubmit = async e => {
		e.preventDefault();
		setSaving(true);
		try {
			if (stage) {
				await api.put(`/kanban/stages/${stage.id}`, values);
			} else {
				await api.post("/kanban/stages", values);
			}
			toast.success(i18n.t("kanban.toasts.stageSaved"));
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
					{stage ? i18n.t("kanban.stageModal.edit") : i18n.t("kanban.stageModal.add")}
				</DialogTitle>
				<DialogContent dividers>
					<TextField
						id="kanban-stage-name"
						label={i18n.t("kanban.stageModal.name")}
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
						id="kanban-stage-color"
						type="color"
						label={i18n.t("kanban.stageModal.color")}
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
						{i18n.t("kanban.stageModal.cancel")}
					</Button>
					<Button type="submit" variant="contained" color="primary" disabled={saving}>
						{i18n.t("kanban.stageModal.save")}
					</Button>
				</DialogActions>
			</form>
		</Dialog>
	);
};

export default KanbanStageModal;
