import { describe, expect, it } from 'vitest';
import { RegisterUserUseCase } from './auth/application/register-user.js';
import {
  EmailAlreadyRegisteredError,
  InvalidRegistrationInputError,
} from './auth/domain/errors.js';
import { Argon2PasswordHasher } from './auth/infrastructure/argon2-password-hasher.js';
import { BcryptPasswordHasher } from './auth/infrastructure/bcrypt-password-hasher.js';
import * as publicApi from './index.js';

describe('Exports públicos de src/index.ts', () => {
  it('exporta RegisterUserUseCase', () => {
    expect(publicApi.RegisterUserUseCase).toBe(RegisterUserUseCase);
    expect(typeof publicApi.RegisterUserUseCase).toBe('function');
  });

  it('exporta los errores de dominio EmailAlreadyRegisteredError e InvalidRegistrationInputError', () => {
    expect(publicApi.EmailAlreadyRegisteredError).toBe(EmailAlreadyRegisteredError);
    expect(publicApi.InvalidRegistrationInputError).toBe(InvalidRegistrationInputError);
  });

  it('exporta los adaptadores de hashing Argon2PasswordHasher y BcryptPasswordHasher', () => {
    expect(publicApi.Argon2PasswordHasher).toBe(Argon2PasswordHasher);
    expect(publicApi.BcryptPasswordHasher).toBe(BcryptPasswordHasher);
  });
});
