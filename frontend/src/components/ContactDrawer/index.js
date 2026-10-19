import React, { useState } from "react";

import { makeStyles } from "@material-ui/core/styles";
import Typography from "@material-ui/core/Typography";
import IconButton from "@material-ui/core/IconButton";
import CloseIcon from "@material-ui/icons/Close";
import Drawer from "@material-ui/core/Drawer";
import Link from "@material-ui/core/Link";
import InputLabel from "@material-ui/core/InputLabel";
import Avatar from "@material-ui/core/Avatar";
import Button from "@material-ui/core/Button";
import Paper from "@material-ui/core/Paper";

import { i18n } from "../../translate/i18n";

import ContactModal from "../ContactModal";
import TagSelector from "../TagSelector";
import TicketNotes from "../TicketNotes";
import ContactDrawerSkeleton from "../ContactDrawerSkeleton";
import MarkdownWrapper from "../MarkdownWrapper";

const drawerWidth = 320;

const useStyles = makeStyles(theme => ({
	drawer: {
		width: drawerWidth,
		flexShrink: 0,
	},
	drawerPaper: {
		width: drawerWidth,
		display: "flex",
		border: theme.border.divider,
		borderRadius: theme.borderRadius.medium,
	},
	header: {
		display: "flex",
		borderBottom: theme.border.divider,
		backgroundColor: theme.palette.action.selected,
		alignItems: "center",
		padding: theme.spacing(0, 1),
		minHeight: "73px",
		justifyContent: "flex-start",
	},
	content: {
		display: "flex",
		flexDirection: "column",
		padding: "8px 0px 8px 8px",
		height: "100%",
		overflowY: "scroll",
		...theme.scrollbarStyles,
	},

	contactAvatar: {
		margin: 15,
		width: 160,
		height: 160,
	},

	contactHeader: {
		display: "flex",
		padding: 8,
		flexDirection: "column",
		alignItems: "center",
		justifyContent: "center",
		"& > *": {
			margin: 4,
		},
	},

	contactDetails: {
		marginTop: 8,
		padding: 8,
		display: "flex",
		flexDirection: "column",
	},
	tagSelector: {
		margin: theme.spacing(1, 0),
	},
	contactExtraInfo: {
		marginTop: 4,
		padding: 6,
	},
}));

const ContactDrawer = ({
	open,
	handleDrawerClose,
	contact,
	ticket,
	loading,
	onTicketTagsChange,
	onContactTagsChange,
}) => {
	const classes = useStyles();

	const [modalOpen, setModalOpen] = useState(false);

	return (
		<Drawer
			className={classes.drawer}
			variant="persistent"
			anchor="right"
			open={open}
			PaperProps={{ style: { position: "absolute" } }}
			BackdropProps={{ style: { position: "absolute" } }}
			ModalProps={{
				container: document.getElementById("drawer-container"),
				style: { position: "absolute" },
			}}
			classes={{
				paper: classes.drawerPaper,
			}}
		>
			<div className={classes.header}>
				<IconButton onClick={handleDrawerClose}>
					<CloseIcon />
				</IconButton>
				<Typography style={{ justifySelf: "center" }}>
					{i18n.t("contactDrawer.header")}
				</Typography>
			</div>
			{loading ? (
				<ContactDrawerSkeleton classes={classes} />
			) : (
				<div className={classes.content}>
					<Paper square variant="outlined" className={classes.contactHeader}>
						<Avatar
							alt={contact.name}
							src={contact.profilePicUrl}
							className={classes.contactAvatar}
						></Avatar>

						<Typography>{contact.name}</Typography>
						<Typography>
							<Link href={`tel:${contact.number}`}>{contact.number}</Link>
						</Typography>
						<Button
							variant="outlined"
							color="primary"
							onClick={() => setModalOpen(true)}
						>
							{i18n.t("contactDrawer.buttons.edit")}
						</Button>
					</Paper>
					<Paper square variant="outlined" className={classes.contactDetails}>
						<ContactModal
							open={modalOpen}
							onClose={() => setModalOpen(false)}
							contactId={contact.id}
						></ContactModal>
						<Typography variant="subtitle1">
							{i18n.t("contactDrawer.extraInfo")}
						</Typography>
						{contact?.extraInfo?.map(info => (
							<Paper
								key={info.id}
								square
								variant="outlined"
								className={classes.contactExtraInfo}
							>
								<InputLabel>{info.name}</InputLabel>
								<Typography component="div" noWrap style={{ paddingTop: 2 }}>
									<MarkdownWrapper>{info.value}</MarkdownWrapper>
								</Typography>
							</Paper>
						))}
					</Paper>
					{ticket?.id && (
						<Paper square variant="outlined" className={classes.contactDetails}>
							<div className={classes.tagSelector}>
								<TagSelector
									id="ticket-tags"
									label={i18n.t("tagSelector.ticketTags")}
									endpoint={`/tickets/${ticket.id}/tags`}
									value={ticket.tags || []}
									onChange={onTicketTagsChange}
								/>
							</div>
							<div className={classes.tagSelector}>
								<TagSelector
									id="contact-tags"
									label={i18n.t("tagSelector.contactTags")}
									endpoint={`/contacts/${contact.id}/tags`}
									value={contact.tags || []}
									onChange={onContactTagsChange}
								/>
							</div>
						</Paper>
					)}
					{ticket?.id && (
						<Paper square variant="outlined" className={classes.contactDetails}>
							<TicketNotes ticketId={ticket.id} />
						</Paper>
					)}
				</div>
			)}
		</Drawer>
	);
};

export default ContactDrawer;
