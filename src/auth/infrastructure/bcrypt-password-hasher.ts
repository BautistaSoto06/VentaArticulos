import bcrypt from 'bcrypt';
import type { PasswordHasher } from '../application/ports/password-hasher.js';

const DEFAULT_SALT_ROUNDS = 12;
const MIN_SALT_ROUNDS = 10;
const MAX_SALT_ROUNDS = 15;

export class BcryptPasswordHasher implements PasswordHasher {
  private readonly saltRounds: number;

  constructor(saltRounds: number = DEFAULT_SALT_ROUNDS) {
    if (!Number.isInteger(saltRounds) || saltRounds < MIN_SALT_ROUNDS || saltRounds > MAX_SALT_ROUNDS) {
      throw new Error(
        `saltRounds debe ser un entero entre ${MIN_SALT_ROUNDS} y ${MAX_SALT_ROUNDS}; se recibió ${saltRounds}`,
      );
    }
    this.saltRounds = saltRounds;
  }

  hash(plainPassword: string): Promise<string> {
    return bcrypt.hash(plainPassword, this.saltRounds);
  }

  verify(plainPassword: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hash);
  }
}
