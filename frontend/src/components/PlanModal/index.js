import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";

import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormControl from "@mui/material/FormControl";
import FormHelperText from "@mui/material/FormHelperText";
import FormLabel from "@mui/material/FormLabel";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import toastError from "../../errors/toastError";

const emptyPlan = {
	name: "",
	users: 5,
	connections: 1,
	queues: 5,
	aiEnabled: false,
	campaignsEnabled: false,
	aiKeySource: "platform",
	aiMonthlyRequests: 1000,
	transcriptionEnabled: false,
	qrcodeEnabled: true,
	transcriptionMonthlyMinutes: 600,
	coexyEnabled: false,
	coexyMaxChannels: 1,
};

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
			aiEnabled: values.aiEnabled,
			campaignsEnabled: values.campaignsEnabled,
			aiKeySource: values.aiKeySource,
			aiMonthlyRequests: Number(values.aiMonthlyRequests),
			transcriptionEnabled: values.transcriptionEnabled,
			qrcodeEnabled: values.qrcodeEnabled,
			transcriptionMonthlyMinutes: Number(values.transcriptionMonthlyMinutes),
			coexyEnabled: values.coexyEnabled,
			coexyMaxChannels: Number(values.coexyMaxChannels),
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

	const numberField = (name, disabled = false) => (
		<TextField
			key={name}
			id={`plan-${name}`}
			name={name}
			type="number"
			label={i18n.t(`planModal.form.${name}`)}
			value={values[name]}
			onChange={handleChange}
			inputProps={{ min: ["queues", "aiMonthlyRequests", "transcriptionMonthlyMinutes", "coexyMaxChannels"].includes(name) ? 0 : 1, step: 1 }}
			helperText={
				["aiMonthlyRequests", "transcriptionMonthlyMinutes", "coexyMaxChannels"].includes(name)
					? i18n.t(`planModal.form.${name}Help`)
					: undefined
			}
			variant="outlined"
			margin="dense"
			fullWidth
			required
			disabled={disabled}
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
					{["users", "connections", "queues"].map(name => numberField(name))}
					<FormControlLabel
						control={
							<Switch
								color="primary"
								checked={values.qrcodeEnabled}
								onChange={e => setValues(prev => ({ ...prev, qrcodeEnabled: e.target.checked }))}
							/>
						}
						label={i18n.t("planModal.form.qrcodeEnabled")}
					/>
					{!values.qrcodeEnabled && (
						<FormHelperText>{i18n.t("planModal.form.qrcodeOffHelp")}</FormHelperText>
					)}
					<FormControlLabel
						control={
							<Switch
								color="primary"
								checked={values.coexyEnabled}
								onChange={e => setValues(prev => ({ ...prev, coexyEnabled: e.target.checked }))}
							/>
						}
						label={i18n.t("planModal.form.coexyEnabled")}
					/>
					{values.coexyEnabled && numberField("coexyMaxChannels")}
					<FormControlLabel
						control={
							<Switch
								color="primary"
								checked={values.campaignsEnabled}
								onChange={e => setValues(prev => ({ ...prev, campaignsEnabled: e.target.checked }))}
							/>
						}
						label={i18n.t("planModal.form.campaignsEnabled")}
					/>
					<FormControlLabel
						control={
							<Switch
								color="primary"
								checked={values.aiEnabled}
								onChange={e => setValues(prev => ({ ...prev, aiEnabled: e.target.checked }))}
							/>
						}
						label={i18n.t("planModal.form.aiEnabled")}
					/>
					{values.aiEnabled && (
						<FormControl component="fieldset" margin="dense" fullWidth>
							<FormLabel component="legend">{i18n.t("planModal.form.aiKeySource")}</FormLabel>
							<RadioGroup
								name="aiKeySource"
								value={values.aiKeySource}
								onChange={e => setValues(prev => ({ ...prev, aiKeySource: e.target.value }))}
							>
								<FormControlLabel
									value="platform"
									control={<Radio color="primary" />}
									label={i18n.t("planModal.form.aiKeyPlatform")}
								/>
								<FormControlLabel
									value="company"
									control={<Radio color="primary" />}
									label={i18n.t("planModal.form.aiKeyCompany")}
								/>
							</RadioGroup>
						</FormControl>
					)}
					{values.aiEnabled && values.aiKeySource === "platform" && numberField("aiMonthlyRequests")}
					<FormControlLabel
						control={
							<Switch
								color="primary"
								checked={values.transcriptionEnabled}
								onChange={e => setValues(prev => ({ ...prev, transcriptionEnabled: e.target.checked }))}
							/>
						}
						label={i18n.t("planModal.form.transcriptionEnabled")}
					/>
					{values.transcriptionEnabled && numberField("transcriptionMonthlyMinutes")}
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
