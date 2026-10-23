import { describe, expect, it } from 'vitest';
import { Argon2PasswordHasher } from './argon2-password-hasher.js';

const PASSWORD = 'contraseña-segura-123';

describe('Argon2PasswordHasher', () => {
  it('genera un hash distinto del texto plano y que empieza con "$argon2id$"', async () => {
    const hasher = new Argon2PasswordHasher();

    const hash = await hasher.hash(PASSWORD);

    expect(hash).not.toBe(PASSWORD);
    expect(hash.startsWith('$argon2id$')).toBe(true);
  });

  it('verify acepta la contraseña correcta y rechaza la incorrecta', async () => {
    const hasher = new Argon2PasswordHasher();
    const hash = await hasher.hash(PASSWORD);

    await expect(hasher.verify(PASSWORD, hash)).resolves.toBe(true);
    await expect(hasher.verify('otra-contraseña', hash)).resolves.toBe(false);
  });

  it.each(['', 'no-es-un-hash', '$argon2id$v=19$malformado', '$2b$12$invalido'])(
    'verify rechaza un hash malformado (%s) devolviendo false sin lanzar',
    async (malformedHash) => {
      const hasher = new Argon2PasswordHasher();

      await expect(hasher.verify(PASSWORD, malformedHash)).resolves.toBe(false);
    },
  );

  it('dos hashes del mismo texto son distintos', async () => {
    const hasher = new Argon2PasswordHasher();

    const first = await hasher.hash(PASSWORD);
    const second = await hasher.hash(PASSWORD);

    expect(first).not.toBe(second);
  });

  it('lanza error en español para opciones inválidas', () => {
    expect(() => new Argon2PasswordHasher({ memoryCost: 1024 })).toThrow(
      /memoryCost debe ser un entero mayor o igual a 4096/,
    );
    expect(() => new Argon2PasswordHasher({ timeCost: 1 })).toThrow(
      /timeCost debe ser un entero mayor o igual a 2/,
    );
    expect(() => new Argon2PasswordHasher({ parallelism: 0 })).toThrow(
      /parallelism debe ser un entero mayor o igual a 1/,
    );
  });

  it('lanza error en español si la contraseña está vacía al generar hash', async () => {
    const hasher = new Argon2PasswordHasher();

    await expect(hasher.hash('')).rejects.toThrow('La contraseña no puede estar vacía.');
  });
});
