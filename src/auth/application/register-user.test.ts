import { describe, expect, it } from 'vitest';
import { EmailAlreadyRegisteredError, InvalidRegistrationInputError } from '../domain/errors.js';
import type { User } from '../domain/user.js';
import { RegisterUserUseCase } from './register-user.js';
import type { PasswordHasher } from './ports/password-hasher.js';
import type { UserRepository } from './ports/user-repository.js';

class InMemoryUserRepository implements UserRepository {
  readonly users: User[] = [];

  constructor(private readonly simulateRaceOnSave = false) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.users.find((user) => user.email === email) ?? null;
  }

  async save(user: User): Promise<void> {
    if (this.simulateRaceOnSave || this.users.some((existing) => existing.email === user.email)) {
      throw new EmailAlreadyRegisteredError(user.email);
    }
    this.users.push(user);
  }
}

class FakePasswordHasher implements PasswordHasher {
  hashCalls = 0;

  async hash(plainPassword: string): Promise<string> {
    this.hashCalls += 1;
    return `fake-hash:${plainPassword}`;
  }

  async verify(plainPassword: string, hash: string): Promise<boolean> {
    return hash === `fake-hash:${plainPassword}`;
  }
}

const CREATED_AT = new Date('2026-01-15T10:00:00Z');

function setup(options: { simulateRaceOnSave?: boolean } = {}) {
  const userRepository = new InMemoryUserRepository(options.simulateRaceOnSave);
  const passwordHasher = new FakePasswordHasher();
  const useCase = new RegisterUserUseCase({
    userRepository,
    passwordHasher,
    idGenerator: () => 'user-1',
    clock: () => CREATED_AT,
  });
  return { userRepository, passwordHasher, useCase };
}

const VALID_INPUT = {
  name: '  Ana Pérez  ',
  email: '  Ana@Example.com ',
  password: 'contraseña-segura',
};

describe('RegisterUserUseCase', () => {
  it('registra un usuario nuevo y devuelve su información pública', async () => {
    const { useCase, userRepository } = setup();

    const output = await useCase.execute(VALID_INPUT);

    expect(output).toEqual({
      id: 'user-1',
      name: 'Ana Pérez',
      email: 'ana@example.com',
      createdAt: CREATED_AT,
    });
    expect(userRepository.users).toHaveLength(1);
  });

  it('guarda un hash distinto del texto plano', async () => {
    const { useCase, userRepository } = setup();

    await useCase.execute(VALID_INPUT);

    const stored = userRepository.users[0];
    expect(stored).toBeDefined();
    expect(stored?.passwordHash).not.toBe(VALID_INPUT.password);
    expect(stored?.passwordHash).toBe(`fake-hash:${VALID_INPUT.password}`);
  });

  it('no incluye el hash en el output', async () => {
    const { useCase, passwordHasher } = setup();

    const output = await useCase.execute(VALID_INPUT);

    expect(output).not.toHaveProperty('passwordHash');
    expect(JSON.stringify(output)).not.toContain(`fake-hash:${VALID_INPUT.password}`);
    expect(passwordHasher.hashCalls).toBe(1);
  });

  it('lanza EmailAlreadyRegisteredError al repetir el correo con otra capitalización', async () => {
    const { useCase, passwordHasher } = setup();
    await useCase.execute(VALID_INPUT);

    await expect(
      useCase.execute({ ...VALID_INPUT, email: 'ANA@example.COM' }),
    ).rejects.toMatchObject({
      name: 'EmailAlreadyRegisteredError',
      code: 'EMAIL_ALREADY_REGISTERED',
      message: 'Ya existe una cuenta registrada con el correo ana@example.com.',
    });
    expect(passwordHasher.hashCalls).toBe(1);
  });

  it('no calcula el hash si el correo ya está registrado', async () => {
    const { useCase, passwordHasher } = setup();
    await useCase.execute(VALID_INPUT);

    await expect(useCase.execute(VALID_INPUT)).rejects.toBeInstanceOf(EmailAlreadyRegisteredError);
    expect(passwordHasher.hashCalls).toBe(1);
  });

  it('lanza EmailAlreadyRegisteredError si save detecta una carrera por unicidad', async () => {
    const { useCase, userRepository } = setup({ simulateRaceOnSave: true });

    await expect(useCase.execute(VALID_INPUT)).rejects.toBeInstanceOf(EmailAlreadyRegisteredError);
    expect(userRepository.users).toHaveLength(0);
  });

  it.each([
    { field: 'name', input: { ...VALID_INPUT, name: '   ' } },
    { field: 'email', input: { ...VALID_INPUT, email: 'no-es-un-correo' } },
    { field: 'email', input: { ...VALID_INPUT, email: '   ' } },
    { field: 'password', input: { ...VALID_INPUT, password: 'corta' } },
  ] as const)('rechaza una entrada inválida en el campo $field', async ({ field, input }) => {
    const { useCase, passwordHasher, userRepository } = setup();

    const attempt = useCase.execute(input);

    await expect(attempt).rejects.toBeInstanceOf(InvalidRegistrationInputError);
    await expect(attempt).rejects.toMatchObject({ code: 'INVALID_INPUT', field });
    expect(passwordHasher.hashCalls).toBe(0);
    expect(userRepository.users).toHaveLength(0);
  });

  it('acepta una contraseña de exactamente 8 caracteres', async () => {
    const { useCase } = setup();

    await expect(useCase.execute({ ...VALID_INPUT, password: '12345678' })).resolves.toBeDefined();
  });
});
