import { useEffect, useState } from "react";

import api from "../../services/api";
import openSocket from "../../services/socket-io";
import toastError from "../../errors/toastError";

// Company tags, kept in sync with changes made by other users.
const useTags = () => {
	const [tags, setTags] = useState([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		void (async () => {
			try {
				const { data } = await api.get("/tags");
				setTags(data);
			} catch (err) {
				toastError(err);
			}
			setLoading(false);
		})();

		const socket = openSocket();
		socket.on("tag", data => {
			if (data.action === "update") {
				setTags(prev => {
					const others = prev.filter(tag => tag.id !== data.tag.id);
					return [...others, data.tag].sort((a, b) => a.name.localeCompare(b.name));
				});
			}
			if (data.action === "delete") {
				setTags(prev => prev.filter(tag => tag.id !== data.tagId));
			}
		});

		return () => {
			socket.disconnect();
		};
	}, []);

	return { tags, loading };
};

export default useTags;
