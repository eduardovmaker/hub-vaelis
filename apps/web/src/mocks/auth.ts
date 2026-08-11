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
  password: string;
}

// Apenas o usuário Master Admin inicial para referência no ambiente
export const MOCK_USERS: UserCredential[] = [
  {
    id: 'user_master_admin',
    name: 'Master Admin CaptiveHub',
    email: 'admin@captivehub.com',
    password: 'admin123',
    role: 'SUPER_ADMIN',
  },
];

export function validateCredentials(email: string, password: string): MockUser | null {
  // Desativado para forçar a validação real no Firebase Firestore
  return null;
}
