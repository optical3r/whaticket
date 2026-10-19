import React, { useCallback, useState } from "react";

import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import ListSubheader from "@mui/material/ListSubheader";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Tooltip from "@mui/material/Tooltip";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import SpellcheckIcon from "@mui/icons-material/Spellcheck";
import WorkOutlineIcon from "@mui/icons-material/WorkOutline";
import SentimentSatisfiedOutlinedIcon from "@mui/icons-material/SentimentSatisfiedOutlined";
import ShortTextIcon from "@mui/icons-material/ShortText";
import SummarizeOutlinedIcon from "@mui/icons-material/SummarizeOutlined";

import AiSummaryDialog from "../AiSummaryDialog";
import useAiStatus, { clearAiStatus, isAiAvailable } from "../../hooks/useAiStatus";
import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import toastError from "../../errors/toastError";

const REWRITE_MODES = [
	{ mode: "improve", icon: <SpellcheckIcon fontSize="small" /> },
	{ mode: "formal", icon: <WorkOutlineIcon fontSize="small" /> },
	{ mode: "friendly", icon: <SentimentSatisfiedOutlinedIcon fontSize="small" /> },
	{ mode: "shorter", icon: <ShortTextIcon fontSize="small" /> },
];

// AI help for the agent while writing: suggest a reply, rewrite the draft
// or summarize the conversation. The agent always reviews before sending.
const AiAssistMenu = ({ ticketId, draft, onText, disabled, iconClassName }) => {
	const status = useAiStatus();
	const [anchorEl, setAnchorEl] = useState(null);
	const [working, setWorking] = useState(false);
	const [summaryOpen, setSummaryOpen] = useState(false);
	const closeSummary = useCallback(() => setSummaryOpen(false), []);

	if (!isAiAvailable(status)) return null;

	const run = async request => {
		setAnchorEl(null);
		setWorking(true);
		try {
			const { data } = await request();
			onText(data.text);
		} catch (err) {
			toastError(err);
		} finally {
			// Usage changed: the next screen reads the new numbers.
			clearAiStatus();
			setWorking(false);
		}
	};

	const suggest = () => run(() => api.post(`/tickets/${ticketId}/ai/suggestion`));

	const rewrite = mode => run(() => api.post("/ai/rewrite", { text: draft, mode }));

	const hasDraft = Boolean(draft && draft.trim());

	return (
		<>
			<Tooltip title={i18n.t("aiAssist.button")}>
				<span>
					<IconButton
						aria-label={i18n.t("aiAssist.button")}
						aria-haspopup="true"
						aria-controls={anchorEl ? "ai-assist-menu" : undefined}
						onClick={e => setAnchorEl(e.currentTarget)}
						disabled={disabled || working}
						size="large"
					>
						{working ? (
							<CircularProgress size={24} aria-label={i18n.t("aiAssist.working")} />
						) : (
							<AutoAwesomeOutlinedIcon className={iconClassName} />
						)}
					</IconButton>
				</span>
			</Tooltip>
			<Menu
				id="ai-assist-menu"
				anchorEl={anchorEl}
				open={Boolean(anchorEl)}
				onClose={() => setAnchorEl(null)}
				anchorOrigin={{ vertical: "top", horizontal: "left" }}
				transformOrigin={{ vertical: "bottom", horizontal: "left" }}
			>
				<MenuItem onClick={suggest}>
					<ListItemIcon>
						<ChatBubbleOutlineIcon fontSize="small" />
					</ListItemIcon>
					<ListItemText primary={i18n.t("aiAssist.suggest")} />
				</MenuItem>
				<MenuItem
					onClick={() => {
						setAnchorEl(null);
						setSummaryOpen(true);
					}}
				>
					<ListItemIcon>
						<SummarizeOutlinedIcon fontSize="small" />
					</ListItemIcon>
					<ListItemText primary={i18n.t("aiAssist.summarize")} />
				</MenuItem>
				<Divider />
				<ListSubheader disableSticky>
					{hasDraft ? i18n.t("aiAssist.rewriteTitle") : i18n.t("aiAssist.rewriteHint")}
				</ListSubheader>
				{REWRITE_MODES.map(({ mode, icon }) => (
					<MenuItem key={mode} onClick={() => rewrite(mode)} disabled={!hasDraft}>
						<ListItemIcon>{icon}</ListItemIcon>
						<ListItemText primary={i18n.t(`aiAssist.modes.${mode}`)} />
					</MenuItem>
				))}
			</Menu>
			<AiSummaryDialog
				open={summaryOpen}
				ticketId={ticketId}
				onClose={closeSummary}
			/>
		</>
	);
};

export default AiAssistMenu;
