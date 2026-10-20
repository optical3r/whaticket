import React, { useEffect, useState } from "react";

import { makeStyles } from "tss-react/mui";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";

import CloudTemplateDialog from "../CloudTemplateDialog";
import { i18n } from "../../translate/i18n";

const useStyles = makeStyles()(theme => ({
	notice: {
		margin: theme.spacing(0, 1.5, 1),
	},
}));

const WINDOW_MS = 24 * 60 * 60 * 1000;

const windowOpen = ticket =>
	Boolean(ticket.lastInboundAt && Date.now() - new Date(ticket.lastInboundAt).getTime() < WINDOW_MS);

// Official API tickets: after 24 hours without a customer message, only
// approved templates can be sent.
const CloudWindowNotice = ({ ticket }) => {
	const { classes } = useStyles();
	const [open, setOpen] = useState(false);
	const [, setTick] = useState(0);

	// The window can close while the ticket is on screen.
	useEffect(() => {
		const timer = setInterval(() => setTick(value => value + 1), 60 * 1000);
		return () => clearInterval(timer);
	}, []);

	if (ticket?.whatsapp?.channel !== "cloudapi" || ticket.status !== "open" || windowOpen(ticket)) {
		return null;
	}

	return (
		<>
			<Alert
				severity="info"
				className={classes.notice}
				action={
					<Button color="primary" size="small" onClick={() => setOpen(true)}>
						{i18n.t("cloudTemplate.open")}
					</Button>
				}
			>
				{i18n.t("cloudTemplate.windowClosed")}
			</Alert>
			<CloudTemplateDialog open={open} onClose={() => setOpen(false)} ticket={ticket} />
		</>
	);
};

export default CloudWindowNotice;
