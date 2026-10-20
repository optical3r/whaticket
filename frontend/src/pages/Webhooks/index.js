import React, { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { toast } from "react-toastify";

import {
    Button,
    IconButton,
    Paper,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Typography,
} from "@mui/material";
import { makeStyles } from 'tss-react/mui';
import { DeleteOutline, Edit, Send } from "@mui/icons-material";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import ResponsiveTable from "../../components/ResponsiveTable";
import TableRowSkeleton from "../../components/TableRowSkeleton";
import Title from "../../components/Title";
import ConfirmationModal from "../../components/ConfirmationModal";
import WebhookModal from "../../components/WebhookModal";
import { i18n } from "../../translate/i18n";
import toastError from "../../errors/toastError";
import api from "../../services/api";

const useStyles = makeStyles()(theme => ({
	mainPaper: {
		flex: 1,
		padding: theme.spacing(1),
		overflowY: "scroll",
		...theme.scrollbarStyles,
	},
	help: {
		padding: theme.spacing(1, 2, 2),
		color: theme.palette.text.secondary,
	},
	url: {
		fontFamily: theme.typography.monoFontFamily,
		fontSize: 13,
		wordBreak: "break-all",
	},
	ok: { color: theme.palette.mode === "dark" ? theme.palette.success.main : "#1B7F57" },
	error: { color: theme.palette.mode === "dark" ? theme.palette.error.main : "#B3261E" },
	empty: { padding: theme.spacing(3), textAlign: "center" },
}));

const WebhookStatus = ({ webhook }) => {
	const { classes } = useStyles();
	if (!webhook.lastSentAt) {
		return <Typography variant="body2" color="textSecondary">{i18n.t("webhooks.status.never")}</Typography>;
	}
	const when = format(parseISO(webhook.lastSentAt), "dd/MM/yyyy HH:mm");
	return webhook.lastError ? (
		<Typography variant="body2" className={classes.error}>
			{i18n.t("webhooks.status.error", { error: webhook.lastError })} · {when}
		</Typography>
	) : (
		<Typography variant="body2" className={classes.ok}>
			{i18n.t("webhooks.status.ok", { status: webhook.lastStatus })} · {when}
		</Typography>
	);
};

const Webhooks = () => {
	const { classes } = useStyles();
	const [webhooks, setWebhooks] = useState([]);
	const [events, setEvents] = useState([]);
	const [loading, setLoading] = useState(true);
	const [modalOpen, setModalOpen] = useState(false);
	const [selected, setSelected] = useState(null);
	const [toDelete, setToDelete] = useState(null);
	const [testing, setTesting] = useState(null);

	const load = async () => {
		setLoading(true);
		try {
			const { data } = await api.get("/webhooks");
			setWebhooks(data.webhooks);
			setEvents(data.events);
		} catch (err) {
			toastError(err);
		}
		setLoading(false);
	};

	useEffect(() => {
		void load();
	}, []);

	const openModal = webhook => {
		setSelected(webhook);
		setModalOpen(true);
	};

	const handleDelete = async webhook => {
		try {
			await api.delete(`/webhooks/${webhook.id}`);
			toast.success(i18n.t("webhooks.toasts.deleted"));
			await load();
		} catch (err) {
			toastError(err);
		}
	};

	const handleTest = async webhook => {
		setTesting(webhook.id);
		try {
			const { data } = await api.post(`/webhooks/${webhook.id}/test`);
			if (data.lastError) {
				toast.error(i18n.t("webhooks.toasts.testError", { error: data.lastError }));
			} else {
				toast.success(i18n.t("webhooks.toasts.testOk"));
			}
			setWebhooks(prev => prev.map(item => (item.id === data.id ? data : item)));
		} catch (err) {
			toastError(err);
		}
		setTesting(null);
	};

	return (
		<MainContainer>
			<ConfirmationModal
				title={toDelete && i18n.t("webhooks.confirmDelete.title", { name: toDelete.name })}
				open={Boolean(toDelete)}
				onClose={() => setToDelete(null)}
				onConfirm={() => handleDelete(toDelete)}
			>
				{i18n.t("webhooks.confirmDelete.message")}
			</ConfirmationModal>
			<WebhookModal
				open={modalOpen}
				onClose={() => setModalOpen(false)}
				webhook={selected}
				events={events}
				onSaved={() => void load()}
			/>
			<MainHeader>
				<Title>{i18n.t("webhooks.title")}</Title>
				<MainHeaderButtonsWrapper>
					<Button variant="contained" color="primary" onClick={() => openModal(null)}>
						{i18n.t("webhooks.buttons.add")}
					</Button>
				</MainHeaderButtonsWrapper>
			</MainHeader>
			<Paper className={classes.mainPaper} variant="outlined">
				<Typography variant="body2" className={classes.help}>
					{i18n.t("webhooks.help")}
				</Typography>
				<ResponsiveTable>
					<TableHead>
						<TableRow>
							{["name", "url", "events", "status", "actions"].map(column => (
								<TableCell key={column} align="center">
									{i18n.t(`webhooks.table.${column}`)}
								</TableCell>
							))}
						</TableRow>
					</TableHead>
					<TableBody>
						{webhooks.map(webhook => (
							<TableRow key={webhook.id} style={{ opacity: webhook.active ? 1 : 0.6 }}>
								<TableCell align="center">{webhook.name}</TableCell>
								<TableCell align="center" className={classes.url} data-label={i18n.t("webhooks.table.url")}>
									{webhook.url}
								</TableCell>
								<TableCell align="center" data-label={i18n.t("webhooks.table.events")}>
									{webhook.events.map(event => i18n.t(`webhooks.events.${event.replace(".", "_")}`)).join(", ")}
								</TableCell>
								<TableCell align="center" data-label={i18n.t("webhooks.table.status")}>
									<WebhookStatus webhook={webhook} />
								</TableCell>
								<TableCell align="center">
									<IconButton
										size="small"
										aria-label={i18n.t("webhooks.buttons.test")}
										title={i18n.t("webhooks.buttons.test")}
										disabled={testing === webhook.id}
										onClick={() => handleTest(webhook)}
									>
										<Send />
									</IconButton>
									<IconButton
										size="small"
										aria-label={i18n.t("webhooks.buttons.edit")}
										title={i18n.t("webhooks.buttons.edit")}
										onClick={() => openModal(webhook)}
									>
										<Edit />
									</IconButton>
									<IconButton
										size="small"
										aria-label={i18n.t("webhooks.buttons.delete")}
										title={i18n.t("webhooks.buttons.delete")}
										onClick={() => setToDelete(webhook)}
									>
										<DeleteOutline />
									</IconButton>
								</TableCell>
							</TableRow>
						))}
						{loading && <TableRowSkeleton columns={5} />}
					</TableBody>
				</ResponsiveTable>
				{!loading && webhooks.length === 0 && (
					<Typography className={classes.empty} color="textSecondary">
						{i18n.t("webhooks.empty")}
					</Typography>
				)}
			</Paper>
		</MainContainer>
	);
};

export default Webhooks;
