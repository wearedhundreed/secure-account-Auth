import bcrypt from 'bcryptjs';
import { CONFIG } from '../config.ts';

export class PasswordService {
  /**
   * Hashes a plain-text password using bcrypt with a strict cost factor of 12.
   * Requirement: Bcrypt password hashing with cost factor of 12.
   */
  public static async hashPassword(plainText: string): Promise<string> {
    const salt = await bcrypt.genSalt(CONFIG.BCRYPT_SALT_ROUNDS);
    return bcrypt.hash(plainText, salt);
  }

  /**
   * Synchronous hash helper for seeding or testing if needed.
   */
  public static hashPasswordSync(plainText: string): string {
    const salt = bcrypt.genSaltSync(CONFIG.BCRYPT_SALT_ROUNDS);
    return bcrypt.hashSync(plainText, salt);
  }

  /**
   * Verifies a candidate password against the stored bcrypt hash.
   */
  public static async comparePassword(plainText: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plainText, hash);
  }

  /**
   * Inspects the bcrypt cost factor from the hash string format: $2a$12$...
   */
  public static extractCostFactor(hash: string): number | null {
    const parts = hash.split('$');
    if (parts.length >= 3) {
      const rounds = parseInt(parts[2], 10);
      return isNaN(rounds) ? null : rounds;
    }
    return null;
  }
}
