export function $(selector: string): HTMLElement | null {
	return document.querySelector(selector);
}

export function $$(selector: string): HTMLElement[] {
	return Array.from(document.querySelectorAll(selector));
}

export function formatPrice(cents: number): string {
	return (cents / 100).toFixed(2) + ' \u20AC';
}
