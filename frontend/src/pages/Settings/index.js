import React, { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";

import { makeStyles } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import Typography from "@material-ui/core/Typography";
import Container from "@material-ui/core/Container";
import TextField from "@material-ui/core/TextField";
import LinearProgress from "@material-ui/core/LinearProgress";

import api from "../../services/api";
import { i18n } from "../../translate/i18n.js";
import toastError from "../../errors/toastError";

const useStyles = makeStyles(theme => ({
	root: {
		display: "flex",
		alignItems: "center",
		padding: theme.spacing(8, 8, 3),
		[theme.breakpoints.down("sm")]: {
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
	const classes = useStyles();
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

const Settings = () => {
	const classes = useStyles();

	const [company, setCompany] = useState(null);
	const [apiToken, setApiToken] = useState("");

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
