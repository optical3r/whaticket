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
	Link,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";

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
	coexyActions: {
		display: "flex",
		flexWrap: "wrap",
		gap: theme.spacing(1),
		marginTop: theme.spacing(1),
		marginBottom: theme.spacing(1),
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
	// Plans can leave QR code out and offer only the official API.
	const [qrcodeAllowed, setQrcodeAllowed] = useState(true);
	// Guided connection through Coexy: whether the plan allows one more.
	const [coexy, setCoexy] = useState({ allowed: false });
	const [checking, setChecking] = useState(false);

	useEffect(() => {
		if (!open) return;
		api
			.get("/flows")
			.then(({ data }) => setFlows(data))
			.catch(() => setFlows([]));
		api
			.get("/company")
			.then(({ data }) => {
				const allowed = data.plan?.qrcodeEnabled !== false;
				setQrcodeAllowed(allowed);
				setCoexy(data.coexy || { allowed: false });
				if (!allowed && !whatsAppId) {
					setWhatsApp(previous => ({
						...previous,
						channel: data.coexy?.allowed ? "coexy" : "cloudapi",
					}));
				}
			})
			.catch(() => setQrcodeAllowed(true));
	}, [open, whatsAppId]);

	useEffect(() => {
		const fetchSession = async () => {
			if (!whatsAppId) return;

			try {
				const { data } = await api.get(`whatsapp/${whatsAppId}`);
				// Token and secret never come back: empty fields keep them.
				setWhatsApp({
					...initialState,
					...data,
					// "coexy" is a form value only: the connection is an official
					// API one whose number is connected through Coexy.
					channel: data.cloud?.provider === "coexy" ? "coexy" : data.channel || "qrcode",
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
		delete whatsappData.cloudProvider;
		if (values.channel === "coexy") {
			whatsappData.channel = "cloudapi";
			if (!whatsAppId) whatsappData.cloud = { provider: "coexy" };
		} else if (values.channel === "cloudapi") {
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
			toast.success(
				values.channel === "coexy" && !whatsAppId
					? i18n.t("whatsappModal.coexy.created")
					: i18n.t("whatsappModal.success")
			);
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

	// After opening the link: reads the channel now (and keeps checking it).
	const checkCoexy = async () => {
		setChecking(true);
		try {
			const { data } = await api.post(`/whatsapp/${whatsAppId}/coexy/sync`);
			setCloudInfo(data.cloud);
			toast.info(i18n.t(`whatsappModal.coexy.status.${data.cloud?.coexyStatus || "pending"}`));
		} catch (err) {
			toastError(err);
		}
		setChecking(false);
	};

	const openConnectLink = () => {
		window.open(cloudInfo.connectUrl, "_blank", "noopener,noreferrer");
		// Checks often for a while, so the connection shows up soon after.
		api.post(`/whatsapp/${whatsAppId}/coexy/sync`).catch(() => undefined);
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
											{qrcodeAllowed && (
												<FormControlLabel value="qrcode" control={<Radio color="primary" />} label={i18n.t("whatsappModal.channel.qrcode")} />
											)}
											<FormControlLabel
												value="coexy"
												disabled={!coexy.allowed}
												control={<Radio color="primary" />}
												label={i18n.t("whatsappModal.channel.coexy")}
											/>
											<FormControlLabel value="cloudapi" control={<Radio color="primary" />} label={i18n.t("whatsappModal.channel.cloudapi")} />
										</RadioGroup>
										{!coexy.allowed && coexy.reason && (
											<Typography variant="body2" color="textSecondary">
												{i18n.t(`whatsappModal.coexy.unavailable.${coexy.reason}`, {
													max: coexy.max,
												})}
											</Typography>
										)}
										{!qrcodeAllowed && (
											<Typography variant="body2" color="textSecondary">
												{i18n.t("whatsappModal.channel.qrcodeNotInPlan")}
											</Typography>
										)}
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
								{values.channel === "coexy" && !whatsAppId && (
									<div className={classes.cloudBox}>
										<Alert severity="info">{i18n.t("whatsappModal.coexy.help")}</Alert>
									</div>
								)}
								{values.channel === "coexy" && whatsAppId && cloudInfo && (
									<div className={classes.cloudBox}>
										<Alert
											severity={
												cloudInfo.coexyStatus === "active"
													? "success"
													: cloudInfo.coexyStatus === "pending"
													? "info"
													: "warning"
											}
										>
											{i18n.t(`whatsappModal.coexy.status.${cloudInfo.coexyStatus || "pending"}`)}
											{cloudInfo.displayPhoneNumber ? ` ${cloudInfo.displayPhoneNumber}` : ""}
										</Alert>
										{cloudInfo.coexyStatus !== "active" && (
											<Typography variant="body2" color="textSecondary" className={classes.cloudNote}>
												{i18n.t("whatsappModal.coexy.connectHelp")}
											</Typography>
										)}
										<div className={classes.coexyActions}>
											{cloudInfo.coexyStatus !== "active" && cloudInfo.connectUrl && (
												<Button
													variant="contained"
													color="primary"
													endIcon={<OpenInNewIcon />}
													onClick={openConnectLink}
												>
													{cloudInfo.coexyStatus === "pending"
														? i18n.t("whatsappModal.coexy.connect")
														: i18n.t("whatsappModal.coexy.reconnect")}
												</Button>
											)}
											<Button variant="outlined" onClick={checkCoexy} disabled={checking}>
												{i18n.t("whatsappModal.coexy.check")}
											</Button>
										</div>
										{cloudInfo.coexyStatus !== "active" &&
											cloudInfo.connectUrl &&
											copyField("coexy-connect-url", i18n.t("whatsappModal.coexy.link"), cloudInfo.connectUrl)}
										{cloudInfo.verification && (
											<>
												<Typography variant="subtitle2" component="h3" className={classes.cloudNote}>
													{i18n.t("whatsappModal.coexy.verificationTitle")}
												</Typography>
												<Typography variant="body2" color="textSecondary">
													{i18n.t(`whatsappModal.coexy.verification.${cloudInfo.verification.status}`)}
												</Typography>
												{cloudInfo.verification.rejectionReasons?.length > 0 && (
													<Typography variant="body2" color="textSecondary">
														{cloudInfo.verification.rejectionReasons.join(" ")}
													</Typography>
												)}
												{cloudInfo.verification.status !== "verified" &&
													cloudInfo.verification.status !== "pending" &&
													cloudInfo.verification.url && (
														<Typography variant="body2" className={classes.cloudNote}>
															<Link href={cloudInfo.verification.url} target="_blank" rel="noopener noreferrer">
																{i18n.t("whatsappModal.coexy.verify", {
																	left: Math.max(
																		cloudInfo.verification.maxAttempts - cloudInfo.verification.attempts,
																		0
																	),
																})}
															</Link>
														</Typography>
													)}
											</>
										)}
									</div>
								)}
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
