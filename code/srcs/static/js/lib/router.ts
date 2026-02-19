import { initHome } from '../pages/home.ts';

type PageInit = () => void;

const routes: Record<string, PageInit> = {
	'/': initHome,
};

export function initRouter(): void {
	const path = window.location.pathname;
	const init = routes[path];
	if (init) init();
}
