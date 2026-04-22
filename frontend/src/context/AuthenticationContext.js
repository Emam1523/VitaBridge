import { createContext, createElement, useContext, useEffect, useMemo, useState } from "react";

const TOKEN_KEY = "vitabridge_token";
const USER_KEY = "vitabridge_user";

const AuthenticationContext = createContext(null);

function safeJsonParse(value) {
	try {
		return JSON.parse(value);
	} catch {
		return null;
	}
}

export function AuthenticationProvider({ children }) {
	const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || "");
	const [user, setUser] = useState(() => safeJsonParse(localStorage.getItem(USER_KEY)));

	useEffect(() => {
		if (token) localStorage.setItem(TOKEN_KEY, token);
		else localStorage.removeItem(TOKEN_KEY);
	}, [token]);

	useEffect(() => {
		if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
		else localStorage.removeItem(USER_KEY);
	}, [user]);

	function setAuthFromResponse(authResponse) {
		// Backend returns: { token, type, id, name, email, role }
		setToken(authResponse?.token || "");
		setUser(
			authResponse
				? {
					id: authResponse.id,
					name: authResponse.name,
					email: authResponse.email,
					role: authResponse.role,
					profileImageUrl: authResponse.profileImageUrl || null,
				}
				: null
		);
	}

	function updateUser(patch) {
		setUser((current) => {
			if (!current) return current;
			return typeof patch === "function" ? patch(current) : { ...current, ...patch };
		});
	}

	function logout() {
		setToken("");
		setUser(null);
	}

	// Auto-logout when the API returns 401 (e.g., deactivated account)
	useEffect(() => {
		const handleUnauthorized = () => logout();
		window.addEventListener("vitabridge:unauthorized", handleUnauthorized);
		return () => window.removeEventListener("vitabridge:unauthorized", handleUnauthorized);
	}, []);

	useEffect(() => {
		if (!token || !user) return;
		let cancelled = false;

		fetch("/api/user/photo", {
			headers: { Authorization: `Bearer ${token}` },
		})
			.then((response) => (response.ok ? response.json() : null))
			.then((data) => {
				if (cancelled || !data) return;
				setUser((current) => {
					if (!current) return current;
					return {
						...current,
						profileImageUrl: data.profileImageUrl || null,
					};
				});
			})
			.catch(() => {});

		return () => {
			cancelled = true;
		};
	}, [token, user?.id]);

	const value = useMemo(
		() => ({
			token,
			user,
			isAuthenticated: Boolean(token),
			setAuthFromResponse,
			updateUser,
			logout,
		}),
		[token, user]
	);

	return createElement(AuthenticationContext.Provider, { value }, children);
}

export function useAuth() {
	const ctx = useContext(AuthenticationContext);
	if (!ctx) throw new Error("useAuth must be used within <AuthenticationProvider>");
	return ctx;
}

