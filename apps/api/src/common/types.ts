import type { Role } from '@katacraft/shared';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: Role;
}
