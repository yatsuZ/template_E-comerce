import { UserService } from '../core/services/user.service.js';
import { Logger } from './logger.js';

const location = 'utils/seed.ts';

/**
 * Crée un admin au démarrage si ADMIN_EMAIL + ADMIN_PASSWORD sont définis
 * dans les variables d'environnement et qu'aucun admin avec cet email n'existe.
 * Ne fait rien si les variables ne sont pas définies.
 */
export async function seedAdmin(userService: UserService): Promise<void> {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) return;

  const exists = userService.getUserByEmail(email);
  if (exists.ok && exists.data) {
    Logger.info(location, `Admin already exists: ${email}`);
    return;
  }

  const result = await userService.createAdmin(email, password);
  if (result.ok)
    Logger.success(location, `Admin created: ${email}`);
  else
    Logger.warn(location, `Admin seed failed: ${result.error.message}`);
}
