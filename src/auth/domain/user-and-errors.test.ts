import { describe, expect, it } from 'vitest';
import {
  EmailAlreadyRegisteredError,
  InvalidRegistrationInputError,
  type InvalidRegistrationField,
} from './errors.js';
import type { User } from './user.js';

describe('Errores y entidades de dominio de autenticación', () => {
  describe('EmailAlreadyRegisteredError', () => {
    it('es instancia de Error y tiene code, email y message en español', () => {
      const error = new EmailAlreadyRegisteredError('ana@example.com');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(EmailAlreadyRegisteredError);
      expect(error.name).toBe('EmailAlreadyRegisteredError');
      expect(error.code).toBe('EMAIL_ALREADY_REGISTERED');
      expect(error.email).toBe('ana@example.com');
      expect(error.message).toBe('Ya existe una cuenta registrada con el correo ana@example.com.');
    });
  });

  describe('InvalidRegistrationInputError', () => {
    it.each([
      { field: 'name', message: 'El nombre no puede estar vacío.' },
      { field: 'email', message: 'El correo electrónico no tiene un formato válido.' },
      { field: 'password', message: 'La contraseña debe tener al menos 8 caracteres.' },
    ] satisfies ReadonlyArray<{ field: InvalidRegistrationField; message: string }>)(
      'es instancia de Error y expone code INVALID_INPUT, field "$field" y message en español',
      ({ field, message }) => {
        const error = new InvalidRegistrationInputError(field, message);

        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(InvalidRegistrationInputError);
        expect(error.name).toBe('InvalidRegistrationInputError');
        expect(error.code).toBe('INVALID_INPUT');
        expect(error.field).toBe(field);
        expect(error.message).toBe(message);
      },
    );
  });

  describe('User', () => {
    it('representa un usuario de dominio con sus propiedades requeridas', () => {
      const createdAt = new Date('2026-01-15T10:00:00Z');
      const user: User = {
        id: 'user-1',
        name: 'Ana Pérez',
        email: 'ana@example.com',
        passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$salt$hash',
        createdAt,
      };

      expect(user.id).toBe('user-1');
      expect(user.name).toBe('Ana Pérez');
      expect(user.email).toBe('ana@example.com');
      expect(user.passwordHash).toContain('$argon2id$');
      expect(user.createdAt).toBe(createdAt);
    });
  });
});
