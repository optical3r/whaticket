import { useEffect, useState } from "react";

import api from "../../services/api";

// AI availability changes rarely, so every ticket screen shares one request
// for a minute instead of asking again.
const CACHE_MS = 60 * 1000;

let cached = null;
let cachedAt = 0;
let pending = null;

export const loadAiStatus = async () => {
	if (cached && Date.now() - cachedAt < CACHE_MS) return cached;
	if (!pending) {
		pending = api
			.get("/ai/settings")
			.then(({ data }) => {
				cached = data;
				cachedAt = Date.now();
				return data;
			})
			.finally(() => {
				pending = null;
			});
	}
	return pending;
};

export const clearAiStatus = () => {
	cached = null;
};

export const isAiAvailable = status =>
	Boolean(status?.configured && status?.usage?.limit > 0);

const useAiStatus = () => {
	const [status, setStatus] = useState(cached);

	useEffect(() => {
		let active = true;
		loadAiStatus()
			.then(data => active && setStatus(data))
			.catch(() => {});
		return () => {
			active = false;
		};
	}, []);

	return status;
};

export default useAiStatus;
