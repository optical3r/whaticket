import React from "react";

import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import Select from "@mui/material/Select";
import { Checkbox, ListItemText } from "@mui/material";
import { i18n } from "../../translate/i18n";
import useTags from "../../hooks/useTags";

const TicketsTagSelect = ({ selectedTagIds = [], onChange }) => {
	const { tags } = useTags();

	if (!tags.length) return null;

	return (
		<div style={{ width: 120, marginTop: -4, marginLeft: 6 }}>
			<FormControl fullWidth margin="dense">
				<Select
					multiple
					displayEmpty
					variant="outlined"
					value={selectedTagIds}
					onChange={e => onChange(e.target.value)}
					inputProps={{ "aria-label": i18n.t("tagSelector.filter") }}
					MenuProps={{
						anchorOrigin: { vertical: "bottom", horizontal: "left" },
						transformOrigin: { vertical: "top", horizontal: "left" },
					}}
					renderValue={() =>
						selectedTagIds.length
							? `${i18n.t("tagSelector.filter")} (${selectedTagIds.length})`
							: i18n.t("tagSelector.filter")
					}
				>
					{tags.map(tag => (
						<MenuItem dense key={tag.id} value={tag.id}>
							<Checkbox
								style={{ color: tag.color }}
								size="small"
								color="primary"
								checked={selectedTagIds.indexOf(tag.id) > -1}
							/>
							<ListItemText primary={tag.name} />
						</MenuItem>
					))}
				</Select>
			</FormControl>
		</div>
	);
};

export default TicketsTagSelect;
