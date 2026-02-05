// Produit du site d'ecomerce
export interface I_Product {
  id: number; // key
  name: string; // UNIQUE
  description: string | null;
  price: number; // Centime
  image: string | null; // url vers limage
  stock: number;
  created_at: string;
  updated_at: string;
}