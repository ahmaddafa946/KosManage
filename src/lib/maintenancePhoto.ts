// Slice 6 client validation + path building for maintenance report photos.
// Single source of truth for MIME/size rules (mirror bucket restrictions).
// Bucket RLS remains the authoritative backstop — never trust client alone.

export const MAINTENANCE_BUCKET = 'maintenance-reports';
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5 MB (AS-031)

export const ALLOWED_PHOTO_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type MaintenancePhotoMime = (typeof ALLOWED_PHOTO_MIME)[number];

const MIME_EXT: Record<MaintenancePhotoMime, string[]> = {
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/webp': ['webp'],
};

export interface PhotoValidation {
  ok: boolean;
  error?: string;
}

export interface MaintenancePhotoContext {
  propertyId: string;
  tenantId: string;
  reportId: string;
}

// Strip directories, traversal, and unsafe chars. Deterministic.
export function sanitizePhotoFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? '';
  const clean = base.replace(/\.+/g, '.').replace(/[^a-zA-Z0-9._-]/g, '_').replace(/^_+/, '').slice(0, 100);
  const trimmed = clean.replace(/^\.+/, '');
  return trimmed && trimmed !== '.' ? trimmed : 'photo';
}

function extOf(name: string): string {
  const i = name.lastIndexOf('.');
  return i < 0 ? '' : name.slice(i + 1).toLowerCase();
}

export function validateMaintenancePhoto(file: File): PhotoValidation {
  if (!file || file.size <= 0) return { ok: false, error: 'File foto kosong.' };
  if (!(ALLOWED_PHOTO_MIME as readonly string[]).includes(file.type)) {
    return { ok: false, error: 'Tipe file tidak didukung. Gunakan JPG, PNG, atau WebP.' };
  }
  const mime = file.type as MaintenancePhotoMime;
  if (!MIME_EXT[mime].includes(extOf(file.name))) {
    return { ok: false, error: 'Ekstensi file tidak sesuai dengan tipe gambar.' };
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return { ok: false, error: 'Ukuran foto melebihi 5 MB.' };
  }
  const safe = sanitizePhotoFilename(file.name);
  if (!safe.includes('.')) return { ok: false, error: 'Nama file harus berekstensi.' };
  return { ok: true };
}

// Exact path: {property_id}/{tenant_id}/{report_id}/{filename}.
export function buildMaintenancePhotoPath(ctx: MaintenancePhotoContext, filename: string): string {
  return `${ctx.propertyId}/${ctx.tenantId}/${ctx.reportId}/${sanitizePhotoFilename(filename)}`;
}

// Object path only (never a signed/public URL) may be stored as image_url.
export function isStorableImagePath(value: string | null | undefined): boolean {
  if (!value) return false;
  if (/^https?:\/\//i.test(value)) return false;
  if (value.includes('..')) return false;
  const segs = value.split('/');
  return segs.length === 4 && segs.every((x) => x.length > 0) && value.length <= 500;
}
