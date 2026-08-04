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

export const MOCK_USERS: UserCredential[] = [
  {
    id: 'user_master_admin',
    name: 'Super Admin Captive Hub',
    email: 'admin@captivehub.local',
    password: 'admin123',
    role: 'SUPER_ADMIN',
  },
  {
    id: 'user_tenant_01',
    name: 'Vila Boêmia Bar & Shows',
    email: 'contato@vilaboemia.com.br',
    password: 'bar123',
    role: 'TENANT_ADMIN',
    tenantId: 'tenant_bar_01',
    tenantName: 'Vila Boêmia',
  },
  {
    id: 'user_tenant_02',
    name: 'Barbearia VIP Club',
    email: 'gerente@barbeariavip.com',
    password: 'barber123',
    role: 'TENANT_ADMIN',
    tenantId: 'tenant_barber_02',
    tenantName: 'Barbearia VIP',
  },
];

export function validateCredentials(email: string, password: string): MockUser | null {
  const user = MOCK_USERS.find(
    (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
  );

  if (!user) return null;

  // Retorna os dados do usuário desconsiderando a propriedade password
  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}
