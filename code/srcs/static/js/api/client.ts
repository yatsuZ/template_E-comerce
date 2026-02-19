import { getAccessToken, setAccessToken, clearAuth } from '../lib/auth-state.ts';

interface ApiResponse<T = unknown> {
	success: boolean;
	data?: T;
	error?: string;
}

async function request<T = unknown>(url: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		...(options.headers as Record<string, string> || {}),
	};

	const token = getAccessToken();
	if (token) {
		headers['Authorization'] = `Bearer ${token}`;
	}

	const res = await fetch(url, { ...options, headers, credentials: 'include' });

	if (res.status === 401 && token) {
		const refreshed = await tryRefresh();
		if (refreshed) {
			headers['Authorization'] = `Bearer ${getAccessToken()}`;
			const retry = await fetch(url, { ...options, headers, credentials: 'include' });
			return retry.json();
		}
		clearAuth();
	}

	return res.json();
}

async function tryRefresh(): Promise<boolean> {
	try {
		const res = await fetch('/api/auth/refresh', {
			method: 'POST',
			credentials: 'include',
		});
		if (!res.ok) return false;
		const data = await res.json();
		if (data.success && data.data?.accessToken) {
			setAccessToken(data.data.accessToken);
			return true;
		}
		return false;
	} catch {
		return false;
	}
}

export const api = {
	get: <T = unknown>(url: string) => request<T>(url),
	post: <T = unknown>(url: string, body?: unknown) =>
		request<T>(url, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
	put: <T = unknown>(url: string, body?: unknown) =>
		request<T>(url, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
	delete: <T = unknown>(url: string) => request<T>(url, { method: 'DELETE' }),
};
