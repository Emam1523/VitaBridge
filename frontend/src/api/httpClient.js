export function getApiBaseUrl() {
	// If VITE_API_URL is explicitly set, use it (override for special deployments)
	if (import.meta?.env?.VITE_API_URL) {
		return String(import.meta.env.VITE_API_URL).replace(/\/$/, "");
	}
	// Default to "/api" which should be proxied to the backend in production
	return "/api";
}

export async function apiRequest(path, { method = "GET", token, headers, body } = {}) {
	const baseUrl = getApiBaseUrl();

	const response = await fetch(`${baseUrl}${path}`, {
		method,
		headers: {
			"Content-Type": "application/json",
			"ngrok-skip-browser-warning": "true",
			...(token ? { Authorization: `Bearer ${token}` } : {}),
			...(headers || {}),
		},
		body: body === undefined ? undefined : JSON.stringify(body),
	});

	if (!response.ok) {
		if (response.status === 401) {
			localStorage.removeItem("vitabridge_token");
			localStorage.removeItem("vitabridge_user");
			window.dispatchEvent(new Event("vitabridge:unauthorized"));
		}
		let message = `Request failed (${response.status})`;
		try {
			const maybeJson = await response.json();
			message = maybeJson?.message || maybeJson?.error || message;
		} catch {
			// ignore non-JSON
		}
		throw new Error(message);
	}

	if (response.status === 204) return null;
	return response.json();
}
