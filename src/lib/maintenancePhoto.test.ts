import { describe, expect, it } from 'vitest';
import {
  MAX_PHOTO_BYTES,
  buildMaintenancePhotoPath,
  sanitizePhotoFilename,
  validateMaintenancePhoto,
  isStorableImagePath,
} from './maintenancePhoto';

function f(name: string, type: string, size: number): File {
  return new File([new Uint8Array(size)], name, { type });
}

describe('validateMaintenancePhoto (RED)', () => {
  it('JPEG/PNG/WEBP valid', () => {
    expect(validateMaintenancePhoto(f('a.jpg', 'image/jpeg', 100)).ok).toBe(true);
    expect(validateMaintenancePhoto(f('a.png', 'image/png', 100)).ok).toBe(true);
    expect(validateMaintenancePhoto(f('a.webp', 'image/webp', 100)).ok).toBe(true);
  });
  it('MIME tak didukung ditolak', () => {
    expect(validateMaintenancePhoto(f('a.gif', 'image/gif', 100)).ok).toBe(false);
    expect(validateMaintenancePhoto(f('a.pdf', 'application/pdf', 100)).ok).toBe(false);
  });
  it('>5MB ditolak, tepat 5MB diterima', () => {
    expect(validateMaintenancePhoto(f('a.jpg', 'image/jpeg', MAX_PHOTO_BYTES + 1)).ok).toBe(false);
    expect(validateMaintenancePhoto(f('a.jpg', 'image/jpeg', MAX_PHOTO_BYTES)).ok).toBe(true);
  });
  it('file kosong ditolak', () => {
    expect(validateMaintenancePhoto(f('a.jpg', 'image/jpeg', 0)).ok).toBe(false);
  });
  it('ekstensi harus konsisten dengan MIME', () => {
    expect(validateMaintenancePhoto(f('a.png', 'image/jpeg', 100)).ok).toBe(false);
  });
});

describe('sanitizePhotoFilename (RED)', () => {
  it('../ dan / ditolak/dinetralkan, deterministik', () => {
    expect(sanitizePhotoFilename('../photo.png')).not.toContain('..');
    expect(sanitizePhotoFilename('../photo.png')).not.toContain('/');
    expect(sanitizePhotoFilename('a/b.png')).not.toContain('/');
    expect(sanitizePhotoFilename('a/b.png')).toBe(sanitizePhotoFilename('a/b.png'));
    expect(sanitizePhotoFilename('')).toBe('photo');
  });
});

describe('isStorableImagePath hardening', () => {
  it('menolak segmen kosong, traversal, URL, dan segmen != 4', async () => {
    expect(isStorableImagePath('p/t/r/')).toBe(false);
    expect(isStorableImagePath('p/t/r')).toBe(false);
    expect(isStorableImagePath('p/t/r/f/x')).toBe(false);
    expect(isStorableImagePath('p/t/r/a..b.png')).toBe(false);
    expect(isStorableImagePath('https://x/p')).toBe(false);
    expect(isStorableImagePath('p/t/r/f.png')).toBe(true);
  });
});

describe('buildMaintenancePhotoPath (RED)', () => {
  const ctx = { propertyId: '11111111-1111-4111-8111-111111111111', tenantId: '22222222-2222-4222-8222-222222222222', reportId: '33333333-3333-4333-8333-333333333333' };
  it('format tepat 4 segmen property/tenant/report/filename', () => {
    const p = buildMaintenancePhotoPath(ctx, 'foto.webp');
    expect(p.split('/')).toHaveLength(4);
    expect(p).toBe(`${ctx.propertyId}/${ctx.tenantId}/${ctx.reportId}/foto.webp`);
  });
  it('filename jahat disanitasi, tidak tambah direktori', () => {
    const p = buildMaintenancePhotoPath(ctx, '../../etc.webp');
    expect(p.split('/')).toHaveLength(4);
    expect(p.startsWith(`${ctx.propertyId}/${ctx.tenantId}/${ctx.reportId}/`)).toBe(true);
  });
});
