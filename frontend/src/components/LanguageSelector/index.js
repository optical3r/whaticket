import React, { useState } from "react";
import { IconButton, Menu, MenuItem, ListItemIcon } from "@mui/material";
import TranslateIcon from "@mui/icons-material/Translate";
import CheckIcon from "@mui/icons-material/Check";

import { i18n, languages, changeLanguage } from "../../translate/i18n";

const LanguageSelector = ({ className }) => {
	const [anchorEl, setAnchorEl] = useState(null);

	const handleSelect = code => {
		setAnchorEl(null);
		changeLanguage(code);
	};

	return <>
        <IconButton
            aria-label={i18n.t("languageSelector.label")}
            aria-haspopup="true"
            aria-controls="language-menu"
            title={i18n.t("languageSelector.label")}
            onClick={event => setAnchorEl(event.currentTarget)}
            className={className}
            size="large">
            <TranslateIcon />
        </IconButton>
        <Menu
            id="language-menu"
            anchorEl={anchorEl}
            keepMounted
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
        >
            {languages.map(language => {
                const selected = language.code === i18n.language;
                return (
                    <MenuItem
                        key={language.code}
                        lang={language.htmlLang}
                        selected={selected}
                        onClick={() => handleSelect(language.code)}
                    >
                        <ListItemIcon style={{ minWidth: 32 }}>
                            {selected ? <CheckIcon fontSize="small" /> : <span />}
                        </ListItemIcon>
                        {language.label}
                    </MenuItem>
                );
            })}
        </Menu>
    </>;
};

export default LanguageSelector;
