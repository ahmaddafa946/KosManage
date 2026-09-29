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

// Runtime role check for untrusted values (e.g. profile row from DB).
// Unknown values fail closed: never grant owner access.
export function isValidRole(value: unknown): value is UserRole {
  return value === 'owner' || value === 'tenant';
}

// Deterministic home per role. Used for cross-role redirects.
// owner -> '/', tenant -> '/tenant'. No loops: target is always
// a route the role is allowed to open.
export function getHomePath(role: UserRole): string {
  return role === 'tenant' ? '/tenant' : '/';
}
