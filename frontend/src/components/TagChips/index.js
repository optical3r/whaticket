import React from "react";
import { useTheme } from "@mui/material/styles";
import { makeStyles } from 'tss-react/mui';
import Chip from "@mui/material/Chip";

const useStyles = makeStyles()(theme => ({
	root: {
		display: "flex",
		flexWrap: "wrap",
		gap: theme.spacing(0.5),
	},
	chip: {
		height: 20,
		fontSize: 12,
		fontWeight: 600,
	},
}));

// Tag color as background with readable text (WCAG contrast).
export const tagChipStyle = (theme, color) => ({
	backgroundColor: color,
	color: theme.palette.getContrastText(color),
});

const TagChips = ({ tags = [], className }) => {
	const { classes } = useStyles();
	const theme = useTheme();

	if (!tags.length) return null;

	return (
		<div className={`${classes.root} ${className || ""}`}>
			{tags.map(tag => (
				<Chip
					key={tag.id}
					size="small"
					label={tag.name}
					className={classes.chip}
					style={tagChipStyle(theme, tag.color)}
				/>
			))}
		</div>
	);
};

export default TagChips;
