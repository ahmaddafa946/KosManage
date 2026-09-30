import { describe, expect, it } from 'vitest';
import { tenantProfileUpdateSchema } from './profile';

describe('tenantProfileUpdateSchema (Slice 10)', () => {
  it('menerima nama dan telepon yang valid', () => {
    const result = tenantProfileUpdateSchema.safeParse({ full_name: 'Ahmad', phone: '08123456789' });
    expect(result.success).toBe(true);
  });

  it('menolak nama kosong atau hanya whitespace', () => {
    const result = tenantProfileUpdateSchema.safeParse({ full_name: '   ', phone: null });
    expect(result.success).toBe(false);
  });

  it('menormalisasi telepon kosong menjadi null', () => {
    const result = tenantProfileUpdateSchema.safeParse({ full_name: 'Ahmad', phone: '' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.phone).toBeNull();
  });

  it('menolak field role/id tambahan agar kontrak self-edit tetap guarded', () => {
    const result = tenantProfileUpdateSchema.safeParse({
      full_name: 'Ahmad', phone: '0812', role: 'owner', id: 'attacker-id',
    });
    expect(result.success).toBe(false);
  });
});