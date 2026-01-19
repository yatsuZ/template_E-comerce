export interface I_User {
  id: number;
  email: string;
  password: string;
  google_id: string | null;
  provider: 'local' | 'google';
  admin: boolean;
  created_at: string;
  updated_at: string;
}
