import React, { useCallback, useEffect, useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import { toast } from "react-toastify";

import { makeStyles } from "tss-react/mui";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import Paper from "@mui/material/Paper";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import AssessmentOutlinedIcon from "@mui/icons-material/AssessmentOutlined";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import DeleteOutline from "@mui/icons-material/DeleteOutline";
import Edit from "@mui/icons-material/Edit";
import PauseCircleOutlineIcon from "@mui/icons-material/PauseCircleOutline";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import SendOutlinedIcon from "@mui/icons-material/SendOutlined";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import ResponsiveTable from "../../components/ResponsiveTable";
import TableRowSkeleton from "../../components/TableRowSkeleton";
import Title from "../../components/Title";
import ConfirmationModal from "../../components/ConfirmationModal";
import CampaignModal from "../../components/CampaignModal";
import CampaignReportDialog from "../../components/CampaignReportDialog";
import openSocket from "../../services/socket-io";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { i18n } from "../../translate/i18n";

const useStyles = makeStyles()(theme => ({
	mainPaper: {
		flex: 1,
		padding: theme.spacing(1),
		overflowY: "auto",
		...theme.scrollbarStyles,
	},
	notice: {
		marginBottom: theme.spacing(1),
	},
	progressCell: {
		minWidth: 180,
	},
	progressText: {
		display: "flex",
		justifyContent: "space-between",
		gap: theme.spacing(1),
		marginBottom: theme.spacing(0.5),
		fontFamily: theme.typography.monoFontFamily,
		...theme.typography.caption,
	},
	status: {
		display: "inline-block",
		padding: theme.spacing(0.25, 1),
		borderRadius: theme.borderRadius.pill,
		backgroundColor: theme.palette.action.selected,
		...theme.typography.caption,
		fontWeight: 600,
	},
	statusError: {
		display: "block",
		marginTop: theme.spacing(0.5),
		color: theme.palette.text.secondary,
		...theme.typography.caption,
	},
	empty: {
		padding: theme.spacing(3),
		textAlign: "center",
		color: theme.palette.text.secondary,
	},
}));

const Campaigns = () => {
	const { classes } = useStyles();
	const [campaigns, setCampaigns] = useState([]);
	const [loading, setLoading] = useState(true);
	const [planAllows, setPlanAllows] = useState(true);
	const [modal, setModal] = useState({ open: false, campaign: null });
	const [confirm, setConfirm] = useState(null);
	const [report, setReport] = useState(null);
	const refreshTimer = useRef(null);

	const load = useCallback(async () => {
		try {
			const [{ data }, { data: company }] = await Promise.all([
				api.get("/campaigns"),
				api.get("/company"),
			]);
			setCampaigns(data);
			setPlanAllows(Boolean(company.plan?.campaignsEnabled));
		} catch (err) {
			toastError(err);
		}
		setLoading(false);
	}, []);

	useEffect(() => {
		void load();
		const socket = openSocket();
		socket.on("campaign", () => {
			clearTimeout(refreshTimer.current);
			refreshTimer.current = setTimeout(load, 800);
		});
		return () => {
			clearTimeout(refreshTimer.current);
			socket.disconnect();
		};
	}, [load]);

	const run = async (campaign, action) => {
		try {
			if (action === "delete") {
				await api.delete(`/campaigns/${campaign.id}`);
			} else {
				await api.post(`/campaigns/${campaign.id}/${action}`);
			}
			toast.success(i18n.t(`campaigns.toasts.${action}`));
			await load();
		} catch (err) {
			toastError(err);
		}
	};

	const ask = (campaign, action) => setConfirm({ campaign, action });

	const statusError = campaign =>
		campaign.lastError && i18n.exists(`backendErrors.${campaign.lastError}`)
			? i18n.t(`backendErrors.${campaign.lastError}`)
			: campaign.lastError;

	const action = (title, icon, onClick) => (
		<Tooltip title={title}>
			<IconButton size="small" aria-label={title} onClick={onClick}>
				{icon}
			</IconButton>
		</Tooltip>
	);

	return (
		<MainContainer>
			<CampaignModal
				open={modal.open}
				campaign={modal.campaign}
				onClose={() => {
					setModal({ open: false, campaign: null });
					void load();
				}}
			/>
			<CampaignReportDialog campaign={report} onClose={() => setReport(null)} />
			<ConfirmationModal
				title={
					confirm
						? i18n.t(`campaigns.confirm.${confirm.action}.title`, { name: confirm.campaign.name })
						: ""
				}
				open={Boolean(confirm)}
				onClose={() => setConfirm(null)}
				onConfirm={() => run(confirm.campaign, confirm.action)}
			>
				{confirm ? i18n.t(`campaigns.confirm.${confirm.action}.message`) : ""}
			</ConfirmationModal>

			<MainHeader>
				<Title>{i18n.t("campaigns.title")}</Title>
				<MainHeaderButtonsWrapper>
					<Button
						variant="contained"
						color="primary"
						disabled={!planAllows}
						onClick={() => setModal({ open: true, campaign: null })}
					>
						{i18n.t("campaigns.add")}
					</Button>
				</MainHeaderButtonsWrapper>
			</MainHeader>

			{!planAllows && !loading && (
				<Alert severity="info" className={classes.notice}>
					{i18n.t("campaigns.notInPlan")}
				</Alert>
			)}
			<Alert severity="warning" className={classes.notice}>
				{i18n.t("campaigns.risk")}
			</Alert>

			<Paper className={classes.mainPaper} variant="outlined">
				<ResponsiveTable>
					<TableHead>
						<TableRow>
							<TableCell>{i18n.t("campaigns.table.name")}</TableCell>
							<TableCell>{i18n.t("campaigns.table.status")}</TableCell>
							<TableCell>{i18n.t("campaigns.table.connection")}</TableCell>
							<TableCell>{i18n.t("campaigns.table.progress")}</TableCell>
							<TableCell>{i18n.t("campaigns.table.schedule")}</TableCell>
							<TableCell align="center">{i18n.t("campaigns.table.actions")}</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{campaigns.map(campaign => {
							const { total, sent, failed, skipped } = campaign.counts;
							const done = sent + failed + skipped;
							return (
								<TableRow key={campaign.id}>
									<TableCell>{campaign.name}</TableCell>
									<TableCell data-label={i18n.t("campaigns.table.status")}>
										<span className={classes.status}>{i18n.t(`campaigns.status.${campaign.status}`)}</span>
										{campaign.lastError && (
											<span className={classes.statusError}>{statusError(campaign)}</span>
										)}
									</TableCell>
									<TableCell data-label={i18n.t("campaigns.table.connection")}>
										{campaign.whatsapp?.name || "-"}
									</TableCell>
									<TableCell className={classes.progressCell} data-label={i18n.t("campaigns.table.progress")}>
										{total > 0 ? (
											<>
												<div className={classes.progressText}>
													<span>
														{i18n.t("campaigns.progress", { done, total })}
													</span>
													<span>{i18n.t("campaigns.failures", { count: failed })}</span>
												</div>
												<LinearProgress
													variant="determinate"
													value={(done / total) * 100}
													aria-label={i18n.t("campaigns.progress", { done, total })}
												/>
											</>
										) : (
											"-"
										)}
									</TableCell>
									<TableCell data-label={i18n.t("campaigns.table.schedule")}>
										{campaign.scheduledAt
											? format(parseISO(campaign.scheduledAt), "dd/MM/yyyy HH:mm")
											: i18n.t("campaigns.now")}
										<Typography variant="caption" display="block" color="textSecondary">
											{i18n.t("campaigns.window", { start: campaign.windowStart, end: campaign.windowEnd })}
										</Typography>
									</TableCell>
									<TableCell align="center">
										{campaign.status === "draft" &&
											action(i18n.t("campaigns.actions.edit"), <Edit />, () =>
												setModal({ open: true, campaign })
											)}
										{campaign.status === "draft" &&
											action(i18n.t("campaigns.actions.start"), <SendOutlinedIcon />, () =>
												ask(campaign, "start")
											)}
										{["scheduled", "running"].includes(campaign.status) &&
											action(i18n.t("campaigns.actions.pause"), <PauseCircleOutlineIcon />, () =>
												run(campaign, "pause")
											)}
										{campaign.status === "paused" &&
											action(i18n.t("campaigns.actions.resume"), <PlayCircleOutlineIcon />, () =>
												run(campaign, "resume")
											)}
										{total > 0 &&
											action(i18n.t("campaigns.actions.report"), <AssessmentOutlinedIcon />, () =>
												setReport(campaign)
											)}
										{!["finished", "cancelled", "draft"].includes(campaign.status) &&
											action(i18n.t("campaigns.actions.cancel"), <CancelOutlinedIcon />, () =>
												ask(campaign, "cancel")
											)}
										{campaign.status !== "running" &&
											action(i18n.t("campaigns.actions.delete"), <DeleteOutline />, () =>
												ask(campaign, "delete")
											)}
									</TableCell>
								</TableRow>
							);
						})}
						{loading && <TableRowSkeleton columns={6} />}
					</TableBody>
				</ResponsiveTable>
				{!loading && campaigns.length === 0 && (
					<Typography className={classes.empty}>{i18n.t("campaigns.empty")}</Typography>
				)}
			</Paper>
		</MainContainer>
	);
};

export default Campaigns;
