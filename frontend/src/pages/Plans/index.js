import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";

import {
	Button,
	IconButton,
	makeStyles,
	Paper,
	TableBody,
	TableCell,
	TableHead,
	TableRow,
} from "@material-ui/core";
import { DeleteOutline, Edit } from "@material-ui/icons";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import TableRowSkeleton from "../../components/TableRowSkeleton";
import ResponsiveTable from "../../components/ResponsiveTable";
import Title from "../../components/Title";
import ConfirmationModal from "../../components/ConfirmationModal";
import PlanModal from "../../components/PlanModal";
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
	mono: {
		fontFamily: theme.typography.monoFontFamily,
	},
}));

const limitColumns = ["users", "connections", "queues"];

const Plans = () => {
	const classes = useStyles();

	const [plans, setPlans] = useState([]);
	const [loading, setLoading] = useState(true);
	const [modalOpen, setModalOpen] = useState(false);
	const [selected, setSelected] = useState(null);
	const [toDelete, setToDelete] = useState(null);

	const load = async () => {
		setLoading(true);
		try {
			const { data } = await api.get("/plans");
			setPlans(data);
		} catch (err) {
			toastError(err);
		}
		setLoading(false);
	};

	useEffect(() => {
		void load();
	}, []);

	const openModal = plan => {
		setSelected(plan);
		setModalOpen(true);
	};

	const handleDelete = async plan => {
		try {
			await api.delete(`/plans/${plan.id}`);
			toast.success(i18n.t("plans.toasts.deleted"));
			await load();
		} catch (err) {
			toastError(err);
		}
	};

	return (
		<MainContainer>
			<ConfirmationModal
				title={toDelete && i18n.t("plans.confirmDelete.title", { name: toDelete.name })}
				open={Boolean(toDelete)}
				onClose={() => setToDelete(null)}
				onConfirm={() => handleDelete(toDelete)}
			>
				{i18n.t("plans.confirmDelete.message")}
			</ConfirmationModal>
			<PlanModal
				open={modalOpen}
				onClose={() => setModalOpen(false)}
				plan={selected}
				onSaved={() => void load()}
			/>
			<MainHeader>
				<Title>{i18n.t("plans.title")}</Title>
				<MainHeaderButtonsWrapper>
					<Button variant="contained" color="primary" onClick={() => openModal(null)}>
						{i18n.t("plans.buttons.add")}
					</Button>
				</MainHeaderButtonsWrapper>
			</MainHeader>
			<Paper className={classes.mainPaper} variant="outlined">
				<ResponsiveTable>
					<TableHead>
						<TableRow>
							{["name", ...limitColumns, "actions"].map(column => (
								<TableCell key={column} align="center">
									{i18n.t(`plans.table.${column}`)}
								</TableCell>
							))}
						</TableRow>
					</TableHead>
					<TableBody>
						{plans.map(plan => (
							<TableRow key={plan.id}>
								<TableCell align="center">{plan.name}</TableCell>
								{limitColumns.map(column => (
									<TableCell
										key={column}
										align="center"
										className={classes.mono}
										data-label={i18n.t(`plans.table.${column}`)}
									>
										{plan[column]}
									</TableCell>
								))}
								<TableCell align="center">
									<IconButton
										size="small"
										aria-label={i18n.t("plans.buttons.edit")}
										title={i18n.t("plans.buttons.edit")}
										onClick={() => openModal(plan)}
									>
										<Edit />
									</IconButton>
									<IconButton
										size="small"
										aria-label={i18n.t("plans.buttons.delete")}
										title={i18n.t("plans.buttons.delete")}
										onClick={() => setToDelete(plan)}
									>
										<DeleteOutline />
									</IconButton>
								</TableCell>
							</TableRow>
						))}
						{loading && <TableRowSkeleton columns={5} />}
					</TableBody>
				</ResponsiveTable>
			</Paper>
		</MainContainer>
	);
};

export default Plans;
