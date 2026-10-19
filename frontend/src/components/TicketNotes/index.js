import React, { useContext, useEffect, useState } from "react";
import { format, parseISO } from "date-fns";

import { makeStyles } from 'tss-react/mui';
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import DeleteOutline from "@mui/icons-material/DeleteOutline";

import api from "../../services/api";
import openSocket from "../../services/socket-io";
import toastError from "../../errors/toastError";
import { i18n } from "../../translate/i18n";
import { AuthContext } from "../../context/Auth/AuthContext";

const useStyles = makeStyles()(theme => ({
	note: {
		position: "relative",
		padding: theme.spacing(1, 1.5),
		marginBottom: theme.spacing(1),
		borderRadius: theme.borderRadius.small,
		// Warm sand accent: internal, never sent to the customer.
		backgroundColor: theme.palette.mode === "dark" ? "rgba(214,185,140,0.12)" : "#FBF6EE",
		borderLeft: "3px solid #D6B98C",
	},
	noteBody: {
		whiteSpace: "pre-wrap",
		wordBreak: "break-word",
		paddingRight: theme.spacing(3),
	},
	noteMeta: {
		marginTop: theme.spacing(0.5),
		color: theme.palette.text.secondary,
		fontSize: 12,
	},
	deleteButton: {
		position: "absolute",
		top: 2,
		right: 2,
	},
	form: {
		display: "flex",
		flexDirection: "column",
		gap: theme.spacing(1),
		marginTop: theme.spacing(1),
	},
	help: {
		color: theme.palette.text.secondary,
		marginBottom: theme.spacing(1),
	},
}));

const TicketNotes = ({ ticketId }) => {
	const { classes } = useStyles();
	const { user } = useContext(AuthContext);
	const [notes, setNotes] = useState([]);
	const [body, setBody] = useState("");
	const [saving, setSaving] = useState(false);

	const isManager = user.profile === "admin" || user.profile === "supervisor";

	useEffect(() => {
		if (!ticketId) return undefined;

		void (async () => {
			try {
				const { data } = await api.get(`/tickets/${ticketId}/notes`);
				setNotes(data);
			} catch (err) {
				toastError(err);
			}
		})();

		const socket = openSocket();
		socket.on("connect", () => socket.emit("joinChatBox", String(ticketId)));
		socket.on("ticketNote", data => {
			if (data.action === "create" && data.note.ticketId === Number(ticketId)) {
				setNotes(prev =>
					prev.some(note => note.id === data.note.id) ? prev : [...prev, data.note]
				);
			}
			if (data.action === "delete") {
				setNotes(prev => prev.filter(note => note.id !== data.noteId));
			}
		});

		return () => {
			socket.disconnect();
		};
	}, [ticketId]);

	const handleAdd = async e => {
		e.preventDefault();
		if (!body.trim()) return;
		setSaving(true);
		try {
			const { data } = await api.post(`/tickets/${ticketId}/notes`, { body });
			setNotes(prev => (prev.some(note => note.id === data.id) ? prev : [...prev, data]));
			setBody("");
		} catch (err) {
			toastError(err);
		}
		setSaving(false);
	};

	const handleDelete = async noteId => {
		try {
			await api.delete(`/tickets/${ticketId}/notes/${noteId}`);
			setNotes(prev => prev.filter(note => note.id !== noteId));
		} catch (err) {
			toastError(err);
		}
	};

	return (
		<div>
			<Typography variant="subtitle1" component="h3">
				{i18n.t("ticketNotes.title")}
			</Typography>
			<Typography variant="body2" className={classes.help}>
				{i18n.t("ticketNotes.help")}
			</Typography>

			{notes.length === 0 && (
				<Typography variant="body2" color="textSecondary">
					{i18n.t("ticketNotes.empty")}
				</Typography>
			)}

			{notes.map(note => (
				<div key={note.id} className={classes.note}>
					<Typography variant="body2" className={classes.noteBody}>
						{note.body}
					</Typography>
					<Typography className={classes.noteMeta}>
						{note.user?.name || i18n.t("ticketNotes.deletedUser")} ·{" "}
						{format(parseISO(note.createdAt), "dd/MM/yyyy HH:mm")}
					</Typography>
					{(isManager || note.userId === user.id) && (
						<IconButton
							size="small"
							className={classes.deleteButton}
							aria-label={i18n.t("ticketNotes.delete")}
							title={i18n.t("ticketNotes.delete")}
							onClick={() => handleDelete(note.id)}
						>
							<DeleteOutline fontSize="small" />
						</IconButton>
					)}
				</div>
			))}

			<form className={classes.form} onSubmit={handleAdd}>
				<TextField
					id="ticket-note-body"
					label={i18n.t("ticketNotes.placeholder")}
					value={body}
					onChange={e => setBody(e.target.value)}
					variant="outlined"
					size="small"
					multiline
					minRows={2}
					maxRows={6}
					inputProps={{ maxLength: 5000 }}
				/>
				<Button
					type="submit"
					variant="outlined"
					color="primary"
					disabled={saving || !body.trim()}
				>
					{i18n.t("ticketNotes.add")}
				</Button>
			</form>
		</div>
	);
};

export default TicketNotes;
