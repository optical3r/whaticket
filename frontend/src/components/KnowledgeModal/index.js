import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";

import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import toastError from "../../errors/toastError";

const emptyArticle = { title: "", content: "", active: true };
const MAX_CONTENT = 20000;

const KnowledgeModal = ({ open, onClose, article, onSaved }) => {
	const [values, setValues] = useState(emptyArticle);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (open) {
			setValues(
				article
					? { title: article.title, content: article.content, active: article.active }
					: emptyArticle
			);
		}
	}, [open, article]);

	const handleSubmit = async e => {
		e.preventDefault();
		setSaving(true);
		try {
			const { data } = article
				? await api.put(`/ai/knowledge/${article.id}`, values)
				: await api.post("/ai/knowledge", values);
			toast.success(i18n.t("ai.knowledge.saved"));
			onSaved(data);
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
					{article ? i18n.t("knowledgeModal.title.edit") : i18n.t("knowledgeModal.title.add")}
				</DialogTitle>
				<DialogContent dividers>
					<TextField
						id="knowledge-title"
						label={i18n.t("knowledgeModal.form.title")}
						value={values.title}
						onChange={e => setValues(prev => ({ ...prev, title: e.target.value }))}
						inputProps={{ maxLength: 120 }}
						variant="outlined"
						margin="dense"
						fullWidth
						required
						autoFocus
					/>
					<TextField
						id="knowledge-content"
						label={i18n.t("knowledgeModal.form.content")}
						helperText={`${i18n.t("knowledgeModal.form.contentHelp")} ${values.content.length}/${MAX_CONTENT}`}
						value={values.content}
						onChange={e => setValues(prev => ({ ...prev, content: e.target.value }))}
						inputProps={{ maxLength: MAX_CONTENT }}
						variant="outlined"
						margin="dense"
						fullWidth
						required
						multiline
						minRows={8}
						maxRows={20}
					/>
					<FormControlLabel
						control={
							<Switch
								color="primary"
								checked={values.active}
								onChange={e => setValues(prev => ({ ...prev, active: e.target.checked }))}
							/>
						}
						label={i18n.t("knowledgeModal.form.active")}
					/>
				</DialogContent>
				<DialogActions>
					<Button variant="outlined" onClick={onClose} disabled={saving}>
						{i18n.t("knowledgeModal.buttons.cancel")}
					</Button>
					<Button type="submit" variant="contained" color="primary" disabled={saving}>
						{i18n.t("knowledgeModal.buttons.save")}
					</Button>
				</DialogActions>
			</form>
		</Dialog>
	);
};

export default KnowledgeModal;
