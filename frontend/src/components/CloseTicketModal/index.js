import React, { useEffect, useState } from "react";

import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import MenuItem from "@material-ui/core/MenuItem";
import TextField from "@material-ui/core/TextField";

import { i18n } from "../../translate/i18n";

const CloseTicketModal = ({ open, reasons, required, loading, onClose, onConfirm }) => {
	const [reasonId, setReasonId] = useState("");

	useEffect(() => {
		if (open) setReasonId("");
	}, [open]);

	return (
		<Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
			<DialogTitle>{i18n.t("closeTicketModal.title")}</DialogTitle>
			<DialogContent dividers>
				<TextField
					id="close-reason"
					select
					fullWidth
					variant="outlined"
					margin="dense"
					required={required}
					label={
						required
							? i18n.t("closeTicketModal.reason")
							: i18n.t("closeTicketModal.reasonOptional")
					}
					value={reasonId}
					onChange={e => setReasonId(e.target.value)}
				>
					{!required && <MenuItem value="">{i18n.t("closeTicketModal.none")}</MenuItem>}
					{reasons.map(reason => (
						<MenuItem key={reason.id} value={reason.id}>
							{reason.name}
						</MenuItem>
					))}
				</TextField>
			</DialogContent>
			<DialogActions>
				<Button variant="outlined" onClick={onClose} disabled={loading}>
					{i18n.t("closeTicketModal.buttons.cancel")}
				</Button>
				<Button
					variant="contained"
					color="primary"
					disabled={loading || (required && !reasonId)}
					onClick={() => onConfirm(reasonId || null)}
				>
					{i18n.t("closeTicketModal.buttons.confirm")}
				</Button>
			</DialogActions>
		</Dialog>
	);
};

export default CloseTicketModal;
