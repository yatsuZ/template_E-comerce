// Utilisateur du site d'ecomerce
export interface I_User {
  id: number;
  email: string;
  password: string;
  google_id: string | null;
  provider: 'local' | 'google';
  is_admin: number;
  banned: number;
  refresh_token: string | null;
  created_at: string;
  updated_at: string;
}
