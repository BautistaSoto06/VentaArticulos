import * as argon2 from 'argon2';
import { describe, expect, it } from 'vitest';
import { EmailAlreadyRegisteredError, InvalidRegistrationInputError } from '../domain/errors.js';
import type { User } from '../domain/user.js';
import { Argon2PasswordHasher } from '../infrastructure/argon2-password-hasher.js';
import type { UserRepository } from './ports/user-repository.js';
import { RegisterUserUseCase } from './register-user.js';

class RealInMemoryUserRepository implements UserRepository {
  private readonly store = new Map<string, User>();

  async findByEmail(email: string): Promise<User | null> {
    return this.store.get(email) ?? null;
  }

  async save(user: User): Promise<void> {
    if (this.store.has(user.email)) {
      throw new EmailAlreadyRegisteredError(user.email);
    }
    this.store.set(user.email, user);
  }

  getAll(): User[] {
    return Array.from(this.store.values());
  }
}

const VALID_INPUT = {
  name: '  Carlos Gómez  ',
  email: '  Carlos.Gomez@Example.com  ',
  password: 'contraseña-segura-123',
};

describe('RegisterUserUseCase (integración con Argon2PasswordHasher real)', () => {
  it('guarda un hash argon2id real que verifica con argon2 y usa idGenerator y clock inyectados', async () => {
    const userRepository = new RealInMemoryUserRepository();
    const passwordHasher = new Argon2PasswordHasher();
    const fixedDate = new Date('2026-03-10T14:30:00Z');
    const useCase = new RegisterUserUseCase({
      userRepository,
      passwordHasher,
      idGenerator: () => 'custom-id-42',
      clock: () => fixedDate,
    });

    const output = await useCase.execute(VALID_INPUT);

    expect(output).toEqual({
      id: 'custom-id-42',
      name: 'Carlos Gómez',
      email: 'carlos.gomez@example.com',
      createdAt: fixedDate,
    });
    expect(output).not.toHaveProperty('passwordHash');

    const storedUser = await userRepository.findByEmail('carlos.gomez@example.com');
    expect(storedUser).not.toBeNull();
    if (storedUser === null) {
      throw new Error('Se esperaba que el usuario estuviera almacenado en el repositorio.');
    }

    expect(storedUser.passwordHash.startsWith('$argon2id$')).toBe(true);
    await expect(argon2.verify(storedUser.passwordHash, VALID_INPUT.password)).resolves.toBe(true);
    await expect(passwordHasher.verify(VALID_INPUT.password, storedUser.passwordHash)).resolves.toBe(
      true,
    );
    expect(JSON.stringify(output)).not.toContain(storedUser.passwordHash);
  });

  it('usa el generador de UUID y reloj por defecto cuando no se inyectan', async () => {
    const userRepository = new RealInMemoryUserRepository();
    const passwordHasher = new Argon2PasswordHasher();
    const useCase = new RegisterUserUseCase({ userRepository, passwordHasher });

    const before = new Date();
    const output = await useCase.execute(VALID_INPUT);
    const after = new Date();

    expect(output.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(output.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(output.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    expect(output).not.toHaveProperty('passwordHash');
  });

  it('lanza EmailAlreadyRegisteredError en correo duplicado con distinta capitalización y espacios y NO guarda un segundo usuario', async () => {
    const userRepository = new RealInMemoryUserRepository();
    const passwordHasher = new Argon2PasswordHasher();
    const useCase = new RegisterUserUseCase({ userRepository, passwordHasher });

    await useCase.execute(VALID_INPUT);

    await expect(
      useCase.execute({
        name: 'Otro Nombre',
        email: '   CARLOS.GOMEZ@EXAMPLE.COM   ',
        password: 'otra-contraseña-123',
      }),
    ).rejects.toThrow(EmailAlreadyRegisteredError);

    expect(userRepository.getAll()).toHaveLength(1);
  });

  it.each([
    {
      description: 'nombre vacío',
      field: 'name' as const,
      input: { ...VALID_INPUT, name: '    ' },
    },
    {
      description: 'correo inválido',
      field: 'email' as const,
      input: { ...VALID_INPUT, email: 'correo-sin-arroba.com' },
    },
    {
      description: 'contraseña de 7 caracteres',
      field: 'password' as const,
      input: { ...VALID_INPUT, password: '1234567' },
    },
  ])(
    'lanza InvalidRegistrationInputError con field "$field" cuando se recibe $description',
    async ({ field, input }) => {
      const userRepository = new RealInMemoryUserRepository();
      const passwordHasher = new Argon2PasswordHasher();
      const useCase = new RegisterUserUseCase({ userRepository, passwordHasher });

      const attempt = useCase.execute(input);

      await expect(attempt).rejects.toBeInstanceOf(InvalidRegistrationInputError);
      await expect(attempt).rejects.toMatchObject({
        code: 'INVALID_INPUT',
        field,
      });
      expect(userRepository.getAll()).toHaveLength(0);
    },
  );
});
