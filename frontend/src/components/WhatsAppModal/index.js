import React, { useState, useEffect } from "react";
import * as Yup from "yup";
import { Formik, Form, Field } from "formik";
import { toast } from "react-toastify";

import { makeStyles } from 'tss-react/mui';
import { green } from "@mui/material/colors";

import {
	Dialog,
	DialogContent,
	DialogTitle,
	Button,
	DialogActions,
	CircularProgress,
	TextField,
	Switch,
	FormControlLabel,
	FormControl,
	FormLabel,
	Radio,
	RadioGroup,
	Alert,
	IconButton,
	InputAdornment,
	Typography,
	MenuItem,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";

import api from "../../services/api";
import { i18n } from "../../translate/i18n";
import toastError from "../../errors/toastError";
import QueueSelect from "../QueueSelect";
import { getBackendUrl } from "../../config";

const useStyles = makeStyles()(theme => ({
	root: {
		display: "flex",
		flexWrap: "wrap",
	},

	multFieldLine: {
		display: "flex",
		"& > *:not(:last-child)": {
			marginRight: theme.spacing(1),
		},
	},

	btnWrapper: {
		position: "relative",
	},

	cloudBox: {
		marginTop: theme.spacing(1),
		marginBottom: theme.spacing(1),
	},
	cloudNote: {
		marginTop: theme.spacing(1),
	},
	mono: {
		"& input": {
			fontFamily: theme.typography.monoFontFamily,
		},
	},
	buttonProgress: {
		color: green[500],
		position: "absolute",
		top: "50%",
		left: "50%",
		marginTop: -12,
		marginLeft: -12,
	},
}));

const SessionSchema = Yup.object().shape({
	name: Yup.string()
		.min(2, "Too Short!")
		.max(50, "Too Long!")
		.required("Required"),
});

const initialState = {
	name: "",
	greetingMessage: "",
	farewellMessage: "",
	isDefault: false,
	channel: "qrcode",
	flowId: "",
	cloud: { phoneNumberId: "", wabaId: "", accessToken: "", appSecret: "" },
};

const WhatsAppModal = ({ open, onClose, whatsAppId }) => {
	const { classes } = useStyles();
	const [whatsApp, setWhatsApp] = useState(initialState);
	// Webhook details of a saved Cloud API connection (admins only).
	const [cloudInfo, setCloudInfo] = useState(null);
	const [selectedQueueIds, setSelectedQueueIds] = useState([]);
	const [flows, setFlows] = useState([]);

	useEffect(() => {
		if (!open) return;
		api
			.get("/flows")
			.then(({ data }) => setFlows(data))
			.catch(() => setFlows([]));
	}, [open]);

	useEffect(() => {
		const fetchSession = async () => {
			if (!whatsAppId) return;

			try {
				const { data } = await api.get(`whatsapp/${whatsAppId}`);
				// Token and secret never come back: empty fields keep them.
				setWhatsApp({
					...initialState,
					...data,
					channel: data.channel || "qrcode",
					flowId: data.flowId || "",
					cloud: {
						...initialState.cloud,
						phoneNumberId: data.cloud?.phoneNumberId || "",
						wabaId: data.cloud?.wabaId || "",
					},
				});
				setCloudInfo(data.cloud || null);

				const whatsQueueIds = data.queues?.map(queue => queue.id);
				setSelectedQueueIds(whatsQueueIds);
			} catch (err) {
				toastError(err);
			}
		};
		void fetchSession();
	}, [whatsAppId]);

	const handleSaveWhatsApp = async values => {
		const { cloud, ...rest } = values;
		const whatsappData = { ...rest, flowId: rest.flowId || null, queueIds: selectedQueueIds };
		if (values.channel === "cloudapi") {
			whatsappData.cloud = Object.fromEntries(
				Object.entries(cloud).filter(([, value]) => String(value).trim())
			);
		}

		try {
			if (whatsAppId) {
				await api.put(`/whatsapp/${whatsAppId}`, whatsappData);
			} else {
				await api.post("/whatsapp", whatsappData);
			}
			toast.success(i18n.t("whatsappModal.success"));
			handleClose();
		} catch (err) {
			toastError(err);
		}
	};

	const handleClose = () => {
		onClose();
		setWhatsApp(initialState);
		setCloudInfo(null);
	};

	const copy = async text => {
		try {
			await navigator.clipboard.writeText(text);
			toast.success(i18n.t("whatsappModal.cloud.copied"));
		} catch {
			// The field stays selectable for a manual copy.
		}
	};

	const webhookUrl = whatsAppId ? `${getBackendUrl()}webhooks/whatsapp-cloud/${whatsAppId}` : "";

	const copyField = (id, label, value) => (
		<TextField
			id={id}
			label={label}
			value={value}
			variant="outlined"
			margin="dense"
			fullWidth
			className={classes.mono}
			InputProps={{
				readOnly: true,
				endAdornment: (
					<InputAdornment position="end">
						<IconButton aria-label={i18n.t("whatsappModal.cloud.copy", { label })} onClick={() => copy(value)} edge="end">
							<ContentCopyIcon fontSize="small" />
						</IconButton>
					</InputAdornment>
				),
			}}
		/>
	);

	return (
		<div className={classes.root}>
			<Dialog
				open={open}
				onClose={handleClose}
				maxWidth="sm"
				fullWidth
				scroll="paper"
			>
				<DialogTitle>
					{whatsAppId
						? i18n.t("whatsappModal.title.edit")
						: i18n.t("whatsappModal.title.add")}
				</DialogTitle>
				<Formik
					initialValues={whatsApp}
					enableReinitialize={true}
					validationSchema={SessionSchema}
					onSubmit={(values, actions) => {
						setTimeout(() => {
							void handleSaveWhatsApp(values);
							actions.setSubmitting(false);
						}, 400);
					}}
				>
					{({ values, touched, errors, isSubmitting, setFieldValue }) => (
						<Form>
							<DialogContent dividers>
								{whatsAppId ? (
									<Typography variant="body2" color="textSecondary" gutterBottom>
										{i18n.t("whatsappModal.channel.label")}: {i18n.t(`whatsappModal.channel.${values.channel}`)}
									</Typography>
								) : (
									<FormControl component="fieldset" margin="dense">
										<FormLabel component="legend">{i18n.t("whatsappModal.channel.label")}</FormLabel>
										<RadioGroup
											row
											name="channel"
											value={values.channel}
											onChange={e => setFieldValue("channel", e.target.value)}
										>
											<FormControlLabel value="qrcode" control={<Radio color="primary" />} label={i18n.t("whatsappModal.channel.qrcode")} />
											<FormControlLabel value="cloudapi" control={<Radio color="primary" />} label={i18n.t("whatsappModal.channel.cloudapi")} />
										</RadioGroup>
									</FormControl>
								)}
								<div className={classes.multFieldLine}>
									<Field
										as={TextField}
										label={i18n.t("whatsappModal.form.name")}
										autoFocus
										name="name"
										error={touched.name && Boolean(errors.name)}
										helperText={touched.name && errors.name}
										variant="outlined"
										margin="dense"
										className={classes.textField}
									/>
									<FormControlLabel
										control={
											<Field
												as={Switch}
												color="primary"
												name="isDefault"
												checked={values.isDefault}
											/>
										}
										label={i18n.t("whatsappModal.form.default")}
									/>
								</div>
								<div>
									<Field
										as={TextField}
										label={i18n.t("queueModal.form.greetingMessage")}
										type="greetingMessage"
										multiline
										rows={5}
										fullWidth
										name="greetingMessage"
										error={
											touched.greetingMessage && Boolean(errors.greetingMessage)
										}
										helperText={
											touched.greetingMessage && errors.greetingMessage
										}
										variant="outlined"
										margin="dense"
									/>
								</div>
								<div>
									<Field
										as={TextField}
										label={i18n.t("whatsappModal.form.farewellMessage")}
										type="farewellMessage"
										multiline
										rows={5}
										fullWidth
										name="farewellMessage"
										error={
											touched.farewellMessage && Boolean(errors.farewellMessage)
										}
										helperText={
											touched.farewellMessage && errors.farewellMessage
										}
										variant="outlined"
										margin="dense"
									/>
								</div>
								{values.channel === "cloudapi" && (
									<div className={classes.cloudBox}>
										<Alert severity="info">{i18n.t("whatsappModal.cloud.help")}</Alert>
										<div className={classes.multFieldLine}>
											<Field
												as={TextField}
												id="cloud-phone-number-id"
												label={i18n.t("whatsappModal.cloud.phoneNumberId")}
												name="cloud.phoneNumberId"
												variant="outlined"
												margin="dense"
												fullWidth
												required={!whatsAppId}
												className={classes.mono}
											/>
											<Field
												as={TextField}
												id="cloud-waba-id"
												label={i18n.t("whatsappModal.cloud.wabaId")}
												name="cloud.wabaId"
												variant="outlined"
												margin="dense"
												fullWidth
												required={!whatsAppId}
												className={classes.mono}
											/>
										</div>
										<Field
											as={TextField}
											id="cloud-access-token"
											type="password"
											autoComplete="off"
											label={i18n.t("whatsappModal.cloud.accessToken")}
											helperText={whatsAppId ? i18n.t("whatsappModal.cloud.keep") : i18n.t("whatsappModal.cloud.accessTokenHelp")}
											name="cloud.accessToken"
											variant="outlined"
											margin="dense"
											fullWidth
											required={!whatsAppId}
										/>
										<Field
											as={TextField}
											id="cloud-app-secret"
											type="password"
											autoComplete="off"
											label={i18n.t("whatsappModal.cloud.appSecret")}
											helperText={whatsAppId ? i18n.t("whatsappModal.cloud.keep") : i18n.t("whatsappModal.cloud.appSecretHelp")}
											name="cloud.appSecret"
											variant="outlined"
											margin="dense"
											fullWidth
											required={!whatsAppId}
										/>
										{cloudInfo ? (
											<>
												<Typography variant="body2" color="textSecondary" className={classes.cloudNote}>
													{i18n.t("whatsappModal.cloud.webhookHelp")}
												</Typography>
												{copyField("cloud-webhook-url", i18n.t("whatsappModal.cloud.webhookUrl"), webhookUrl)}
												{copyField("cloud-verify-token", i18n.t("whatsappModal.cloud.verifyToken"), cloudInfo.verifyToken)}
											</>
										) : (
											<Typography variant="body2" color="textSecondary" className={classes.cloudNote}>
												{i18n.t("whatsappModal.cloud.webhookAfterSave")}
											</Typography>
										)}
									</div>
								)}
								<QueueSelect
									selectedQueueIds={selectedQueueIds}
									onChange={selectedIds => setSelectedQueueIds(selectedIds)}
								/>
								<Field
									as={TextField}
									select
									fullWidth
									name="flowId"
									label={i18n.t("whatsappModal.form.flow")}
									helperText={i18n.t("whatsappModal.form.flowHelp")}
									variant="outlined"
									margin="dense"
								>
									<MenuItem value="">{i18n.t("whatsappModal.form.noFlow")}</MenuItem>
									{flows.map(flow => (
										<MenuItem key={flow.id} value={flow.id}>
											{flow.name}
										</MenuItem>
									))}
								</Field>
							</DialogContent>
							<DialogActions>
								<Button
									onClick={handleClose}
									color="secondary"
									disabled={isSubmitting}
									variant="outlined"
								>
									{i18n.t("whatsappModal.buttons.cancel")}
								</Button>
								<Button
									type="submit"
									color="primary"
									disabled={isSubmitting}
									variant="contained"
									className={classes.btnWrapper}
								>
									{whatsAppId
										? i18n.t("whatsappModal.buttons.okEdit")
										: i18n.t("whatsappModal.buttons.okAdd")}
									{isSubmitting && (
										<CircularProgress
											size={24}
											className={classes.buttonProgress}
										/>
									)}
								</Button>
							</DialogActions>
						</Form>
					)}
				</Formik>
			</Dialog>
		</div>
	);
};

export default React.memo(WhatsAppModal);
