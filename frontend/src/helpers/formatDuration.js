import { i18n } from "../translate/i18n";

// 95 -> "1 min 35 s", 7260 -> "2 h 1 min". Null means "no data".
export const formatDuration = seconds => {
	if (seconds === null || seconds === undefined || Number.isNaN(seconds)) return null;
	const total = Math.round(seconds);
	const unit = key => i18n.t(`reports.units.${key}`);
	const days = Math.floor(total / 86400);
	const hours = Math.floor((total % 86400) / 3600);
	const minutes = Math.floor((total % 3600) / 60);
	const secs = total % 60;

	if (days > 0) return `${days} ${unit("days")} ${hours} ${unit("hours")}`;
	if (hours > 0) return `${hours} ${unit("hours")} ${minutes} ${unit("minutes")}`;
	if (minutes > 0) return `${minutes} ${unit("minutes")} ${secs} ${unit("seconds")}`;
	return `${secs} ${unit("seconds")}`;
};

export const formatRating = value =>
	value === null || value === undefined ? null : value.toFixed(1).replace(".", ",");
