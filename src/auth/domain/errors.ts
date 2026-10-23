export class EmailAlreadyRegisteredError extends Error {
  readonly code = 'EMAIL_ALREADY_REGISTERED' as const;
  readonly email: string;

  constructor(email: string) {
    super(`Ya existe una cuenta registrada con el correo ${email}.`);
    this.name = 'EmailAlreadyRegisteredError';
    this.email = email;
  }
}

export type InvalidRegistrationField = 'name' | 'email' | 'password';

export class InvalidRegistrationInputError extends Error {
  readonly code = 'INVALID_INPUT' as const;
  readonly field: InvalidRegistrationField;

  constructor(field: InvalidRegistrationField, message: string) {
    super(message);
    this.name = 'InvalidRegistrationInputError';
    this.field = field;
  }
}
