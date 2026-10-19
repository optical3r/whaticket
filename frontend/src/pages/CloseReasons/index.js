import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";

import {
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	IconButton,
	makeStyles,
	Paper,
	TableBody,
	TableCell,
	TableHead,
	TableRow,
	TextField,
	Typography,
} from "@material-ui/core";
import { DeleteOutline, Edit } from "@material-ui/icons";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import ResponsiveTable from "../../components/ResponsiveTable";
import TableRowSkeleton from "../../components/TableRowSkeleton";
import Title from "../../components/Title";
import ConfirmationModal from "../../components/ConfirmationModal";
import { i18n } from "../../translate/i18n";
import toastError from "../../errors/toastError";
import api from "../../services/api";

const useStyles = makeStyles(theme => ({
	mainPaper: {
		flex: 1,
		padding: theme.spacing(1),
		overflowY: "scroll",
		...theme.scrollbarStyles,
	},
	empty: {
		padding: theme.spacing(3),
		textAlign: "center",
	},
}));

const CloseReasons = () => {
	const classes = useStyles();
	const [reasons, setReasons] = useState([]);
	const [loading, setLoading] = useState(true);
	const [editing, setEditing] = useState(null); // { id?, name }
	const [toDelete, setToDelete] = useState(null);
	const [saving, setSaving] = useState(false);

	const load = async () => {
		setLoading(true);
		try {
			const { data } = await api.get("/closeReasons");
			setReasons(data.reasons);
		} catch (err) {
			toastError(err);
		}
		setLoading(false);
	};

	useEffect(() => {
		void load();
	}, []);

	const handleSave = async e => {
		e.preventDefault();
		setSaving(true);
		try {
			if (editing.id) {
				await api.put(`/closeReasons/${editing.id}`, { name: editing.name });
			} else {
				await api.post("/closeReasons", { name: editing.name });
			}
			toast.success(i18n.t("closeReasons.toasts.saved"));
			setEditing(null);
			await load();
		} catch (err) {
			toastError(err);
		}
		setSaving(false);
	};

	const handleDelete = async reason => {
		try {
			await api.delete(`/closeReasons/${reason.id}`);
			toast.success(i18n.t("closeReasons.toasts.deleted"));
			await load();
		} catch (err) {
			toastError(err);
		}
	};

	return (
		<MainContainer>
			<ConfirmationModal
				title={toDelete && i18n.t("closeReasons.confirmDelete.title", { name: toDelete.name })}
				open={Boolean(toDelete)}
				onClose={() => setToDelete(null)}
				onConfirm={() => handleDelete(toDelete)}
			>
				{i18n.t("closeReasons.confirmDelete.message")}
			</ConfirmationModal>
			<Dialog open={Boolean(editing)} onClose={() => setEditing(null)} maxWidth="xs" fullWidth>
				<form onSubmit={handleSave}>
					<DialogTitle>
						{editing?.id
							? i18n.t("closeReasons.buttons.edit")
							: i18n.t("closeReasons.buttons.add")}
					</DialogTitle>
					<DialogContent dividers>
						<TextField
							id="close-reason-name"
							label={i18n.t("closeReasons.form.name")}
							value={editing?.name || ""}
							onChange={e => setEditing(prev => ({ ...prev, name: e.target.value }))}
							inputProps={{ maxLength: 80 }}
							variant="outlined"
							margin="dense"
							fullWidth
							required
							autoFocus
						/>
					</DialogContent>
					<DialogActions>
						<Button variant="outlined" onClick={() => setEditing(null)} disabled={saving}>
							{i18n.t("tagModal.buttons.cancel")}
						</Button>
						<Button type="submit" variant="contained" color="primary" disabled={saving}>
							{i18n.t("tagModal.buttons.save")}
						</Button>
					</DialogActions>
				</form>
			</Dialog>
			<MainHeader>
				<Title>{i18n.t("closeReasons.title")}</Title>
				<MainHeaderButtonsWrapper>
					<Button variant="contained" color="primary" onClick={() => setEditing({ name: "" })}>
						{i18n.t("closeReasons.buttons.add")}
					</Button>
				</MainHeaderButtonsWrapper>
			</MainHeader>
			<Paper className={classes.mainPaper} variant="outlined">
				<ResponsiveTable>
					<TableHead>
						<TableRow>
							<TableCell align="center">{i18n.t("closeReasons.table.name")}</TableCell>
							<TableCell align="center">{i18n.t("closeReasons.table.actions")}</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{reasons.map(reason => (
							<TableRow key={reason.id}>
								<TableCell align="center">{reason.name}</TableCell>
								<TableCell align="center">
									<IconButton
										size="small"
										aria-label={i18n.t("closeReasons.buttons.edit")}
										title={i18n.t("closeReasons.buttons.edit")}
										onClick={() => setEditing({ id: reason.id, name: reason.name })}
									>
										<Edit />
									</IconButton>
									<IconButton
										size="small"
										aria-label={i18n.t("closeReasons.buttons.delete")}
										title={i18n.t("closeReasons.buttons.delete")}
										onClick={() => setToDelete(reason)}
									>
										<DeleteOutline />
									</IconButton>
								</TableCell>
							</TableRow>
						))}
						{loading && <TableRowSkeleton columns={2} />}
					</TableBody>
				</ResponsiveTable>
				{!loading && reasons.length === 0 && (
					<Typography className={classes.empty} color="textSecondary">
						{i18n.t("closeReasons.empty")}
					</Typography>
				)}
			</Paper>
		</MainContainer>
	);
};

export default CloseReasons;
