import { setAccessToken, clearAuth } from './lib/auth-state.ts';
import { updateNavbar } from './lib/navbar.ts';
import { initRouter } from './lib/router.ts';

async function initAuth(): Promise<void> {
	try {
		const res = await fetch('/api/auth/refresh', {
			method: 'POST',
			credentials: 'include',
		});
		if (res.ok) {
			const data = await res.json();
			if (data.success && data.data?.accessToken) {
				setAccessToken(data.data.accessToken);
			}
		}
	} catch {
		// Visitor — no session
	}
}

function initLogout(): void {
	const handler = async () => {
		await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
		clearAuth();
		updateNavbar();
		window.location.href = '/';
	};

	document.getElementById('btn-logout')?.addEventListener('click', handler);
	document.getElementById('btn-logout-mobile')?.addEventListener('click', handler);
}

function initMobileMenu(): void {
	const btn = document.getElementById('btn-mobile-menu');
	const menu = document.getElementById('mobile-menu');
	const iconMenu = document.getElementById('icon-menu');
	const iconClose = document.getElementById('icon-close');
	if (!btn || !menu) return;

	btn.addEventListener('click', () => {
		const open = menu.classList.toggle('hidden');
		iconMenu?.classList.toggle('hidden', !open);
		iconClose?.classList.toggle('hidden', open);
	});
}

async function main(): Promise<void> {
	await initAuth();
	updateNavbar();
	initLogout();
	initMobileMenu();
	initRouter();
}

main();
