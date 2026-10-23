import { randomUUID } from 'node:crypto';
import { EmailAlreadyRegisteredError, InvalidRegistrationInputError } from '../domain/errors.js';
import type { User } from '../domain/user.js';
import type { PasswordHasher } from './ports/password-hasher.js';
import type { UserRepository } from './ports/user-repository.js';

const MIN_PASSWORD_LENGTH = 8;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface RegisterUserInput {
  readonly name: string;
  readonly email: string;
  readonly password: string;
}

export interface RegisterUserOutput {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly createdAt: Date;
}

export interface RegisterUserDeps {
  readonly userRepository: UserRepository;
  readonly passwordHasher: PasswordHasher;
  readonly idGenerator?: () => string;
  readonly clock?: () => Date;
}

interface ValidRegistration {
  readonly name: string;
  readonly email: string;
  readonly password: string;
}

export class RegisterUserUseCase {
  private readonly userRepository: UserRepository;
  private readonly passwordHasher: PasswordHasher;
  private readonly idGenerator: () => string;
  private readonly clock: () => Date;

  constructor(deps: RegisterUserDeps) {
    this.userRepository = deps.userRepository;
    this.passwordHasher = deps.passwordHasher;
    this.idGenerator = deps.idGenerator ?? randomUUID;
    this.clock = deps.clock ?? (() => new Date());
  }

  async execute(input: RegisterUserInput): Promise<RegisterUserOutput> {
    const { name, email, password } = validate(input);

    const existing = await this.userRepository.findByEmail(email);
    if (existing !== null) {
      throw new EmailAlreadyRegisteredError(email);
    }

    const passwordHash = await this.passwordHasher.hash(password);
    const user: User = {
      id: this.idGenerator(),
      name,
      email,
      passwordHash,
      createdAt: this.clock(),
    };

    await this.userRepository.save(user);

    return { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt };
  }
}

function validate(input: RegisterUserInput): ValidRegistration {
  const name = input.name.trim();
  if (name.length === 0) {
    throw new InvalidRegistrationInputError('name', 'El nombre no puede estar vacío.');
  }

  const email = input.email.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(email)) {
    throw new InvalidRegistrationInputError('email', 'El correo electrónico no tiene un formato válido.');
  }

  if (input.password.length < MIN_PASSWORD_LENGTH) {
    throw new InvalidRegistrationInputError(
      'password',
      `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`,
    );
  }

  return { name, email, password: input.password };
}
