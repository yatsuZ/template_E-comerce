import { api } from '../api/client.ts';
import { formatPrice } from '../lib/utils.ts';

interface Product {
	id: number;
	name: string;
	description: string;
	price: number;
	stock: number;
	image_url?: string;
}

export function initHome(): void {
	loadFeaturedProducts();
}

async function loadFeaturedProducts(): Promise<void> {
	const container = document.getElementById('featured-products');
	const loading = document.getElementById('featured-loading');
	const empty = document.getElementById('featured-empty');
	const error = document.getElementById('featured-error');
	if (!container) return;

	try {
		const res = await api.get<{ items: Product[] }>('/api/products?limit=8');
		if (loading) loading.classList.add('hidden');

		const products = res.data?.items ?? [];
		if (products.length > 0) {
			container.innerHTML = products.map(renderProductCard).join('');
		} else {
			if (empty) empty.classList.remove('hidden');
		}
	} catch {
		if (loading) loading.classList.add('hidden');
		if (error) error.classList.remove('hidden');
	}
}

function renderProductCard(product: Product): string {
	return `
		<div class="group bg-bg-card border border-white/5 rounded-2xl p-5 hover:border-green/30 transition-all duration-300">
			<div class="bg-bg-secondary rounded-xl h-52 mb-5 flex items-center justify-center overflow-hidden">
				${product.image_url
					? `<img src="${product.image_url}" alt="${product.name}" class="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300">`
					: `<span class="text-text-muted text-5xl">&#128722;</span>`
				}
			</div>
			<h3 class="font-body font-semibold text-text-primary mb-1 truncate">${product.name}</h3>
			<p class="font-sans text-text-muted text-sm mb-4 line-clamp-2">${product.description}</p>
			<div class="flex items-center justify-between">
				<span class="font-body font-bold text-gold text-lg">${formatPrice(product.price)}</span>
				<span class="font-sans text-xs uppercase tracking-wider ${product.stock > 0 ? 'text-green' : 'text-danger'}">
					${product.stock > 0 ? 'En stock' : 'Rupture'}
				</span>
			</div>
		</div>
	`;
}
