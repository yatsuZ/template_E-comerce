import bcrypt from 'bcrypt';
import { userRepo } from '../repositories/user.repository.js';
import { I_User } from '../interfaces/user.interfaces.js';
import { promises } from 'dns';

// Pour toutes les methodes methodes verifier avec des try catch
export class UserService {
  // Creat
  static async createUser(email: string, password: string, googleId?: string) {
    const hashed = await bcrypt.hash(password, 12);
    return userRepo.create(email, hashed, googleId);
  }

  static async createAdmin(email: string, password: string, googleId?: string) {
    const hashed = await bcrypt.hash(password, 12);
    return userRepo.createAdmin(email, hashed, googleId);
  }

  // Read
  static getUserById(userId: number)   :  I_User | undefined {return userRepo.findOneById(userId);}
  static getUserByEmail(email: string) :  I_User | undefined {return userRepo.findOneByEmail(email);}

  // Update
  static async updatePassword(userId: number, newPassword: string) {
    const hashed = await bcrypt.hash(newPassword, 12);
    return userRepo.update(userId, { password: hashed });
  }
  static updateEmail(userId: number, newEmail: string) : boolean {return userRepo.update(userId, { email: newEmail });}

  // Del

  static async deleteUser(userIdToDel: number, currentUser: I_User): Promise<boolean> {
    const user = userRepo.findOneById(userIdToDel);
    if (!user) throw new Error("User not found");

    if (currentUser.admin === false && currentUser.id !== userIdToDel)
      throw new Error("Not authorized to delete this user");

    if (currentUser.admin === false)
    {
      if (user.provider === 'local' && currentUser.password) {
        const match = await bcrypt.compare(currentUser.password, user.password!);
        if (!match) throw new Error("Password incorrect");
      }
      else if (user.provider === 'google' && currentUser.google_id !== user.google_id)
        throw new Error("Password incorrect");
    }

    return userRepo.delete(userIdToDel);
  }

}