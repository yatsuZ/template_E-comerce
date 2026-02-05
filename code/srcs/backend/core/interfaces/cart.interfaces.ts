// caddie du Utilisateur en gros c'est ce que l'utilisateur à selectioné
// et chaque ligne corespond à un utilisateur aux produit selection est à sa quantité
export interface I_Cart {
  id: number; // key
  user_id: number; // id user
  product_id: number; // id product
  quantity: number; // nbr of produtc > 0
  created_at: string;
  updated_at: string;
}