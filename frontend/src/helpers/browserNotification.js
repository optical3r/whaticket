// Shows a system notification. Desktop browsers accept `new Notification`;
// Android Chrome (and the installed app) only shows notifications through
// the service worker, which then opens `url` when the notification is tapped.
export const showBrowserNotification = async (title, { url, onClick, ...options } = {}) => {
	if (!("Notification" in window) || Notification.permission !== "granted") {
		return null;
	}

	try {
		const notification = new Notification(title, options);
		notification.onclick = event => {
			event.preventDefault();
			window.focus();
			if (onClick) onClick();
		};
		return notification;
	} catch {
		const registration = await navigator.serviceWorker?.getRegistration();
		if (!registration) return null;
		await registration.showNotification(title, { ...options, data: { url } });
		return {
			tag: options.tag,
			close: async () => {
				const shown = await registration.getNotifications({ tag: options.tag });
				shown.forEach(item => item.close());
			},
		};
	}
};
