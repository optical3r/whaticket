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

const emptyPlan = { name: "", users: 5, connections: 1, queues: 5 };

const PlanModal = ({ open, onClose, plan, onSaved }) => {
	const [values, setValues] = useState(emptyPlan);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (open) {
			setValues(plan ? { ...emptyPlan, ...plan } : emptyPlan);
		}
	}, [open, plan]);

	const handleChange = e => {
		const { name, value } = e.target;
		setValues(prev => ({ ...prev, [name]: value }));
	};

	const handleSubmit = async e => {
		e.preventDefault();
		setSaving(true);
		const payload = {
			name: values.name,
			users: Number(values.users),
			connections: Number(values.connections),
			queues: Number(values.queues),
		};
		try {
			const { data } = plan
				? await api.put(`/plans/${plan.id}`, payload)
				: await api.post("/plans", payload);
			toast.success(i18n.t("plans.toasts.saved"));
			onSaved(data);
			onClose();
		} catch (err) {
			toastError(err);
		}
		setSaving(false);
	};

	const numberField = name => (
		<TextField
			key={name}
			id={`plan-${name}`}
			name={name}
			type="number"
			label={i18n.t(`planModal.form.${name}`)}
			value={values[name]}
			onChange={handleChange}
			inputProps={{ min: name === "queues" ? 0 : 1, step: 1 }}
			variant="outlined"
			margin="dense"
			fullWidth
			required
		/>
	);

	return (
		<Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth scroll="paper">
			<form onSubmit={handleSubmit}>
				<DialogTitle>
					{plan ? i18n.t("planModal.title.edit") : i18n.t("planModal.title.add")}
				</DialogTitle>
				<DialogContent dividers>
					<TextField
						id="plan-name"
						name="name"
						label={i18n.t("planModal.form.name")}
						value={values.name}
						onChange={handleChange}
						variant="outlined"
						margin="dense"
						fullWidth
						required
						autoFocus
					/>
					{["users", "connections", "queues"].map(numberField)}
				</DialogContent>
				<DialogActions>
					<Button onClick={onClose} variant="outlined" disabled={saving}>
						{i18n.t("planModal.buttons.cancel")}
					</Button>
					<Button type="submit" color="primary" variant="contained" disabled={saving}>
						{i18n.t("planModal.buttons.save")}
					</Button>
				</DialogActions>
			</form>
		</Dialog>
	);
};

export default PlanModal;
