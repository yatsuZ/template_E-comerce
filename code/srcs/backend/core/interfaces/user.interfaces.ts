// Utilisateur du site d'ecomerce
export interface I_User {
  id: number;
  email: string;
  password: string;
  google_id: string | null;
  provider: 'local' | 'google';
  is_admin: number;
  created_at: string;
  updated_at: string;
}
