export type UserRole = 'SUPER_ADMIN' | 'TENANT_ADMIN';

export interface MockUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  tenantId?: string;
  tenantName?: string;
}

export interface UserCredential extends MockUser {
  password?: string;
}

export const MOCK_USERS: UserCredential[] = [];

export function validateCredentials(email: string, password: string): MockUser | null {
  // Desativado para forçar a validação real no Firebase Firestore
  return null;
}

