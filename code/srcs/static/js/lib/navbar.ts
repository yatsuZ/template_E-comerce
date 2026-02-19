import { isAuth, isAdmin } from './auth-state.ts';

export function updateNavbar(): void {
	const show = (id: string) => {
		const el = document.getElementById(id);
		if (el) el.classList.remove('hidden');
	};
	const hide = (id: string) => {
		const el = document.getElementById(id);
		if (el) el.classList.add('hidden');
	};

	if (isAuth()) {
		hide('nav-visitor');
		hide('nav-visitor-mobile');
		show('nav-client');
		show('nav-client-mobile');

		if (isAdmin()) {
			show('nav-admin');
			show('nav-admin-mobile');
		} else {
			hide('nav-admin');
			hide('nav-admin-mobile');
		}
	} else {
		show('nav-visitor');
		show('nav-visitor-mobile');
		hide('nav-client');
		hide('nav-client-mobile');
		hide('nav-admin');
		hide('nav-admin-mobile');
	}
}
