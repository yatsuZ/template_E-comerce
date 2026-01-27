export interface I_Product {
  id: number; // key
  name: string; // UNIQUE
  description: string; // UNIQUE
  price: number; // Centime
  image: string; // url vers limage
  stock: number;
  created_at: string;
  updated_at: string;
}