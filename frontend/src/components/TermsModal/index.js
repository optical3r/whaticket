import React, { useContext, useEffect, useState } from "react";
import { toast } from "react-toastify";

import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import Typography from "@mui/material/Typography";

import api from "../../services/api";
import openSocket from "../../services/socket-io";
import toastError from "../../errors/toastError";
import { i18n } from "../../translate/i18n";
import { AuthContext } from "../../context/Auth/AuthContext";

const termItems = ["ban", "official", "responsibility", "support"];
const DISMISS_KEY = "termsModalDismissed";

// "Not now" lasts until the browser tab is closed.
const readDismissed = () => {
	try {
		return sessionStorage.getItem(DISMISS_KEY) === "true";
	} catch {
		return false;
	}
};

// Company admins must accept the QR code risks before creating connections.
// Shown after login until someone in the company accepts.
const TermsModal = () => {
	const { user } = useContext(AuthContext);
	const [pending, setPending] = useState(false);
	const [dismissed, setDismissed] = useState(readDismissed);
	const [agreed, setAgreed] = useState(false);
	const [saving, setSaving] = useState(false);

	const isAdmin = user.profile === "admin";

	useEffect(() => {
		if (!user.id || !isAdmin) return undefined;

		setPending(!user.company?.termsAcceptedAt);

		const socket = openSocket();
		socket.on("company", data => {
			if (data.action === "update" && data.company?.termsAcceptedAt) {
				setPending(false);
			}
		});

		return () => {
			socket.disconnect();
		};
	}, [user.id, user.company, isAdmin]);

	const handleDismiss = () => {
		setDismissed(true);
		try {
			sessionStorage.setItem(DISMISS_KEY, "true");
		} catch {
			// Without storage the modal simply shows again after a reload.
		}
	};

	const handleAccept = async () => {
		setSaving(true);
		try {
			await api.post("/company/terms");
			toast.success(i18n.t("termsModal.success"));
			setPending(false);
		} catch (err) {
			toastError(err);
		}
		setSaving(false);
	};

	return (
		<Dialog
			open={isAdmin && pending && !dismissed}
			onClose={handleDismiss}
			maxWidth="sm"
			aria-labelledby="terms-dialog-title"
		>
			<DialogTitle id="terms-dialog-title">{i18n.t("termsModal.title")}</DialogTitle>
			<DialogContent dividers>
				<Typography variant="body1" gutterBottom>
					{i18n.t("termsModal.intro")}
				</Typography>
				<ul>
					{termItems.map(item => (
						<li key={item}>
							<Typography variant="body2" gutterBottom>
								{i18n.t(`termsModal.items.${item}`)}
							</Typography>
						</li>
					))}
				</ul>
				<FormControlLabel
					control={
						<Checkbox
							checked={agreed}
							onChange={e => setAgreed(e.target.checked)}
							color="primary"
						/>
					}
					label={i18n.t("termsModal.checkbox")}
				/>
			</DialogContent>
			<DialogActions>
				<Button variant="outlined" onClick={handleDismiss}>
					{i18n.t("termsModal.buttons.later")}
				</Button>
				<Button
					variant="contained"
					color="primary"
					disabled={!agreed || saving}
					onClick={handleAccept}
				>
					{i18n.t("termsModal.buttons.accept")}
				</Button>
			</DialogActions>
		</Dialog>
	);
};

export default TermsModal;
