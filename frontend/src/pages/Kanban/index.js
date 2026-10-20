import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useHistory } from "react-router-dom";
import { formatDistanceToNowStrict, parseISO } from "date-fns";
import { ptBR, enUS } from "date-fns/locale";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { toast } from "react-toastify";

import { makeStyles } from "tss-react/mui";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import LinearProgress from "@mui/material/LinearProgress";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import SearchIcon from "@mui/icons-material/Search";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import Title from "../../components/Title";
import TagChips from "../../components/TagChips";
import ConfirmationModal from "../../components/ConfirmationModal";
import KanbanStageModal from "../../components/KanbanStageModal";
import { AuthContext } from "../../context/Auth/AuthContext";
import openSocket from "../../services/socket-io";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { i18n } from "../../translate/i18n";

const NO_STAGE = "none";

const useStyles = makeStyles()(theme => ({
	board: {
		flex: 1,
		display: "flex",
		gap: theme.spacing(2),
		overflowX: "auto",
		overflowY: "hidden",
		paddingBottom: theme.spacing(1),
		...theme.scrollbarStyles,
	},
	column: {
		flex: "0 0 288px",
		display: "flex",
		flexDirection: "column",
		minHeight: 0,
		borderRadius: theme.borderRadius.medium,
		backgroundColor: theme.palette.tintedBackground,
		border: theme.border.divider,
	},
	columnHeader: {
		display: "flex",
		alignItems: "center",
		gap: theme.spacing(1),
		padding: theme.spacing(1.5, 1, 1, 2),
	},
	columnDot: {
		width: 10,
		height: 10,
		flexShrink: 0,
		borderRadius: theme.borderRadius.pill,
	},
	columnTitle: {
		flex: 1,
		minWidth: 0,
		fontWeight: 600,
	},
	count: {
		fontFamily: theme.typography.monoFontFamily,
		color: theme.palette.text.secondary,
	},
	cards: {
		flex: 1,
		minHeight: 80,
		overflowY: "auto",
		padding: theme.spacing(0, 1, 1),
		...theme.scrollbarStyles,
	},
	cardsOver: {
		backgroundColor: theme.palette.action.hover,
		borderRadius: theme.borderRadius.medium,
	},
	card: {
		position: "relative",
		marginBottom: theme.spacing(1),
		padding: theme.spacing(1.5, 1.5, 1.5, 2),
		borderRadius: theme.borderRadius.table,
		cursor: "pointer",
		overflow: "hidden",
		"&:focus-visible": {
			outline: `2px solid ${theme.palette.primary.main}`,
			outlineOffset: 2,
		},
	},
	cardDragging: {
		boxShadow: theme.elevation.light,
	},
	queueBar: {
		position: "absolute",
		top: 0,
		bottom: 0,
		left: 0,
		width: 4,
		backgroundColor: theme.palette.queue.fallback,
	},
	cardTop: {
		display: "flex",
		alignItems: "center",
		gap: theme.spacing(1),
	},
	avatar: {
		width: 28,
		height: 28,
		fontSize: 14,
	},
	contactName: {
		flex: 1,
		minWidth: 0,
		fontWeight: 600,
	},
	unread: {
		minWidth: 20,
		padding: theme.spacing(0, 0.75),
		borderRadius: theme.borderRadius.pill,
		backgroundColor: theme.palette.success.main,
		color: theme.palette.getContrastText(theme.palette.success.main),
		textAlign: "center",
		...theme.typography.caption,
		fontWeight: 600,
	},
	lastMessage: {
		margin: theme.spacing(0.75, 0),
		color: theme.palette.text.secondary,
		display: "-webkit-box",
		WebkitLineClamp: 2,
		WebkitBoxOrient: "vertical",
		overflow: "hidden",
		wordBreak: "break-word",
	},
	meta: {
		display: "flex",
		justifyContent: "space-between",
		gap: theme.spacing(1),
		color: theme.palette.text.secondary,
		...theme.typography.caption,
	},
	empty: {
		padding: theme.spacing(2),
		textAlign: "center",
		color: theme.palette.text.secondary,
	},
	search: {
		minWidth: 220,
	},
}));

const Kanban = () => {
	const { classes, cx } = useStyles();
	const history = useHistory();
	const { user } = useContext(AuthContext);
	const isManager = user.profile === "admin" || user.profile === "supervisor";

	const [stages, setStages] = useState([]);
	const [tickets, setTickets] = useState([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");
	const [stageModal, setStageModal] = useState({ open: false, stage: null });
	const [menu, setMenu] = useState({ anchor: null, stage: null });
	const [toDelete, setToDelete] = useState(null);
	const refreshTimer = useRef(null);

	const load = useCallback(async () => {
		try {
			const { data } = await api.get("/kanban");
			setStages(data.stages);
			setTickets(data.tickets);
		} catch (err) {
			toastError(err);
		}
		setLoading(false);
	}, []);

	useEffect(() => {
		void load();
	}, [load]);

	// Any change in the open or waiting conversations reloads the board,
	// at most once a second.
	useEffect(() => {
		const scheduleRefresh = () => {
			clearTimeout(refreshTimer.current);
			refreshTimer.current = setTimeout(load, 1000);
		};
		const socket = openSocket();
		socket.on("connect", () => {
			socket.emit("joinTickets", "open");
			socket.emit("joinTickets", "pending");
		});
		socket.on("ticket", scheduleRefresh);
		socket.on("kanban", data => {
			if (data.action === "move") {
				setTickets(prev =>
					prev.map(ticket =>
						ticket.id === data.ticketId ? { ...ticket, kanbanStageId: data.kanbanStageId } : ticket
					)
				);
			} else {
				scheduleRefresh();
			}
		});
		return () => {
			clearTimeout(refreshTimer.current);
			socket.disconnect();
		};
	}, [load]);

	const columns = useMemo(() => {
		const term = search.trim().toLowerCase();
		const visible = term
			? tickets.filter(ticket => ticket.contact?.name?.toLowerCase().includes(term))
			: tickets;
		const known = new Set(stages.map(stage => stage.id));
		return [
			{ id: NO_STAGE, name: i18n.t("kanban.noStage"), color: null },
			...stages,
		].map(stage => ({
			...stage,
			tickets: visible.filter(ticket =>
				stage.id === NO_STAGE
					? !ticket.kanbanStageId || !known.has(ticket.kanbanStageId)
					: ticket.kanbanStageId === stage.id
			),
		}));
	}, [stages, tickets, search]);

	const onDragEnd = async ({ source, destination, draggableId, type }) => {
		if (!destination) return;

		if (type === "COLUMN") {
			if (source.index === destination.index) return;
			// Index 0 is "no stage", which never moves.
			const ordered = [...stages];
			const [moved] = ordered.splice(source.index - 1, 1);
			ordered.splice(Math.max(destination.index - 1, 0), 0, moved);
			const previous = stages;
			setStages(ordered);
			try {
				await api.put("/kanban/stages/order", { ids: ordered.map(stage => stage.id) });
			} catch (err) {
				setStages(previous);
				toastError(err);
			}
			return;
		}

		if (source.droppableId === destination.droppableId) return;
		const ticketId = Number(draggableId.replace("ticket-", ""));
		const stageId = destination.droppableId === NO_STAGE ? null : Number(destination.droppableId);
		const previous = tickets;
		setTickets(prev =>
			prev.map(ticket => (ticket.id === ticketId ? { ...ticket, kanbanStageId: stageId } : ticket))
		);
		try {
			await api.put(`/tickets/${ticketId}/kanban`, { stageId });
		} catch (err) {
			setTickets(previous);
			toastError(err);
		}
	};

	const deleteStage = async stage => {
		try {
			await api.delete(`/kanban/stages/${stage.id}`);
			toast.success(i18n.t("kanban.toasts.stageDeleted"));
		} catch (err) {
			toastError(err);
		}
	};

	const timeAgo = date =>
		formatDistanceToNowStrict(parseISO(date), {
			addSuffix: true,
			locale: i18n.language === "en" ? enUS : ptBR,
		});

	const renderCard = (ticket, index) => (
		<Draggable key={ticket.id} draggableId={`ticket-${ticket.id}`} index={index}>
			{(provided, snapshot) => (
				<Paper
					ref={provided.innerRef}
					{...provided.draggableProps}
					{...provided.dragHandleProps}
					variant="outlined"
					className={cx(classes.card, snapshot.isDragging && classes.cardDragging)}
					onClick={() => history.push(`/tickets/${ticket.id}`)}
					aria-label={i18n.t("kanban.cardLabel", { name: ticket.contact?.name })}
				>
					<span
						className={classes.queueBar}
						style={ticket.queue?.color ? { backgroundColor: ticket.queue.color } : undefined}
						title={ticket.queue?.name || i18n.t("kanban.noQueue")}
					/>
					<div className={classes.cardTop}>
						<Avatar src={ticket.contact?.profilePicUrl} className={classes.avatar} alt="">
							{ticket.contact?.name?.[0]}
						</Avatar>
						<Typography variant="body2" noWrap className={classes.contactName}>
							{ticket.contact?.name}
						</Typography>
						{ticket.unreadMessages > 0 && (
							<span className={classes.unread}>{ticket.unreadMessages > 99 ? "99+" : ticket.unreadMessages}</span>
						)}
					</div>
					{ticket.lastMessage && (
						<Typography variant="body2" className={classes.lastMessage}>
							{ticket.lastMessage}
						</Typography>
					)}
					<TagChips tags={ticket.tags} />
					<div className={classes.meta}>
						<span>
							{ticket.status === "pending"
								? i18n.t("kanban.waiting")
								: ticket.user?.name || i18n.t("kanban.unassigned")}
						</span>
						<span>{timeAgo(ticket.updatedAt)}</span>
					</div>
				</Paper>
			)}
		</Draggable>
	);

	const renderColumn = (column, index) => {
		const body = (
			<Droppable droppableId={String(column.id)} type="TICKET">
				{(provided, snapshot) => (
					<div
						ref={provided.innerRef}
						{...provided.droppableProps}
						className={cx(classes.cards, snapshot.isDraggingOver && classes.cardsOver)}
					>
						{column.tickets.map(renderCard)}
						{provided.placeholder}
						{column.tickets.length === 0 && !snapshot.isDraggingOver && (
							<Typography variant="body2" className={classes.empty}>
								{i18n.t("kanban.emptyColumn")}
							</Typography>
						)}
					</div>
				)}
			</Droppable>
		);

		const header = dragHandleProps => (
			<div className={classes.columnHeader} {...dragHandleProps}>
				<span
					className={classes.columnDot}
					style={{ backgroundColor: column.color || "transparent", border: column.color ? 0 : "1px solid currentColor" }}
				/>
				<Typography component="h2" variant="body1" noWrap className={classes.columnTitle}>
					{column.name}
				</Typography>
				<Typography variant="body2" className={classes.count}>
					{column.tickets.length}
				</Typography>
				{isManager && column.id !== NO_STAGE && (
					<IconButton
						size="small"
						aria-label={i18n.t("kanban.stageMenu", { name: column.name })}
						onClick={e => setMenu({ anchor: e.currentTarget, stage: column })}
					>
						<MoreVertIcon fontSize="small" />
					</IconButton>
				)}
			</div>
		);

		if (column.id === NO_STAGE || !isManager) {
			return (
				<section key={column.id} className={classes.column} aria-label={column.name}>
					{header()}
					{body}
				</section>
			);
		}

		return (
			<Draggable key={column.id} draggableId={`stage-${column.id}`} index={index}>
				{provided => (
					<section
						ref={provided.innerRef}
						{...provided.draggableProps}
						className={classes.column}
						aria-label={column.name}
					>
						{header(provided.dragHandleProps)}
						{body}
					</section>
				)}
			</Draggable>
		);
	};

	return (
		<MainContainer>
			<KanbanStageModal
				open={stageModal.open}
				stage={stageModal.stage}
				onClose={() => {
					setStageModal({ open: false, stage: null });
					void load();
				}}
			/>
			<ConfirmationModal
				title={toDelete ? i18n.t("kanban.confirmDelete", { name: toDelete.name }) : ""}
				open={Boolean(toDelete)}
				onClose={() => setToDelete(null)}
				onConfirm={() => deleteStage(toDelete)}
			>
				{i18n.t("kanban.confirmDeleteMessage")}
			</ConfirmationModal>
			<Menu
				anchorEl={menu.anchor}
				open={Boolean(menu.anchor)}
				onClose={() => setMenu({ anchor: null, stage: null })}
			>
				<MenuItem
					onClick={() => {
						setStageModal({ open: true, stage: menu.stage });
						setMenu({ anchor: null, stage: null });
					}}
				>
					{i18n.t("kanban.editStage")}
				</MenuItem>
				<MenuItem
					onClick={() => {
						setToDelete(menu.stage);
						setMenu({ anchor: null, stage: null });
					}}
				>
					{i18n.t("kanban.deleteStage")}
				</MenuItem>
			</Menu>

			<MainHeader>
				<Title>{i18n.t("kanban.title")}</Title>
				<MainHeaderButtonsWrapper>
					<TextField
						size="small"
						className={classes.search}
						placeholder={i18n.t("kanban.search")}
						value={search}
						onChange={e => setSearch(e.target.value)}
						inputProps={{ "aria-label": i18n.t("kanban.search") }}
						InputProps={{
							startAdornment: (
								<InputAdornment position="start">
									<SearchIcon fontSize="small" />
								</InputAdornment>
							),
						}}
					/>
					{isManager && (
						<Button
							variant="contained"
							color="primary"
							onClick={() => setStageModal({ open: true, stage: null })}
						>
							{i18n.t("kanban.addStage")}
						</Button>
					)}
				</MainHeaderButtonsWrapper>
			</MainHeader>

			{loading ? (
				<LinearProgress aria-label={i18n.t("kanban.loading")} />
			) : (
				<DragDropContext onDragEnd={onDragEnd}>
					<Droppable droppableId="board" direction="horizontal" type="COLUMN" isDropDisabled={!isManager}>
						{provided => (
							<div ref={provided.innerRef} {...provided.droppableProps} className={classes.board}>
								{columns.map(renderColumn)}
								{provided.placeholder}
							</div>
						)}
					</Droppable>
				</DragDropContext>
			)}
			{!loading && stages.length === 0 && (
				<Typography variant="body2" className={classes.empty}>
					{isManager ? i18n.t("kanban.noStagesManager") : i18n.t("kanban.noStages")}
				</Typography>
			)}
		</MainContainer>
	);
};

export default Kanban;
