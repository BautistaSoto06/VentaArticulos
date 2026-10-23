import type { User } from '../../domain/user.js';

export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  /**
   * Debe lanzar EmailAlreadyRegisteredError si la restricción de unicidad
   * del correo falla, aunque findByEmail no lo haya detectado (carreras).
   */
  save(user: User): Promise<void>;
}
