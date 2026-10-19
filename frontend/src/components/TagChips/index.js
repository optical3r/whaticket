import React from "react";
import { makeStyles, useTheme } from "@material-ui/core/styles";
import Chip from "@material-ui/core/Chip";

const useStyles = makeStyles(theme => ({
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
	const classes = useStyles();
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
