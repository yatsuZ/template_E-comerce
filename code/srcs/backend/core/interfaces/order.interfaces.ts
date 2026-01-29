export type OrderStatus =
  | 'pending' // 'en attente'
  | 'paid' // 'payé'
  | 'failed' // 'échec'
  | 'cancelled' // 'annulé'
  | 'refunded' // 'remboursé'
  | 'shipped' // 'expédié'
  | 'delivered'; // 'livré'

// C'est la facture en gros
export interface I_Order {
  id: number; // key
  user_id: number; // id user
  total: number; // Le prix total de tout un cadie en centime
  status: OrderStatus;// L'etat de l'order si il est payer ou pas encore 
  stripe_payment_id: string | null;// L'id pour le payement plus tard
  created_at: string;
  updated_at: string;
}