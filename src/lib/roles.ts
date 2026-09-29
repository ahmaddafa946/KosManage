import type { UserRole } from '@/schemas/profile';

export type ProfileRef = { id: string; role?: UserRole | null } | null | undefined;

// Role resolution reads the authenticated profile ROW only.
// Never read user_metadata / app_metadata for authorization (SEC).
// ponytail: replace default-'owner' with explicit loading/denied state
// once tenant onboarding flow exists (Slice 2+).
export function resolveRole(profile: ProfileRef): UserRole {
  if (profile?.role === 'tenant') return 'tenant';
  return 'owner';
}

export function canAccessOwnerRoutes(role: UserRole | null | undefined): boolean {
  return role === 'owner';
}

export function canAccessTenantRoutes(role: UserRole | null | undefined): boolean {
  return role === 'owner' || role === 'tenant';
}
