import { describe, expect, it } from 'vitest';
import { profileSchema, type UserRole } from '@/schemas/profile';
import { tenantLinkSchema } from '@/schemas/tenantLink';
import { resolveRole, canAccessOwnerRoutes } from '@/lib/roles';

describe('Slice 1: profile role', () => {
  it('accepts owner and tenant roles', () => {
    expect(profileSchema.safeParse({ role: 'owner' }).success).toBe(true);
    expect(profileSchema.safeParse({ role: 'tenant' }).success).toBe(true);
  });

  it('rejects invalid roles (incl. admin/staff privilege escalation)', () => {
    for (const role of ['admin', 'staff', '', 'OWNER', 'superuser']) {
      expect(profileSchema.safeParse({ role }).success).toBe(false);
    }
  });

  it('email is optional display copy; phone optional', () => {
    const r = profileSchema.safeParse({ role: 'owner', email: 'a@b.co', phone: '0811' });
    expect(r.success).toBe(true);
    const bad = profileSchema.safeParse({ role: 'owner', email: 'bukan-email' });
    expect(bad.success).toBe(false);
  });
});

describe('Slice 1: role resolution (never user_metadata)', () => {
  it('resolves role from authenticated profile row', () => {
    expect(resolveRole({ id: 'u1', role: 'tenant' as UserRole })).toBe('tenant');
    expect(resolveRole({ id: 'u1', role: 'owner' as UserRole })).toBe('owner');
  });

  it('defaults missing/unknown to owner (existing data stays valid)', () => {
    expect(resolveRole(null)).toBe('owner');
    expect(resolveRole({ id: 'u1', role: null })).toBe('owner');
  });

  it('owner routes: owner passes, tenant denied, anon denied', () => {
    expect(canAccessOwnerRoutes('owner')).toBe(true);
    expect(canAccessOwnerRoutes('tenant')).toBe(false);
    expect(canAccessOwnerRoutes(null)).toBe(false);
  });
});

describe('Slice 1: tenant profile linkage', () => {
  it('accepts null profile_id (legacy/unlinked) and valid uuid', () => {
    expect(tenantLinkSchema.safeParse({ profile_id: null }).success).toBe(true);
    expect(
      tenantLinkSchema.safeParse({ profile_id: '123e4567-e89b-12d3-a456-426614174000' }).success,
    ).toBe(true);
  });

  it('rejects malformed profile_id (prevents link abuse payloads)', () => {
    expect(tenantLinkSchema.safeParse({ profile_id: 'not-a-uuid' }).success).toBe(false);
  });
});
