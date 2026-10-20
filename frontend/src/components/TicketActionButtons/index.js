import React, { useContext, useState } from "react";
import { useHistory } from "react-router-dom";

import { makeStyles } from 'tss-react/mui';
import { IconButton } from "@mui/material";
import { MoreVert, Replay } from "@mui/icons-material";

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import TicketOptionsMenu from "../TicketOptionsMenu";
import ButtonWithSpinner from "../ButtonWithSpinner";
import toastError from "../../errors/toastError";
import { AuthContext } from "../../context/Auth/AuthContext";
import CloseTicketModal from "../CloseTicketModal";

const useStyles = makeStyles()(theme => ({
	actionButtons: {
		marginRight: 6,
		flex: "none",
		alignSelf: "center",
		marginLeft: "auto",
		"& > *": {
			margin: theme.spacing(1),
		},
	},
}));

const TicketActionButtons = ({ ticket }) => {
	const { classes } = useStyles();
	const history = useHistory();
	const [anchorEl, setAnchorEl] = useState(null);
	const [loading, setLoading] = useState(false);
	const ticketOptionsMenuOpen = Boolean(anchorEl);
	const { user } = useContext(AuthContext);

	const handleOpenTicketOptionsMenu = e => {
		setAnchorEl(e.currentTarget);
	};

	const handleCloseTicketOptionsMenu = e => {
		setAnchorEl(null);
	};

	const [closeModal, setCloseModal] = useState({ open: false, reasons: [], required: false });

	const handleUpdateTicketStatus = async (e, status, userId, extra = {}) => {
		setLoading(true);
		try {
			await api.put(`/tickets/${ticket.id}`, {
				status: status,
				userId: userId || null,
				...extra,
			});

			setLoading(false);
			if (status === "open") {
				history.push(`/tickets/${ticket.id}`);
			} else {
				history.push("/tickets");
			}
		} catch (err) {
			setLoading(false);
			toastError(err);
		}
	};

	// Asks for a close reason when the company has registered any.
	const handleResolve = async e => {
		setLoading(true);
		try {
			const { data } = await api.get("/closeReasons");
			setLoading(false);
			if (data.reasons.length > 0) {
				setCloseModal({ open: true, reasons: data.reasons, required: data.required });
				return;
			}
		} catch (err) {
			setLoading(false);
			toastError(err);
			return;
		}
		await handleUpdateTicketStatus(e, "closed", user?.id);
	};

	const handleConfirmClose = async closeReasonId => {
		setCloseModal(prev => ({ ...prev, open: false }));
		await handleUpdateTicketStatus(null, "closed", user?.id, { closeReasonId });
	};

	return (
        <div className={classes.actionButtons}>
			<CloseTicketModal
				open={closeModal.open}
				reasons={closeModal.reasons}
				required={closeModal.required}
				loading={loading}
				onClose={() => setCloseModal(prev => ({ ...prev, open: false }))}
				onConfirm={handleConfirmClose}
			/>
			{ticket.status === "closed" && (
				<ButtonWithSpinner
					loading={loading}
					startIcon={<Replay />}
					size="small"
					onClick={e => handleUpdateTicketStatus(e, "open", user?.id)}
				>
					{i18n.t("messagesList.header.buttons.reopen")}
				</ButtonWithSpinner>
			)}
			{ticket.status === "open" && (
				<>
					<ButtonWithSpinner
						loading={loading}
						startIcon={<Replay />}
						size="small"
						onClick={e => handleUpdateTicketStatus(e, "pending", null)}
					>
						{i18n.t("messagesList.header.buttons.return")}
					</ButtonWithSpinner>
					<ButtonWithSpinner
						loading={loading}
						size="small"
						variant="contained"
						color="primary"
						onClick={handleResolve}
					>
						{i18n.t("messagesList.header.buttons.resolve")}
					</ButtonWithSpinner>
					<IconButton onClick={handleOpenTicketOptionsMenu} size="large">
						<MoreVert />
					</IconButton>
					<TicketOptionsMenu
						ticket={ticket}
						anchorEl={anchorEl}
						menuOpen={ticketOptionsMenuOpen}
						handleClose={handleCloseTicketOptionsMenu}
					/>
				</>
			)}
			{ticket.status === "pending" && (
				<ButtonWithSpinner
					loading={loading}
					size="small"
					variant="contained"
					color="primary"
					onClick={e => handleUpdateTicketStatus(e, "open", user?.id)}
				>
					{i18n.t("messagesList.header.buttons.accept")}
				</ButtonWithSpinner>
			)}
		</div>
    );
};

export default TicketActionButtons;
