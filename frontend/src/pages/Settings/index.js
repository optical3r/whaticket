import React, { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";

import { makeStyles } from 'tss-react/mui';
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Container from "@mui/material/Container";
import TextField from "@mui/material/TextField";
import LinearProgress from "@mui/material/LinearProgress";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import { toast } from "react-toastify";

import api from "../../services/api";
import { i18n } from "../../translate/i18n.js";
import toastError from "../../errors/toastError";

const useStyles = makeStyles()(theme => ({
	root: {
		display: "flex",
		alignItems: "center",
		padding: theme.spacing(8, 8, 3),
		[theme.breakpoints.down('md')]: {
			padding: theme.spacing(4, 2, 3),
		},
	},

	paper: {
		padding: theme.spacing(3),
		marginBottom: theme.spacing(2),
	},

	sectionTitle: {
		marginBottom: theme.spacing(2),
	},

	usageRow: {
		marginTop: theme.spacing(2),
	},

	usageLabel: {
		display: "flex",
		justifyContent: "space-between",
		marginBottom: theme.spacing(0.5),
	},

	usageValue: {
		fontFamily: theme.typography.monoFontFamily,
	},

	termsNote: {
		marginTop: theme.spacing(3),
		color: theme.palette.text.secondary,
	},

	token: {
		"& input": {
			fontFamily: theme.typography.monoFontFamily,
		},
	},
}));

const UsageBar = ({ label, used, limit }) => {
	const { classes } = useStyles();
	const percent = limit > 0 ? Math.min(100, (used / limit) * 100) : 100;

	return (
		<div className={classes.usageRow}>
			<div className={classes.usageLabel}>
				<Typography variant="body2">{label}</Typography>
				<Typography variant="body2" className={classes.usageValue}>
					{used} {i18n.t("settings.company.of")} {limit}
				</Typography>
			</div>
			<LinearProgress
				variant="determinate"
				value={percent}
				color={percent >= 100 ? "secondary" : "primary"}
				aria-label={`${label}: ${used} ${i18n.t("settings.company.of")} ${limit}`}
			/>
		</div>
	);
};

// Every IANA zone the browser knows, with Brazilian zones as fallback.
const TIMEZONES = (() => {
	try {
		return Intl.supportedValuesOf("timeZone");
	} catch {
		return [
			"America/Sao_Paulo",
			"America/Manaus",
			"America/Belem",
			"America/Fortaleza",
			"America/Recife",
			"America/Cuiaba",
			"America/Porto_Velho",
			"America/Rio_Branco",
			"America/Noronha",
		];
	}
})();

const Settings = () => {
	const { classes } = useStyles();

	const [company, setCompany] = useState(null);
	const [apiToken, setApiToken] = useState("");
	const [values, setValues] = useState({});

	// Updates the screen right away and undoes it if the server refuses.
	const saveSetting = async (key, value) => {
		const previous = values[key];
		setValues(prev => ({ ...prev, [key]: value }));
		try {
			await api.put(`/settings/${key}`, { value });
			toast.success(i18n.t("settings.success"));
		} catch (err) {
			setValues(prev => ({ ...prev, [key]: previous }));
			toastError(err);
		}
	};

	const saveTexts = async () => {
		await saveSetting("csatMessage", values.csatMessage);
		await saveSetting("csatThanksMessage", values.csatThanksMessage);
	};

	const saveTimezone = async timezone => {
		try {
			const { data } = await api.put("/company", { timezone });
			setCompany(data);
			toast.success(i18n.t("settings.timezone.saved"));
		} catch (err) {
			toastError(err);
		}
	};

	useEffect(() => {
		void (async () => {
			try {
				const [{ data: companyData }, { data: settings }] = await Promise.all([
					api.get("/company"),
					api.get("/settings"),
				]);
				setCompany(companyData);
				const token = settings.find(s => s.key === "userApiToken");
				setApiToken(token ? token.value : "");
				setValues(Object.fromEntries(settings.map(s => [s.key, s.value])));
			} catch (err) {
				toastError(err);
			}
		})();
	}, []);

	return (
		<div className={classes.root}>
			<Container maxWidth="sm">
				<Typography variant="h5" component="h1" gutterBottom>
					{i18n.t("settings.title")}
				</Typography>

				{company && (
					<Paper className={classes.paper} variant="outlined">
						<Typography variant="h6" component="h2" className={classes.sectionTitle}>
							{company.name}
						</Typography>
						<Typography variant="body2" color="textSecondary">
							{i18n.t("settings.company.plan")}: {company.plan?.name}
						</Typography>

						<UsageBar
							label={i18n.t("settings.company.users")}
							used={company.usage.users}
							limit={company.plan.users}
						/>
						<UsageBar
							label={i18n.t("settings.company.connections")}
							used={company.usage.connections}
							limit={company.plan.connections}
						/>
						<UsageBar
							label={i18n.t("settings.company.queues")}
							used={company.usage.queues}
							limit={company.plan.queues}
						/>

						<Typography variant="body2" className={classes.termsNote}>
							{company.termsAcceptedAt
								? i18n.t("settings.company.termsAccepted", {
										date: format(parseISO(company.termsAcceptedAt), "dd/MM/yyyy HH:mm"),
										by: company.termsAcceptedBy,
									})
								: i18n.t("settings.company.termsPending")}
						</Typography>
					</Paper>
				)}

				{company && (
					<Paper className={classes.paper} variant="outlined">
						<TextField
							id="company-timezone"
							select
							fullWidth
							variant="outlined"
							margin="dense"
							label={i18n.t("settings.timezone.label")}
							helperText={i18n.t("settings.timezone.help")}
							value={company.timezone}
							onChange={e => saveTimezone(e.target.value)}
						>
							{TIMEZONES.map(zone => (
								<MenuItem key={zone} value={zone}>
									{zone}
								</MenuItem>
							))}
						</TextField>
					</Paper>
				)}

				<Paper className={classes.paper} variant="outlined">
					<Typography variant="h6" component="h2" className={classes.sectionTitle}>
						{i18n.t("settings.closing.title")}
					</Typography>
					<FormControlLabel
						control={
							<Switch
								color="primary"
								checked={values.closeReasonRequired === "enabled"}
								onChange={e =>
									saveSetting("closeReasonRequired", e.target.checked ? "enabled" : "disabled")
								}
							/>
						}
						label={i18n.t("settings.closing.closeReasonRequired")}
					/>
					<Typography variant="body2" color="textSecondary">
						{i18n.t("settings.closing.closeReasonHelp")}
					</Typography>
				</Paper>

				<Paper className={classes.paper} variant="outlined">
					<Typography variant="h6" component="h2" className={classes.sectionTitle}>
						{i18n.t("settings.csat.title")}
					</Typography>
					<FormControlLabel
						control={
							<Switch
								color="primary"
								checked={values.csatEnabled === "enabled"}
								onChange={e => saveSetting("csatEnabled", e.target.checked ? "enabled" : "disabled")}
							/>
						}
						label={i18n.t("settings.csat.enabled")}
					/>
					<Typography variant="body2" color="textSecondary" gutterBottom>
						{i18n.t("settings.csat.help")}
					</Typography>
					<TextField
						id="csat-message"
						label={i18n.t("settings.csat.message")}
						value={values.csatMessage || ""}
						onChange={e => setValues(prev => ({ ...prev, csatMessage: e.target.value }))}
						inputProps={{ maxLength: 1000 }}
						variant="outlined"
						margin="dense"
						multiline
						minRows={2}
						fullWidth
					/>
					<TextField
						id="csat-thanks"
						label={i18n.t("settings.csat.thanks")}
						value={values.csatThanksMessage || ""}
						onChange={e => setValues(prev => ({ ...prev, csatThanksMessage: e.target.value }))}
						inputProps={{ maxLength: 1000 }}
						variant="outlined"
						margin="dense"
						fullWidth
					/>
					<Button variant="outlined" color="primary" onClick={saveTexts} style={{ marginTop: 8 }}>
						{i18n.t("settings.csat.save")}
					</Button>
				</Paper>

				<Paper className={classes.paper} variant="outlined">
					<TextField
						id="api-token-setting"
						label={i18n.t("settings.apiToken.label")}
						helperText={i18n.t("settings.apiToken.help")}
						InputProps={{ readOnly: true }}
						margin="dense"
						variant="outlined"
						fullWidth
						className={classes.token}
						value={apiToken}
					/>
				</Paper>
			</Container>
		</div>
	);
};

export default Settings;
