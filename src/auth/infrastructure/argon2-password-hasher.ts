import * as argon2 from 'argon2';
import type { PasswordHasher } from '../application/ports/password-hasher.js';

const DEFAULT_MEMORY_COST = 65536;
const MIN_MEMORY_COST = 4096;
const DEFAULT_TIME_COST = 3;
const MIN_TIME_COST = 2;
const DEFAULT_PARALLELISM = 4;
const MIN_PARALLELISM = 1;

export interface Argon2Options {
  readonly memoryCost?: number;
  readonly timeCost?: number;
  readonly parallelism?: number;
}

export class Argon2PasswordHasher implements PasswordHasher {
  private readonly memoryCost: number;
  private readonly timeCost: number;
  private readonly parallelism: number;

  constructor(options: Argon2Options = {}) {
    const memoryCost = options.memoryCost ?? DEFAULT_MEMORY_COST;
    const timeCost = options.timeCost ?? DEFAULT_TIME_COST;
    const parallelism = options.parallelism ?? DEFAULT_PARALLELISM;

    if (!Number.isInteger(memoryCost) || memoryCost < MIN_MEMORY_COST) {
      throw new Error(
        `memoryCost debe ser un entero mayor o igual a ${MIN_MEMORY_COST}; se recibió ${memoryCost}`,
      );
    }

    if (!Number.isInteger(timeCost) || timeCost < MIN_TIME_COST) {
      throw new Error(
        `timeCost debe ser un entero mayor o igual a ${MIN_TIME_COST}; se recibió ${timeCost}`,
      );
    }

    if (!Number.isInteger(parallelism) || parallelism < MIN_PARALLELISM) {
      throw new Error(
        `parallelism debe ser un entero mayor o igual a ${MIN_PARALLELISM}; se recibió ${parallelism}`,
      );
    }

    this.memoryCost = memoryCost;
    this.timeCost = timeCost;
    this.parallelism = parallelism;
  }

  async hash(plainPassword: string): Promise<string> {
    if (plainPassword.length === 0) {
      throw new Error('La contraseña no puede estar vacía.');
    }

    return argon2.hash(plainPassword, {
      type: argon2.argon2id,
      memoryCost: this.memoryCost,
      timeCost: this.timeCost,
      parallelism: this.parallelism,
    });
  }

  async verify(plainPassword: string, hash: string): Promise<boolean> {
    if (hash.length === 0) {
      return false;
    }

    try {
      return await argon2.verify(hash, plainPassword);
    } catch {
      return false;
    }
  }
}
