import React, { useContext, useEffect, useRef } from "react";
import { Link as RouterLink } from "react-router-dom";
import { toast } from "react-toastify";

import { makeStyles } from 'tss-react/mui';
import Button from "@mui/material/Button";
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';

import { WhatsAppsContext } from "../../context/WhatsApp/WhatsAppsContext";
import { showBrowserNotification } from "../../helpers/browserNotification";
import { i18n } from "../../translate/i18n";

// Statuses where the connection is not receiving messages. OPENING is left
// out because it is the normal state while a session (re)starts.
const DOWN_STATUSES = ["DISCONNECTED", "qrcode", "TIMEOUT", "PAIRING"];

const useStyles = makeStyles()(theme => ({
	alert: {
		margin: theme.spacing(1, 1, 0),
	},
}));

// Notifications are a convenience; the banner is always shown.
const notifyBrowser = message =>
	showBrowserNotification(i18n.t("connectionAlert.title"), {
		body: message,
		tag: "connection-alert",
		url: "/connections",
	}).catch(() => null);

const ConnectionAlert = () => {
	const { classes } = useStyles();
	const { whatsApps } = useContext(WhatsAppsContext);
	const connectedIds = useRef(new Set());

	const down = whatsApps.filter(whatsApp => DOWN_STATUSES.includes(whatsApp.status));

	// Warn once when a connection that was working in this session drops.
	useEffect(() => {
		whatsApps.forEach(whatsApp => {
			if (whatsApp.status === "CONNECTED") {
				connectedIds.current.add(whatsApp.id);
				return;
			}
			if (
				DOWN_STATUSES.includes(whatsApp.status) &&
				connectedIds.current.has(whatsApp.id)
			) {
				connectedIds.current.delete(whatsApp.id);
				const message = i18n.t("connectionAlert.toast", { name: whatsApp.name });
				toast.error(message, { toastId: `connection-down-${whatsApp.id}` });
				notifyBrowser(message);
			}
		});
	}, [whatsApps]);

	if (down.length === 0) return null;

	return (
		<Alert
			severity="warning"
			className={classes.alert}
			role="alert"
			action={
				<Button component={RouterLink} to="/connections" size="small" color="inherit">
					{i18n.t("connectionAlert.action")}
				</Button>
			}
		>
			<AlertTitle>{i18n.t("connectionAlert.title")}</AlertTitle>
			{i18n.t("connectionAlert.message", {
				count: down.length,
				names: down.map(whatsApp => whatsApp.name).join(", "),
			})}
		</Alert>
	);
};

export default ConnectionAlert;
