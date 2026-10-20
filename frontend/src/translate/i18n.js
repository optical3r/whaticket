import i18n from "i18next";

import { messages } from "./languages";

const STORAGE_KEY = "language";
const DEFAULT_LANGUAGE = "pt";

export const languages = [
	{ code: "pt", htmlLang: "pt-BR", label: "Português (Brasil)" },
	{ code: "en", htmlLang: "en", label: "English" },
];

const readStoredLanguage = () => {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		return languages.some(language => language.code === stored)
			? stored
			: DEFAULT_LANGUAGE;
	} catch {
		return DEFAULT_LANGUAGE;
	}
};

const applyHtmlLang = code => {
	const language = languages.find(item => item.code === code);
	document.documentElement.lang = language ? language.htmlLang : "pt-BR";
};

i18n.init({
	debug: false,
	lng: readStoredLanguage(),
	defaultNS: ["translations"],
	fallbackLng: DEFAULT_LANGUAGE,
	ns: ["translations"],
	resources: messages,
	// React already escapes rendered text.
	interpolation: { escapeValue: false },
});

applyHtmlLang(i18n.language);

// Texts are read with i18n.t() during render across the app, so a reload is
// the simplest way to make sure every screen picks up the new language.
export const changeLanguage = code => {
	if (code === i18n.language) return;
	try {
		localStorage.setItem(STORAGE_KEY, code);
	} catch {
		// Without storage the choice only lasts for this page load.
	}
	void i18n.changeLanguage(code);
	window.location.reload();
};

export { i18n };
