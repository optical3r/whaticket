import React, { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";

import { makeStyles } from "tss-react/mui";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import LinearProgress from "@mui/material/LinearProgress";
import MenuItem from "@mui/material/MenuItem";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import toastError from "../../errors/toastError";

const useStyles = makeStyles()(theme => ({
	mono: {
		fontFamily: theme.typography.monoFontFamily,
	},
	error: {
		color: theme.palette.text.secondary,
		wordBreak: "break-word",
	},
}));

const STATUSES = ["", "pending", "sent", "failed", "skipped"];

const CampaignReportDialog = ({ campaign, onClose }) => {
	const { classes } = useStyles();
	const [status, setStatus] = useState("");
	const [rows, setRows] = useState([]);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (!campaign) return undefined;
		let active = true;
		setLoading(true);
		api
			.get(`/campaigns/${campaign.id}/contacts`, { params: status ? { status } : {} })
			.then(({ data }) => active && setRows(data))
			.catch(toastError)
			.finally(() => active && setLoading(false));
		return () => {
			active = false;
		};
	}, [campaign, status]);

	const errorText = error =>
		i18n.exists(`backendErrors.${error}`) ? i18n.t(`backendErrors.${error}`) : error;

	return (
		<Dialog open={Boolean(campaign)} onClose={onClose} maxWidth="md" fullWidth scroll="paper">
			<DialogTitle>{campaign ? i18n.t("campaigns.report.title", { name: campaign.name }) : ""}</DialogTitle>
			<DialogContent dividers>
				<TextField
					id="campaign-report-status"
					select
					size="small"
					label={i18n.t("campaigns.report.filter")}
					value={status}
					onChange={e => setStatus(e.target.value)}
					variant="outlined"
					margin="dense"
					style={{ minWidth: 200 }}
				>
					{STATUSES.map(item => (
						<MenuItem key={item || "all"} value={item}>
							{item ? i18n.t(`campaigns.contactStatus.${item}`) : i18n.t("campaigns.report.all")}
						</MenuItem>
					))}
				</TextField>
				{loading && <LinearProgress aria-label={i18n.t("campaigns.loading")} />}
				<Table size="small">
					<TableHead>
						<TableRow>
							<TableCell>{i18n.t("campaigns.report.contact")}</TableCell>
							<TableCell>{i18n.t("campaigns.report.number")}</TableCell>
							<TableCell>{i18n.t("campaigns.report.status")}</TableCell>
							<TableCell>{i18n.t("campaigns.report.sentAt")}</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{rows.map(row => (
							<TableRow key={row.id}>
								<TableCell>{row.name}</TableCell>
								<TableCell className={classes.mono}>{row.number}</TableCell>
								<TableCell>
									{i18n.t(`campaigns.contactStatus.${row.status}`)}
									{row.error && <div className={classes.error}>{errorText(row.error)}</div>}
								</TableCell>
								<TableCell className={classes.mono}>
									{row.sentAt ? format(parseISO(row.sentAt), "dd/MM HH:mm") : "-"}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</DialogContent>
			<DialogActions>
				<Button variant="outlined" onClick={onClose}>
					{i18n.t("campaigns.report.close")}
				</Button>
			</DialogActions>
		</Dialog>
	);
};

export default CampaignReportDialog;
