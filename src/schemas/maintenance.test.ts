import { describe, expect, it } from 'vitest';
import {
  maintenanceCategorySchema,
  maintenanceCreateSchema,
  maintenanceOwnerUpdateSchema,
  maintenancePrioritySchema,
  maintenanceStatusSchema,
  maintenanceTenantUpdateSchema,
} from './maintenance';

describe('maintenance enums', () => {
  it('category/priority/status valid', () => {
    expect(maintenanceCategorySchema.safeParse('plumbing').success).toBe(true);
    expect(maintenancePrioritySchema.safeParse('high').success).toBe(true);
    expect(maintenanceStatusSchema.safeParse('in_progress').success).toBe(true);
  });
  it('menolak nilai di luar enum', () => {
    expect(maintenanceCategorySchema.safeParse('roof').success).toBe(false);
    expect(maintenancePrioritySchema.safeParse('urgent').success).toBe(false);
    expect(maintenanceStatusSchema.safeParse('open').success).toBe(false);
  });
});

describe('maintenanceCreateSchema', () => {
  const valid = { title: 'AC bocor', description: 'Air menetes sejak pagi.', category: 'AC', priority: 'high' };
  it('menerima payload valid', () => {
    expect(maintenanceCreateSchema.safeParse(valid).success).toBe(true);
  });
  it('menolak title/description kosong', () => {
    expect(maintenanceCreateSchema.safeParse({ ...valid, title: '  ' }).success).toBe(false);
    expect(maintenanceCreateSchema.safeParse({ ...valid, description: '' }).success).toBe(false);
  });
  it('menolak title > 120 dan description > 2000', () => {
    expect(maintenanceCreateSchema.safeParse({ ...valid, title: 'x'.repeat(121) }).success).toBe(false);
    expect(maintenanceCreateSchema.safeParse({ ...valid, description: 'y'.repeat(2001) }).success).toBe(false);
  });
  it('forbidden fields (status/resolved_at/property_id/tenant_id/image_url) bukan bagian create schema', () => {
    const shape = Object.keys(maintenanceCreateSchema.shape);
    for (const f of ['status', 'resolved_at', 'property_id', 'tenant_id', 'room_id', 'image_url']) {
      expect(shape).not.toContain(f);
    }
  });
  it('input berlebih di-strip (tidak bocor ke insert)', () => {
    const r = maintenanceCreateSchema.safeParse({ ...valid, status: 'resolved', resolved_at: '2026-01-01' });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data).not.toHaveProperty('status');
      expect(r.data).not.toHaveProperty('resolved_at');
    }
  });
});

describe('maintenanceTenantUpdateSchema', () => {
  it('tidak mengandung status/resolved_at', () => {
    const shape = Object.keys(maintenanceTenantUpdateSchema.shape);
    expect(shape).not.toContain('status');
    expect(shape).not.toContain('resolved_at');
  });
});

describe('maintenanceOwnerUpdateSchema', () => {
  it('boleh status step tapi tidak resolved_at', () => {
    const r = maintenanceOwnerUpdateSchema.safeParse({ status: 'in_progress' });
    expect(r.success).toBe(true);
    expect(Object.keys(maintenanceOwnerUpdateSchema.shape)).not.toContain('resolved_at');
  });
});
