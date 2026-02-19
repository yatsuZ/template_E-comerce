interface JwtPayload {
	userId: number;
	email: string;
	is_admin: boolean;
	exp: number;
}

let accessToken: string | null = null;
let payload: JwtPayload | null = null;

function decodeJwt(token: string): JwtPayload | null {
	try {
		const base64 = token.split('.')[1];
		const json = atob(base64.replace(/-/g, '+').replace(/_/g, '/'));
		return JSON.parse(json);
	} catch {
		return null;
	}
}

export function setAccessToken(token: string): void {
	accessToken = token;
	payload = decodeJwt(token);
}

export function getAccessToken(): string | null {
	return accessToken;
}

export function getPayload(): JwtPayload | null {
	return payload;
}

export function isAuth(): boolean {
	return payload !== null;
}

export function isAdmin(): boolean {
	return payload?.is_admin === true;
}

export function clearAuth(): void {
	accessToken = null;
	payload = null;
}
