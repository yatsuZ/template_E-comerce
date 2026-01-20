import bcrypt from 'bcrypt';
import { UserRepository } from '../repositories/user.repository.js';
import { I_User } from '../interfaces/user.interfaces.js';

// Pour toutes les methodes methodes verifier avec des try catch
export class UserService {
  private static _userRepo: UserRepository;

  constructor(userRepo: UserRepository) {
    UserService._userRepo = userRepo;
  }

  // Creat
  static async createUser(email: string, password: string, googleId?: string) {
    const hashed = await bcrypt.hash(password, 12);
    return UserService._userRepo.createUser(email, hashed, googleId);
  }

  static async createAdmin(email: string, password: string, googleId?: string) {
    const hashed = await bcrypt.hash(password, 12);
    return UserService._userRepo.createAdmin(email, hashed, googleId);
  }

  // Read
  static getUserById(userId: number)   :  I_User | undefined {return UserService._userRepo.findOneById(userId);}
  static getUserByEmail(email: string) :  I_User | undefined {return UserService._userRepo.findOneByEmail(email);}

  // Update
  static async updatePassword(userId: number, newPassword: string) {
    const hashed = await bcrypt.hash(newPassword, 12);
    return UserService._userRepo.updateUser(userId, { password: hashed });
  }
  static updateEmail(userId: number, newEmail: string) : boolean {return UserService._userRepo.updateUser(userId, { email: newEmail });}

  // Del

  // attention verifier si celui qu'on veut supprimer est un Admin faut que ce soit la meme personne
  // Faire 2 methode different del User et Del Admin ??
  static async deleteUser(userIdToDel: number, currentUser: I_User): Promise<boolean> {
    const user = UserService._userRepo.findOneById(userIdToDel);
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

    return UserService._userRepo.delete(userIdToDel);
  }

}