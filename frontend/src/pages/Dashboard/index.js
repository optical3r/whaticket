import React, { useContext, useEffect, useState } from "react";
import { format } from "date-fns";

import Paper from "@mui/material/Paper";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import { makeStyles } from 'tss-react/mui';

import useTickets from "../../hooks/useTickets";
import { AuthContext } from "../../context/Auth/AuthContext";
import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import MetricCard from "../../components/MetricCard";
import { formatDuration, formatRating } from "../../helpers/formatDuration";

import Chart from "./Chart";

const useStyles = makeStyles()(theme => ({
	container: {
		paddingTop: theme.spacing(4),
		paddingBottom: theme.spacing(4),
	},
	chartPaper: {
		padding: theme.spacing(3),
		display: "flex",
		overflow: "auto",
		flexDirection: "column",
		height: 280,
		borderRadius: theme.borderRadius.medium,
	},
}));

const Dashboard = () => {
	const { classes } = useStyles();
	const { user } = useContext(AuthContext);
	const [today, setToday] = useState(null);

	const queueIds = JSON.stringify((user.queues || []).map(queue => queue.id));
	const isManager = user.profile === "admin" || user.profile === "supervisor";

	const { count: openCount } = useTickets({ status: "open", showAll: "true", withUnreadMessages: "false", queueIds });
	const { count: pendingCount } = useTickets({ status: "pending", showAll: "true", withUnreadMessages: "false", queueIds });

	// Today's indicators come from the reports endpoint (managers only).
	useEffect(() => {
		if (!isManager) return;
		const day = format(new Date(), "yyyy-MM-dd");
		void (async () => {
			try {
				const { data } = await api.get("/reports", { params: { from: day, to: day } });
				setToday(data);
			} catch {
				setToday(null);
			}
		})();
	}, [isManager]);

	const now = i18n.t("dashboardCards.now");
	const todayLabel = i18n.t("dashboardCards.today");
	const source = i18n.t("dashboardCards.source");
	const unit = count => i18n.t("dashboardCards.unitTickets", { count });
	const noData = i18n.t("reports.cards.noData");

	return (
		<div>
			<Container maxWidth="lg" className={classes.container}>
				<Grid container spacing={2}>
					<Grid size={{ xs: 12, sm: 6, md: isManager ? "grow" : 6 }}>
						<MetricCard
							label={i18n.t("dashboardCards.open")}
							value={openCount}
							unit={unit(openCount)}
							period={now}
							source={source}
						/>
					</Grid>
					<Grid size={{ xs: 12, sm: 6, md: isManager ? "grow" : 6 }}>
						<MetricCard
							label={i18n.t("dashboardCards.pending")}
							value={pendingCount}
							unit={unit(pendingCount)}
							period={now}
							source={source}
						/>
					</Grid>
					{isManager && today && (
						<>
							<Grid size={{ xs: 12, sm: 4, md: "grow" }}>
								<MetricCard
									label={i18n.t("dashboardCards.closedToday")}
									value={today.totals.closed}
									unit={unit(today.totals.closed)}
									period={todayLabel}
									source={source}
								/>
							</Grid>
							<Grid size={{ xs: 12, sm: 4, md: "grow" }}>
								<MetricCard
									label={i18n.t("dashboardCards.firstResponseToday")}
									value={formatDuration(today.totals.avgFirstResponseSeconds)}
									emptyText={noData}
									period={todayLabel}
									source={source}
								/>
							</Grid>
							<Grid size={{ xs: 12, sm: 4, md: "grow" }}>
								<MetricCard
									label={i18n.t("dashboardCards.csatToday")}
									value={formatRating(today.csat.average)}
									unit={today.csat.average !== null ? "/ 5" : null}
									emptyText={noData}
									period={todayLabel}
									source={source}
								/>
							</Grid>
						</>
					)}
					<Grid size={12}>
						<Paper variant="outlined" className={classes.chartPaper}>
							<Chart />
						</Paper>
					</Grid>
				</Grid>
			</Container>
		</div>
	);
};

export default Dashboard;
