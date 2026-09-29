import { describe, expect, it } from 'vitest';
import { isValidRole, getHomePath, canAccessOwnerRoutes, canAccessTenantRoutes } from './roles';

describe('isValidRole (fail closed)', () => {
  it('accepts owner and tenant', () => {
    expect(isValidRole('owner')).toBe(true);
    expect(isValidRole('tenant')).toBe(true);
  });
  it('rejects null, undefined, empty, unknown, admin', () => {
    expect(isValidRole(null)).toBe(false);
    expect(isValidRole(undefined)).toBe(false);
    expect(isValidRole('')).toBe(false);
    expect(isValidRole('admin')).toBe(false);
    expect(isValidRole('OWNER')).toBe(false);
  });
});

describe('getHomePath (deterministic, no loops)', () => {
  it('owner -> /, tenant -> /tenant', () => {
    expect(getHomePath('owner')).toBe('/');
    expect(getHomePath('tenant')).toBe('/tenant');
  });
});

describe('canAccess helpers unchanged', () => {
  it('owner-only for owner routes', () => {
    expect(canAccessOwnerRoutes('owner')).toBe(true);
    expect(canAccessOwnerRoutes('tenant')).toBe(false);
    expect(canAccessOwnerRoutes(null)).toBe(false);
  });
  it('tenant branch allows both roles (owner preview)', () => {
    expect(canAccessTenantRoutes('owner')).toBe(true);
    expect(canAccessTenantRoutes('tenant')).toBe(true);
  });
});
