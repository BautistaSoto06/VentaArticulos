import { describe, expect, it } from 'vitest';
import { BcryptPasswordHasher } from './bcrypt-password-hasher.js';

const TEST_SALT_ROUNDS = 10;
const PASSWORD = 'contraseña-segura-123';

describe('BcryptPasswordHasher', () => {
  it('genera un hash distinto del texto plano', async () => {
    const hasher = new BcryptPasswordHasher(TEST_SALT_ROUNDS);

    const hash = await hasher.hash(PASSWORD);

    expect(hash).not.toBe(PASSWORD);
  });

  it('verify acepta la contraseña correcta y rechaza una incorrecta', async () => {
    const hasher = new BcryptPasswordHasher(TEST_SALT_ROUNDS);
    const hash = await hasher.hash(PASSWORD);

    await expect(hasher.verify(PASSWORD, hash)).resolves.toBe(true);
    await expect(hasher.verify('otra-contraseña', hash)).resolves.toBe(false);
  });

  it('dos hashes del mismo texto son distintos gracias al salt', async () => {
    const hasher = new BcryptPasswordHasher(TEST_SALT_ROUNDS);

    const first = await hasher.hash(PASSWORD);
    const second = await hasher.hash(PASSWORD);

    expect(first).not.toBe(second);
  });

  it('usa 12 rondas de salt por defecto', async () => {
    const hasher = new BcryptPasswordHasher();

    const hash = await hasher.hash(PASSWORD);

    expect(hash.startsWith('$2b$12$')).toBe(true);
  });

  it.each([9, 16, 10.5, Number.NaN])('lanza error en español para saltRounds inválido: %s', (saltRounds) => {
    expect(() => new BcryptPasswordHasher(saltRounds)).toThrow(
      /saltRounds debe ser un entero entre 10 y 15/,
    );
  });
});
