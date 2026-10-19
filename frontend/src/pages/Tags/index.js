import React, { useState } from "react";
import { toast } from "react-toastify";

import {
	Button,
	Chip,
	IconButton,
	makeStyles,
	Paper,
	TableBody,
	TableCell,
	TableHead,
	TableRow,
	Typography,
} from "@material-ui/core";
import { DeleteOutline, Edit } from "@material-ui/icons";
import { useTheme } from "@material-ui/core/styles";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import ResponsiveTable from "../../components/ResponsiveTable";
import TableRowSkeleton from "../../components/TableRowSkeleton";
import Title from "../../components/Title";
import ConfirmationModal from "../../components/ConfirmationModal";
import TagModal from "../../components/TagModal";
import { tagChipStyle } from "../../components/TagChips";
import useTags from "../../hooks/useTags";
import { i18n } from "../../translate/i18n";
import toastError from "../../errors/toastError";
import api from "../../services/api";

const useStyles = makeStyles(theme => ({
	mainPaper: {
		flex: 1,
		padding: theme.spacing(1),
		overflowY: "scroll",
		...theme.scrollbarStyles,
	},
	empty: {
		padding: theme.spacing(3),
		textAlign: "center",
	},
	mono: {
		fontFamily: theme.typography.monoFontFamily,
	},
}));

const Tags = () => {
	const classes = useStyles();
	const theme = useTheme();
	// The list updates itself through the "tag" socket events.
	const { tags, loading } = useTags();
	const [modalOpen, setModalOpen] = useState(false);
	const [selected, setSelected] = useState(null);
	const [toDelete, setToDelete] = useState(null);

	const openModal = tag => {
		setSelected(tag);
		setModalOpen(true);
	};

	const handleDelete = async tag => {
		try {
			await api.delete(`/tags/${tag.id}`);
			toast.success(i18n.t("tags.toasts.deleted"));
		} catch (err) {
			toastError(err);
		}
	};

	return (
		<MainContainer>
			<ConfirmationModal
				title={toDelete && i18n.t("tags.confirmDelete.title", { name: toDelete.name })}
				open={Boolean(toDelete)}
				onClose={() => setToDelete(null)}
				onConfirm={() => handleDelete(toDelete)}
			>
				{i18n.t("tags.confirmDelete.message")}
			</ConfirmationModal>
			<TagModal open={modalOpen} onClose={() => setModalOpen(false)} tag={selected} />
			<MainHeader>
				<Title>{i18n.t("tags.title")}</Title>
				<MainHeaderButtonsWrapper>
					<Button variant="contained" color="primary" onClick={() => openModal(null)}>
						{i18n.t("tags.buttons.add")}
					</Button>
				</MainHeaderButtonsWrapper>
			</MainHeader>
			<Paper className={classes.mainPaper} variant="outlined">
				<ResponsiveTable>
					<TableHead>
						<TableRow>
							<TableCell align="center">{i18n.t("tags.table.name")}</TableCell>
							<TableCell align="center">{i18n.t("tags.table.color")}</TableCell>
							<TableCell align="center">{i18n.t("tags.table.actions")}</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{tags.map(tag => (
							<TableRow key={tag.id}>
								<TableCell align="center">
									<Chip size="small" label={tag.name} style={tagChipStyle(theme, tag.color)} />
								</TableCell>
								<TableCell align="center" className={classes.mono} data-label={i18n.t("tags.table.color")}>
									{tag.color}
								</TableCell>
								<TableCell align="center">
									<IconButton
										size="small"
										aria-label={i18n.t("tags.buttons.edit")}
										title={i18n.t("tags.buttons.edit")}
										onClick={() => openModal(tag)}
									>
										<Edit />
									</IconButton>
									<IconButton
										size="small"
										aria-label={i18n.t("tags.buttons.delete")}
										title={i18n.t("tags.buttons.delete")}
										onClick={() => setToDelete(tag)}
									>
										<DeleteOutline />
									</IconButton>
								</TableCell>
							</TableRow>
						))}
						{loading && <TableRowSkeleton columns={3} />}
					</TableBody>
				</ResponsiveTable>
				{!loading && tags.length === 0 && (
					<Typography className={classes.empty} color="textSecondary">
						{i18n.t("tags.empty")}
					</Typography>
				)}
			</Paper>
		</MainContainer>
	);
};

export default Tags;
