// C'est chaque produit relier à une facture en gros c'est le contenant de la facture comme le cadie mais apres avoir payer 
export interface I_OrderItems {
  id: number; // key
  order_id: number; // id Order
  product_id: number; // id Order
  quantity: number; // nbr of produtc > 0
  price: number; // price du id product
  created_at: string;
  updated_at: string;
}