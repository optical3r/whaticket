import React, { useCallback, useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { toast } from "react-toastify";

import { makeStyles } from "tss-react/mui";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { DeleteOutline, Edit } from "@mui/icons-material";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import ResponsiveTable from "../../components/ResponsiveTable";
import TableRowSkeleton from "../../components/TableRowSkeleton";
import Title from "../../components/Title";
import ConfirmationModal from "../../components/ConfirmationModal";
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
	help: {
		padding: theme.spacing(1, 2, 2),
		color: theme.palette.text.secondary,
	},
	empty: {
		padding: theme.spacing(3),
		textAlign: "center",
		color: theme.palette.text.secondary,
	},
}));

const Flows = () => {
	const { classes } = useStyles();
	const history = useHistory();
	const [flows, setFlows] = useState([]);
	const [loading, setLoading] = useState(true);
	const [toDelete, setToDelete] = useState(null);

	const load = useCallback(async () => {
		try {
			const { data } = await api.get("/flows");
			setFlows(data);
		} catch (err) {
			toastError(err);
		}
		setLoading(false);
	}, []);

	useEffect(() => {
		void load();
	}, [load]);

	const remove = async flow => {
		try {
			await api.delete(`/flows/${flow.id}`);
			toast.success(i18n.t("flows.deleted"));
			await load();
		} catch (err) {
			toastError(err);
		}
	};

	return (
		<MainContainer>
			<ConfirmationModal
				title={toDelete ? i18n.t("flows.confirmDelete", { name: toDelete.name }) : ""}
				open={Boolean(toDelete)}
				onClose={() => setToDelete(null)}
				onConfirm={() => remove(toDelete)}
			>
				{i18n.t("flows.confirmDeleteMessage")}
			</ConfirmationModal>
			<MainHeader>
				<Title>{i18n.t("flows.title")}</Title>
				<MainHeaderButtonsWrapper>
					<Button variant="contained" color="primary" onClick={() => history.push("/flows/new")}>
						{i18n.t("flows.add")}
					</Button>
				</MainHeaderButtonsWrapper>
			</MainHeader>
			<Paper className={classes.mainPaper} variant="outlined">
				<Typography variant="body2" className={classes.help}>
					{i18n.t("flows.help")}
				</Typography>
				<ResponsiveTable>
					<TableHead>
						<TableRow>
							<TableCell>{i18n.t("flows.table.name")}</TableCell>
							<TableCell align="center">{i18n.t("flows.table.steps")}</TableCell>
							<TableCell>{i18n.t("flows.table.connections")}</TableCell>
							<TableCell>{i18n.t("flows.table.updatedAt")}</TableCell>
							<TableCell align="center">{i18n.t("flows.table.actions")}</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{flows.map(flow => (
							<TableRow key={flow.id}>
								<TableCell>{flow.name}</TableCell>
								<TableCell align="center" data-label={i18n.t("flows.table.steps")}>
									{flow.steps}
								</TableCell>
								<TableCell data-label={i18n.t("flows.table.connections")}>
									{flow.connections.length
										? flow.connections.map(connection => connection.name).join(", ")
										: i18n.t("flows.notInUse")}
								</TableCell>
								<TableCell data-label={i18n.t("flows.table.updatedAt")}>
									{format(parseISO(flow.updatedAt), "dd/MM/yyyy HH:mm")}
								</TableCell>
								<TableCell align="center">
									<IconButton
										size="small"
										aria-label={i18n.t("flows.edit")}
										onClick={() => history.push(`/flows/${flow.id}`)}
									>
										<Edit />
									</IconButton>
									<IconButton
										size="small"
										aria-label={i18n.t("flows.delete")}
										onClick={() => setToDelete(flow)}
									>
										<DeleteOutline />
									</IconButton>
								</TableCell>
							</TableRow>
						))}
						{loading && <TableRowSkeleton columns={5} />}
					</TableBody>
				</ResponsiveTable>
				{!loading && flows.length === 0 && (
					<Typography className={classes.empty}>{i18n.t("flows.empty")}</Typography>
				)}
			</Paper>
		</MainContainer>
	);
};

export default Flows;
