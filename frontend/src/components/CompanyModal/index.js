import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";

import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import TextField from "@material-ui/core/TextField";
import MenuItem from "@material-ui/core/MenuItem";
import Typography from "@material-ui/core/Typography";

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import toastError from "../../errors/toastError";

const emptyCompany = {
	name: "",
	planId: "",
	adminName: "",
	adminEmail: "",
	adminPassword: "",
};

const CompanyModal = ({ open, onClose, company, plans, onSaved }) => {
	const [values, setValues] = useState(emptyCompany);
	const [saving, setSaving] = useState(false);
	const isEdit = Boolean(company);

	useEffect(() => {
		if (open) {
			setValues(
				company
					? { ...emptyCompany, name: company.name, planId: company.planId }
					: { ...emptyCompany, planId: plans[0]?.id || "" }
			);
		}
	}, [open, company, plans]);

	const handleChange = e => {
		const { name, value } = e.target;
		setValues(prev => ({ ...prev, [name]: value }));
	};

	const handleSubmit = async e => {
		e.preventDefault();
		setSaving(true);
		try {
			const { data } = isEdit
				? await api.put(`/companies/${company.id}`, {
						name: values.name,
						planId: values.planId,
					})
				: await api.post("/companies", values);
			toast.success(
				i18n.t(isEdit ? "companies.toasts.updated" : "companies.toasts.created")
			);
			onSaved(data);
			onClose();
		} catch (err) {
			toastError(err);
		}
		setSaving(false);
	};

	const field = (name, props = {}) => (
		<TextField
			id={`company-${name}`}
			name={name}
			label={i18n.t(`companyModal.form.${name}`)}
			value={values[name]}
			onChange={handleChange}
			variant="outlined"
			margin="dense"
			fullWidth
			required
			{...props}
		/>
	);

	return (
		<Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth scroll="paper">
			<form onSubmit={handleSubmit}>
				<DialogTitle>
					{isEdit
						? i18n.t("companyModal.title.edit")
						: i18n.t("companyModal.title.add")}
				</DialogTitle>
				<DialogContent dividers>
					{field("name", { autoFocus: true })}
					{field("planId", {
						select: true,
						label: i18n.t("companyModal.form.plan"),
						children: plans.map(plan => (
							<MenuItem key={plan.id} value={plan.id}>
								{plan.name}
							</MenuItem>
						)),
					})}

					{!isEdit && (
						<>
							<Typography
								variant="subtitle2"
								component="h3"
								style={{ marginTop: 16 }}
							>
								{i18n.t("companyModal.form.adminSection")}
							</Typography>
							{field("adminName")}
							{field("adminEmail", { type: "email", autoComplete: "off" })}
							{field("adminPassword", {
								type: "password",
								autoComplete: "new-password",
								inputProps: { minLength: 5 },
							})}
						</>
					)}
				</DialogContent>
				<DialogActions>
					<Button onClick={onClose} variant="outlined" disabled={saving}>
						{i18n.t("companyModal.buttons.cancel")}
					</Button>
					<Button type="submit" color="primary" variant="contained" disabled={saving}>
						{isEdit
							? i18n.t("companyModal.buttons.save")
							: i18n.t("companyModal.buttons.create")}
					</Button>
				</DialogActions>
			</form>
		</Dialog>
	);
};

export default CompanyModal;
