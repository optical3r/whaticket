import React, { useCallback, useEffect, useState } from "react";
import { format, parseISO, subDays } from "date-fns";

import { makeStyles, useTheme } from "@material-ui/core/styles";
import {
	Button,
	Grid,
	MenuItem,
	Paper,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableRow,
	TextField,
	Typography,
} from "@material-ui/core";
import GetAppOutlined from "@material-ui/icons/GetAppOutlined";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Legend,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import Title from "../../components/Title";
import MetricCard from "../../components/MetricCard";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { i18n } from "../../translate/i18n";
import { formatDuration, formatRating } from "../../helpers/formatDuration";

// Validated with the dataviz palette checker (light and dark surfaces).
// The cyan is below 3:1 on white, so the chart also offers a table view.
export const SERIES = { created: "#3478F6", closed: "#2AA5B8" };

const useStyles = makeStyles(theme => ({
	content: {
		flex: 1,
		overflowY: "auto",
		...theme.scrollbarStyles,
		paddingBottom: theme.spacing(3),
	},
	filters: {
		display: "flex",
		flexWrap: "wrap",
		gap: theme.spacing(1.5),
		alignItems: "center",
		padding: theme.spacing(2),
		marginBottom: theme.spacing(2),
		borderRadius: theme.borderRadius.medium,
	},
	filterField: {
		minWidth: 150,
	},
	panel: {
		padding: theme.spacing(3),
		borderRadius: theme.borderRadius.medium,
		height: "100%",
	},
	panelHeader: {
		display: "flex",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: theme.spacing(2),
	},
	mono: {
		fontFamily: theme.typography.monoFontFamily,
	},
	source: {
		color: theme.palette.text.secondary,
		fontSize: 12,
		margin: theme.spacing(0, 0, 2),
	},
}));

const today = () => format(new Date(), "yyyy-MM-dd");

const ChartTooltip = ({ active, payload, label, labelFormatter }) => {
	const theme = useTheme();
	if (!active || !payload || !payload.length) return null;
	return (
		<Paper variant="outlined" style={{ padding: 8, fontSize: 13 }}>
			<div style={{ fontWeight: 600, marginBottom: 4 }}>
				{labelFormatter ? labelFormatter(label) : label}
			</div>
			{payload.map(item => (
				<div key={item.dataKey} style={{ display: "flex", alignItems: "center", gap: 6 }}>
					<span
						style={{
							width: 10,
							height: 10,
							borderRadius: 5,
							backgroundColor: item.color,
							display: "inline-block",
						}}
					/>
					<span style={{ color: theme.palette.text.secondary }}>{item.name}:</span>
					<span style={{ fontFamily: theme.typography.monoFontFamily }}>{item.value}</span>
				</div>
			))}
		</Paper>
	);
};

const DataTable = ({ columns, rows }) => (
	<Table size="small">
		<TableHead>
			<TableRow>
				{columns.map(column => (
					<TableCell key={column.key} align={column.align || "left"}>
						{column.label}
					</TableCell>
				))}
			</TableRow>
		</TableHead>
		<TableBody>
			{rows.map((row, index) => (
				<TableRow key={index}>
					{columns.map(column => (
						<TableCell key={column.key} align={column.align || "left"}>
							{column.render ? column.render(row) : row[column.key]}
						</TableCell>
					))}
				</TableRow>
			))}
		</TableBody>
	</Table>
);

const Reports = () => {
	const classes = useStyles();
	const theme = useTheme();

	const [filters, setFilters] = useState({
		from: format(subDays(new Date(), 29), "yyyy-MM-dd"),
		to: today(),
		queueId: "",
		userId: "",
	});
	const [report, setReport] = useState(null);
	const [queues, setQueues] = useState([]);
	const [users, setUsers] = useState([]);
	const [loading, setLoading] = useState(false);
	const [showTable, setShowTable] = useState(false);

	const params = useCallback(
		() => ({
			from: filters.from,
			to: filters.to,
			queueId: filters.queueId || undefined,
			userId: filters.userId || undefined,
		}),
		[filters]
	);

	const load = useCallback(async () => {
		setLoading(true);
		try {
			const { data } = await api.get("/reports", { params: params() });
			setReport(data);
		} catch (err) {
			toastError(err);
		}
		setLoading(false);
	}, [params]);

	useEffect(() => {
		void (async () => {
			try {
				const [{ data: queueData }, { data: userData }] = await Promise.all([
					api.get("/queue"),
					api.get("/users", { params: { pageNumber: 1 } }),
				]);
				setQueues(queueData);
				setUsers(userData.users);
			} catch (err) {
				toastError(err);
			}
		})();
	}, []);

	useEffect(() => {
		void load();
		// Reload only on demand after the first load.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const handleExport = async () => {
		try {
			const { data } = await api.get("/reports/tickets.csv", {
				params: params(),
				responseType: "blob",
			});
			const url = window.URL.createObjectURL(new Blob([data], { type: "text/csv" }));
			const link = document.createElement("a");
			link.href = url;
			link.download = `tickets-${filters.from}-a-${filters.to}.csv`;
			document.body.appendChild(link);
			link.click();
			link.remove();
			window.URL.revokeObjectURL(url);
		} catch (err) {
			toastError(err);
		}
	};

	const setFilter = name => e => setFilters(prev => ({ ...prev, [name]: e.target.value }));
	const dayLabel = day => format(parseISO(day), "dd/MM");
	const period = report
		? i18n.t("reports.source", {
				from: format(parseISO(report.range.from), "dd/MM/yyyy"),
				to: format(parseISO(report.range.to), "dd/MM/yyyy"),
				timezone: report.range.timezone,
			})
		: "";
	const noData = i18n.t("reports.cards.noData");
	const axisColor = theme.palette.text.secondary;
	const gridColor = theme.palette.divider;

	return (
		<MainContainer>
			<MainHeader>
				<Title>{i18n.t("reports.title")}</Title>
				<MainHeaderButtonsWrapper>
					<Button variant="outlined" startIcon={<GetAppOutlined />} onClick={handleExport}>
						{i18n.t("reports.export")}
					</Button>
				</MainHeaderButtonsWrapper>
			</MainHeader>
			<div className={classes.content}>
				<Paper variant="outlined" className={classes.filters}>
					<TextField
						id="report-from"
						type="date"
						label={i18n.t("reports.filters.from")}
						value={filters.from}
						onChange={setFilter("from")}
						variant="outlined"
						size="small"
						InputLabelProps={{ shrink: true }}
						className={classes.filterField}
					/>
					<TextField
						id="report-to"
						type="date"
						label={i18n.t("reports.filters.to")}
						value={filters.to}
						onChange={setFilter("to")}
						variant="outlined"
						size="small"
						InputLabelProps={{ shrink: true }}
						className={classes.filterField}
					/>
					<TextField
						id="report-queue"
						select
						label={i18n.t("reports.filters.queue")}
						value={filters.queueId}
						onChange={setFilter("queueId")}
						variant="outlined"
						size="small"
						className={classes.filterField}
					>
						<MenuItem value="">{i18n.t("reports.filters.all")}</MenuItem>
						{queues.map(queue => (
							<MenuItem key={queue.id} value={queue.id}>
								{queue.name}
							</MenuItem>
						))}
					</TextField>
					<TextField
						id="report-user"
						select
						label={i18n.t("reports.filters.user")}
						value={filters.userId}
						onChange={setFilter("userId")}
						variant="outlined"
						size="small"
						className={classes.filterField}
					>
						<MenuItem value="">{i18n.t("reports.filters.all")}</MenuItem>
						{users.map(user => (
							<MenuItem key={user.id} value={user.id}>
								{user.name}
							</MenuItem>
						))}
					</TextField>
					<Button variant="contained" color="primary" onClick={load} disabled={loading}>
						{i18n.t("reports.filters.apply")}
					</Button>
				</Paper>

				{report && (
					<>
						<Grid container spacing={2}>
							<Grid item xs={12} sm={6} md>
								<MetricCard
									label={i18n.t("reports.cards.created")}
									value={report.totals.created}
									period={period}
								/>
							</Grid>
							<Grid item xs={12} sm={6} md>
								<MetricCard
									label={i18n.t("reports.cards.closed")}
									value={report.totals.closed}
									period={period}
								/>
							</Grid>
							<Grid item xs={12} sm={6} md>
								<MetricCard
									label={i18n.t("reports.cards.firstResponse")}
									value={formatDuration(report.totals.avgFirstResponseSeconds)}
									emptyText={noData}
									period={period}
								/>
							</Grid>
							<Grid item xs={12} sm={6} md>
								<MetricCard
									label={i18n.t("reports.cards.resolution")}
									value={formatDuration(report.totals.avgResolutionSeconds)}
									emptyText={noData}
									period={period}
								/>
							</Grid>
							<Grid item xs={12} sm={6} md>
								<MetricCard
									label={i18n.t("reports.cards.csat")}
									value={formatRating(report.csat.average)}
									unit={report.csat.average !== null ? "/ 5" : null}
									detail={i18n.t("reports.cards.csatAnswers", {
										answered: report.csat.answered,
										sent: report.csat.sent,
									})}
									emptyText={noData}
									period={period}
								/>
							</Grid>
						</Grid>

						<Grid container spacing={2} style={{ marginTop: 8 }}>
							<Grid item xs={12} md={8}>
								<Paper variant="outlined" className={classes.panel}>
									<div className={classes.panelHeader}>
										<Typography variant="h6" component="h2">
											{i18n.t("reports.charts.byDay")}
										</Typography>
										<Button size="small" onClick={() => setShowTable(prev => !prev)}>
											{showTable ? i18n.t("reports.charts.showChart") : i18n.t("reports.charts.showTable")}
										</Button>
									</div>
									{showTable ? (
										<DataTable
											columns={[
												{ key: "day", label: i18n.t("reports.charts.day"), render: row => dayLabel(row.day) },
												{ key: "created", label: i18n.t("reports.charts.created"), align: "right" },
												{ key: "closed", label: i18n.t("reports.charts.closed"), align: "right" },
											]}
											rows={report.byDay}
										/>
									) : (
										<ResponsiveContainer width="100%" height={260}>
											<LineChart data={report.byDay} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
												<CartesianGrid stroke={gridColor} vertical={false} />
												<XAxis dataKey="day" tickFormatter={dayLabel} stroke={axisColor} tick={{ fontSize: 12 }} />
												<YAxis allowDecimals={false} stroke={axisColor} tick={{ fontSize: 12 }} />
												<Tooltip content={<ChartTooltip labelFormatter={dayLabel} />} />
												<Legend wrapperStyle={{ fontSize: 13, color: theme.palette.text.primary }} />
												<Line
													type="linear"
													dataKey="created"
													name={i18n.t("reports.charts.created")}
													stroke={SERIES.created}
													strokeWidth={2}
													dot={false}
													activeDot={{ r: 5, strokeWidth: 2, stroke: theme.palette.background.paper }}
												/>
												<Line
													type="linear"
													dataKey="closed"
													name={i18n.t("reports.charts.closed")}
													stroke={SERIES.closed}
													strokeWidth={2}
													dot={false}
													activeDot={{ r: 5, strokeWidth: 2, stroke: theme.palette.background.paper }}
												/>
											</LineChart>
										</ResponsiveContainer>
									)}
								</Paper>
							</Grid>
							<Grid item xs={12} md={4}>
								<Paper variant="outlined" className={classes.panel}>
									<div className={classes.panelHeader}>
										<Typography variant="h6" component="h2">
											{i18n.t("reports.charts.csat")}
										</Typography>
									</div>
									<ResponsiveContainer width="100%" height={260}>
										<BarChart
											data={[1, 2, 3, 4, 5].map(rating => ({
												rating: String(rating),
												total: report.csat.distribution[rating] || 0,
											}))}
											margin={{ top: 8, right: 8, left: -24, bottom: 0 }}
										>
											<CartesianGrid stroke={gridColor} vertical={false} />
											<XAxis dataKey="rating" stroke={axisColor} tick={{ fontSize: 12 }} />
											<YAxis allowDecimals={false} stroke={axisColor} tick={{ fontSize: 12 }} />
											<Tooltip content={<ChartTooltip labelFormatter={label => i18n.t("reports.charts.rating", { rating: label })} />} cursor={{ fill: gridColor }} />
											<Bar
												dataKey="total"
												name={i18n.t("reports.cards.csat")}
												fill={SERIES.created}
												maxBarSize={24}
												radius={[4, 4, 0, 0]}
											/>
										</BarChart>
									</ResponsiveContainer>
								</Paper>
							</Grid>
						</Grid>

						<Grid container spacing={2} style={{ marginTop: 8 }}>
							<Grid item xs={12} md={6}>
								<Paper variant="outlined" className={classes.panel}>
									<Typography variant="h6" component="h2" gutterBottom>
										{i18n.t("reports.tables.byQueue")}
									</Typography>
									<DataTable
										columns={[
											{
												key: "name",
												label: i18n.t("reports.tables.queue"),
												render: row => row.name || i18n.t("reports.tables.noQueue"),
											},
											{ key: "created", label: i18n.t("reports.tables.created"), align: "right" },
											{
												key: "first",
												label: i18n.t("reports.tables.firstResponse"),
												align: "right",
												render: row => formatDuration(row.avgFirstResponseSeconds) || "-",
											},
										]}
										rows={report.byQueue}
									/>
								</Paper>
							</Grid>
							<Grid item xs={12} md={6}>
								<Paper variant="outlined" className={classes.panel}>
									<Typography variant="h6" component="h2" gutterBottom>
										{i18n.t("reports.tables.byUser")}
									</Typography>
									<DataTable
										columns={[
											{
												key: "name",
												label: i18n.t("reports.tables.user"),
												render: row => row.name || i18n.t("reports.tables.noUser"),
											},
											{ key: "closed", label: i18n.t("reports.tables.closed"), align: "right" },
											{
												key: "resolution",
												label: i18n.t("reports.tables.resolution"),
												align: "right",
												render: row => formatDuration(row.avgResolutionSeconds) || "-",
											},
											{
												key: "rating",
												label: i18n.t("reports.tables.rating"),
												align: "right",
												render: row => formatRating(row.avgRating) || "-",
											},
										]}
										rows={report.byUser}
									/>
								</Paper>
							</Grid>
							<Grid item xs={12} md={6}>
								<Paper variant="outlined" className={classes.panel}>
									<Typography variant="h6" component="h2" gutterBottom>
										{i18n.t("reports.tables.byReason")}
									</Typography>
									<DataTable
										columns={[
											{
												key: "name",
												label: i18n.t("reports.tables.reason"),
												render: row => row.name || i18n.t("reports.tables.noReason"),
											},
											{ key: "closed", label: i18n.t("reports.tables.closed"), align: "right" },
										]}
										rows={report.byCloseReason}
									/>
								</Paper>
							</Grid>
						</Grid>
					</>
				)}
			</div>
		</MainContainer>
	);
};

export default Reports;
