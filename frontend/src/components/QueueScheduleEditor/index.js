import React from "react";

import { makeStyles } from 'tss-react/mui';
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

import { i18n } from "../../translate/i18n";

const useStyles = makeStyles()(theme => ({
	row: {
		display: "grid",
		gridTemplateColumns: "minmax(110px, 1fr) auto 150px 150px",
		alignItems: "center",
		gap: theme.spacing(1),
		[theme.breakpoints.down('sm')]: {
			gridTemplateColumns: "1fr auto",
		},
	},
	help: {
		color: theme.palette.text.secondary,
		marginBottom: theme.spacing(1),
	},
}));

// Monday first, as people read a work week.
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export const defaultSchedules = () =>
	WEEK_ORDER.map(weekday => ({
		weekday,
		enabled: weekday >= 1 && weekday <= 5,
		start: "08:00",
		end: "18:00",
	}));

const QueueScheduleEditor = ({ value = [], onChange }) => {
	const { classes } = useStyles();
	const active = value.length > 0;

	const update = (weekday, changes) =>
		onChange(
			value.map(item => (item.weekday === weekday ? { ...item, ...changes } : item))
		);

	return (
		<div>
			<Typography variant="subtitle1" component="h3">
				{i18n.t("queueModal.hours.section")}
			</Typography>
			<Typography variant="body2" className={classes.help}>
				{i18n.t("queueModal.hours.help")}
			</Typography>
			<FormControlLabel
				control={
					<Checkbox
						color="primary"
						checked={active}
						onChange={e => onChange(e.target.checked ? defaultSchedules() : [])}
					/>
				}
				label={i18n.t("queueModal.hours.useHours")}
			/>
			{active &&
				WEEK_ORDER.map(weekday => {
					const item = value.find(day => day.weekday === weekday) || {
						weekday,
						enabled: false,
						start: "08:00",
						end: "18:00",
					};
					const dayLabel = i18n.t(`queueModal.hours.weekdays.${weekday}`);
					return (
						<div key={weekday} className={classes.row}>
							<Typography variant="body2">{dayLabel}</Typography>
							<FormControlLabel
								control={
									<Switch
										size="small"
										color="primary"
										checked={item.enabled}
										onChange={e => update(weekday, { enabled: e.target.checked })}
									/>
								}
								label={i18n.t("queueModal.hours.enabled")}
							/>
							<TextField
								type="time"
								size="small"
								variant="outlined"
								margin="dense"
								disabled={!item.enabled}
								label={i18n.t("queueModal.hours.start")}
								value={item.start}
								onChange={e => update(weekday, { start: e.target.value })}
								inputProps={{ "aria-label": `${dayLabel} ${i18n.t("queueModal.hours.start")}` }}
								InputLabelProps={{ shrink: true }}
							/>
							<TextField
								type="time"
								size="small"
								variant="outlined"
								margin="dense"
								disabled={!item.enabled}
								label={i18n.t("queueModal.hours.end")}
								value={item.end}
								onChange={e => update(weekday, { end: e.target.value })}
								inputProps={{ "aria-label": `${dayLabel} ${i18n.t("queueModal.hours.end")}` }}
								InputLabelProps={{ shrink: true }}
							/>
						</div>
					);
				})}
		</div>
	);
};

export default QueueScheduleEditor;
