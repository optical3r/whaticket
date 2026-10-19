import React, { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
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
} from "@material-ui/core";
import { Edit, PauseCircleOutline, PlayCircleOutline } from "@material-ui/icons";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import TableRowSkeleton from "../../components/TableRowSkeleton";
import ResponsiveTable from "../../components/ResponsiveTable";
import Title from "../../components/Title";
import ConfirmationModal from "../../components/ConfirmationModal";
import CompanyModal from "../../components/CompanyModal";
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
	statusActive: {
		backgroundColor: theme.palette.success.main,
		color: theme.palette.getContrastText(theme.palette.success.main),
	},
	statusSuspended: {
		backgroundColor: theme.palette.warning.main,
		color: theme.palette.getContrastText(theme.palette.warning.main),
	},
}));

const Companies = () => {
	const classes = useStyles();

	const [companies, setCompanies] = useState([]);
	const [plans, setPlans] = useState([]);
	const [loading, setLoading] = useState(true);
	const [modalOpen, setModalOpen] = useState(false);
	const [selected, setSelected] = useState(null);
	const [toSuspend, setToSuspend] = useState(null);

	const load = async () => {
		setLoading(true);
		try {
			const [{ data: companiesData }, { data: plansData }] = await Promise.all([
				api.get("/companies"),
				api.get("/plans"),
			]);
			setCompanies(companiesData);
			setPlans(plansData);
		} catch (err) {
			toastError(err);
		}
		setLoading(false);
	};

	useEffect(() => {
		void load();
	}, []);

	const openModal = company => {
		setSelected(company);
		setModalOpen(true);
	};

	const changeStatus = async (company, status) => {
		try {
			await api.put(`/companies/${company.id}`, { status });
			toast.success(
				i18n.t(
					status === "suspended"
						? "companies.toasts.suspended"
						: "companies.toasts.reactivated"
				)
			);
			await load();
		} catch (err) {
			toastError(err);
		}
	};

	return (
		<MainContainer>
			<ConfirmationModal
				title={
					toSuspend &&
					i18n.t("companies.confirmSuspend.title", { name: toSuspend.name })
				}
				open={Boolean(toSuspend)}
				onClose={() => setToSuspend(null)}
				onConfirm={() => changeStatus(toSuspend, "suspended")}
			>
				{i18n.t("companies.confirmSuspend.message")}
			</ConfirmationModal>
			<CompanyModal
				open={modalOpen}
				onClose={() => setModalOpen(false)}
				company={selected}
				plans={plans}
				onSaved={() => void load()}
			/>
			<MainHeader>
				<Title>{i18n.t("companies.title")}</Title>
				<MainHeaderButtonsWrapper>
					<Button
						variant="contained"
						color="primary"
						onClick={() => openModal(null)}
					>
						{i18n.t("companies.buttons.add")}
					</Button>
				</MainHeaderButtonsWrapper>
			</MainHeader>
			<Paper className={classes.mainPaper} variant="outlined">
				<ResponsiveTable>
					<TableHead>
						<TableRow>
							{["name", "plan", "status", "users", "connections", "createdAt", "actions"].map(
								column => (
									<TableCell key={column} align="center">
										{i18n.t(`companies.table.${column}`)}
									</TableCell>
								)
							)}
						</TableRow>
					</TableHead>
					<TableBody>
						{companies.map(company => (
							<TableRow key={company.id}>
								<TableCell align="center">{company.name}</TableCell>
								<TableCell align="center" data-label={i18n.t("companies.table.plan")}>
									{company.plan?.name}
								</TableCell>
								<TableCell align="center" data-label={i18n.t("companies.table.status")}>
									<Chip
										size="small"
										label={i18n.t(`companies.status.${company.status}`)}
										className={
											company.status === "active"
												? classes.statusActive
												: classes.statusSuspended
										}
									/>
								</TableCell>
								<TableCell
									align="center"
									className={classes.mono}
									data-label={i18n.t("companies.table.users")}
								>
									{company.usage.users}/{company.plan?.users}
								</TableCell>
								<TableCell
									align="center"
									className={classes.mono}
									data-label={i18n.t("companies.table.connections")}
								>
									{company.usage.connections}/{company.plan?.connections}
								</TableCell>
								<TableCell align="center" data-label={i18n.t("companies.table.createdAt")}>
									{format(parseISO(company.createdAt), "dd/MM/yyyy")}
								</TableCell>
								<TableCell align="center">
									<IconButton
										size="small"
										aria-label={i18n.t("companies.buttons.edit")}
										title={i18n.t("companies.buttons.edit")}
										onClick={() => openModal(company)}
									>
										<Edit />
									</IconButton>
									{company.status === "active" ? (
										<IconButton
											size="small"
											aria-label={i18n.t("companies.buttons.suspend")}
											title={i18n.t("companies.buttons.suspend")}
											onClick={() => setToSuspend(company)}
										>
											<PauseCircleOutline />
										</IconButton>
									) : (
										<IconButton
											size="small"
											aria-label={i18n.t("companies.buttons.reactivate")}
											title={i18n.t("companies.buttons.reactivate")}
											onClick={() => changeStatus(company, "active")}
										>
											<PlayCircleOutline />
										</IconButton>
									)}
								</TableCell>
							</TableRow>
						))}
						{loading && <TableRowSkeleton columns={7} />}
					</TableBody>
				</ResponsiveTable>
			</Paper>
		</MainContainer>
	);
};

export default Companies;
