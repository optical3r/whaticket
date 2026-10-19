import React from "react";
import { makeStyles } from 'tss-react/mui';
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";

const useStyles = makeStyles()(theme => ({
	card: {
		padding: theme.spacing(3),
		height: "100%",
		display: "flex",
		flexDirection: "column",
		gap: theme.spacing(0.5),
		borderRadius: theme.borderRadius.medium,
	},
	label: {
		color: theme.palette.text.secondary,
		fontSize: 14,
		fontWeight: 600,
	},
	value: {
		fontFamily: theme.typography.brandFontFamily,
		fontWeight: 600,
		fontSize: 28,
		lineHeight: 1.2,
		color: theme.palette.text.primary,
	},
	unit: {
		fontFamily: theme.typography.fontFamily,
		fontSize: 16,
		fontWeight: 500,
		marginLeft: theme.spacing(0.5),
		color: theme.palette.text.secondary,
	},
	empty: {
		fontSize: 16,
		color: theme.palette.text.secondary,
		fontFamily: theme.typography.fontFamily,
	},
	meta: {
		marginTop: "auto",
		paddingTop: theme.spacing(1),
		fontSize: 12,
		color: theme.palette.text.secondary,
	},
	detail: {
		fontFamily: theme.typography.monoFontFamily,
		fontSize: 13,
		color: theme.palette.text.secondary,
	},
}));

// Design system MetricCard: value, unit, period and source always shown.
const MetricCard = ({ label, value, unit, detail, period, source, emptyText }) => {
	const { classes } = useStyles();
	const hasValue = value !== null && value !== undefined;

	return (
		<Paper variant="outlined" className={classes.card}>
			<Typography component="h3" className={classes.label}>
				{label}
			</Typography>
			{hasValue ? (
				<Typography component="p" className={classes.value}>
					{value}
					{unit && <span className={classes.unit}>{unit}</span>}
				</Typography>
			) : (
				<Typography component="p" className={classes.empty}>
					{emptyText}
				</Typography>
			)}
			{detail && <Typography className={classes.detail}>{detail}</Typography>}
			{(period || source) && (
				<Typography className={classes.meta}>
					{[period, source].filter(Boolean).join(" · ")}
				</Typography>
			)}
		</Paper>
	);
};

export default MetricCard;
