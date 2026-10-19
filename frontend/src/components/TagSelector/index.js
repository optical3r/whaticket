import React, { useState } from "react";
import { useTheme } from "@material-ui/core/styles";
import Chip from "@material-ui/core/Chip";
import TextField from "@material-ui/core/TextField";
import Autocomplete from "@material-ui/lab/Autocomplete";

import api from "../../services/api";
import toastError from "../../errors/toastError";
import { i18n } from "../../translate/i18n";
import useTags from "../../hooks/useTags";
import { tagChipStyle } from "../TagChips";

// Edits the tags of a ticket or a contact. `endpoint` is the PUT route that
// replaces the list, e.g. /tickets/12/tags.
const TagSelector = ({ id, label, endpoint, value = [], onChange }) => {
	const theme = useTheme();
	const { tags } = useTags();
	const [saving, setSaving] = useState(false);

	const handleChange = async (event, selected) => {
		setSaving(true);
		try {
			const { data } = await api.put(endpoint, {
				tagIds: selected.map(tag => tag.id),
			});
			if (onChange) onChange(data.tags || []);
		} catch (err) {
			toastError(err);
		}
		setSaving(false);
	};

	return (
		<Autocomplete
			id={id}
			multiple
			size="small"
			options={tags}
			value={tags.filter(tag => value.some(item => item.id === tag.id))}
			getOptionLabel={option => option.name}
			getOptionSelected={(option, selected) => option.id === selected.id}
			onChange={handleChange}
			disabled={saving}
			noOptionsText={i18n.t("tagSelector.noOptions")}
			renderTags={(selected, getTagProps) =>
				selected.map((tag, index) => (
					<Chip
						key={tag.id}
						size="small"
						label={tag.name}
						style={tagChipStyle(theme, tag.color)}
						{...getTagProps({ index })}
					/>
				))
			}
			renderInput={params => (
				<TextField
					{...params}
					variant="outlined"
					label={label}
					placeholder={i18n.t("tagSelector.placeholder")}
				/>
			)}
		/>
	);
};

export default TagSelector;
