import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const FIX = readFileSync(join(__dirname, '20260929193000_maintenance_reports_storage_policy_fix.sql'), 'utf8');

describe('storage policy qualification regression (Slice 6 fix)', () => {
  it('setiap foldername memakai storage.objects.name yang qualified', () => {
    const uses = [...FIX.matchAll(/storage\.foldername\(([^)]+)\)/g)].map((m) => m[1]);
    expect(uses.length).toBeGreaterThan(0);
    for (const arg of uses) expect(arg).toBe('storage.objects.name');
  });
  it('tidak ada bare foldername(name) di baris SQL (komentar diabaikan)', () => {
    const sqlLines = FIX.split('\n').filter((l) => !l.trimStart().startsWith('--'));
    expect(sqlLines.join('\n')).not.toMatch(/foldername\(\s*name\s*\)/);
  });
  it('ketiga policy ada dengan 3-segmen + segmen 1/2/3 = property/tenant/report', () => {
    for (const p of ['maintenance_photo_insert_tenant', 'maintenance_photo_select_tenant', 'maintenance_photo_select_owner']) {
      expect(FIX).toContain(p);
    }
    expect(FIX).toContain('array_length(storage.foldername(storage.objects.name), 1) = 3');
    expect(FIX).toContain('r.property_id::text = (storage.foldername(storage.objects.name))[1]');
    expect(FIX).toContain('r.tenant_id::text = (storage.foldername(storage.objects.name))[2]');
    expect(FIX).toContain('r.id::text = (storage.foldername(storage.objects.name))[3]');
  });
  it('tenant policies tetap own-active chain; owner tetap property-owner', () => {
    expect(FIX).toContain('private.is_own_tenant(t.profile_id)');
    expect(FIX).toContain("t.status = 'active'");
    expect(FIX).toContain('private.is_property_owner(r.property_id)');
  });
  it('tidak ada DELETE/UPDATE/FOR ALL storage policy baru', () => {
    expect(FIX).not.toMatch(/for\s+(delete|update|all)\s+to\s+authenticated/i);
  });
  it('migration Slice 6 asli tidak diubah (masih bare name = bukti perlunya fix)', () => {
    const orig = readFileSync(join(__dirname, '20260929192000_maintenance_reports_storage.sql'), 'utf8');
    expect(orig).toMatch(/foldername\(\s*name\s*\)/);
  });
});
