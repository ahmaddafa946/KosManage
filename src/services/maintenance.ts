import { supabase } from '@/lib/supabase';
import type { MaintenanceReport, MaintenanceStatus } from '@/types/database';
import type { MaintenanceCreateInput, MaintenanceOwnerUpdateInput } from '@/schemas/maintenance';
import {
  MAINTENANCE_BUCKET,
  buildMaintenancePhotoPath,
  isStorableImagePath,
  validateMaintenancePhoto,
} from '@/lib/maintenancePhoto';

export interface MaintenanceFilters {
  status?: MaintenanceStatus | 'all';
  tenantId?: string;
  roomId?: string;
}

// Owner: reports of one owned property (RLS enforces ownership).
export async function getMaintenanceReports(
  propertyId: string,
  f: MaintenanceFilters = {},
): Promise<MaintenanceReport[]> {
  let q = supabase
    .from('maintenance_reports')
    .select('*')
    .eq('property_id', propertyId)
    .order('created_at', { ascending: false });
  if (f.status && f.status !== 'all') q = q.eq('status', f.status);
  if (f.tenantId) q = q.eq('tenant_id', f.tenantId);
  if (f.roomId) q = q.eq('room_id', f.roomId);
  const { data, error } = await q;
  if (error) throw error;
  return data as MaintenanceReport[];
}

export async function getMaintenanceReport(id: string): Promise<MaintenanceReport | null> {
  const { data, error } = await supabase.from('maintenance_reports').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as MaintenanceReport | null;
}

// Tenant: own reports only (RLS restricts to linked tenant rows).
export async function getMyMaintenanceReports(): Promise<MaintenanceReport[]> {
  const { data, error } = await supabase
    .from('maintenance_reports')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as MaintenanceReport[];
}

export interface CreateMaintenanceContext {
  propertyId: string;
  tenantId: string;
  roomId: string | null;
}

// propertyId/tenantId/roomId come from the caller's verified session
// context (own active tenant record), never from free client input.
export async function createMaintenanceReport(
  ctx: CreateMaintenanceContext,
  input: MaintenanceCreateInput,
): Promise<MaintenanceReport> {
  const { data, error } = await supabase
    .from('maintenance_reports')
    .insert({
      property_id: ctx.propertyId,
      tenant_id: ctx.tenantId,
      room_id: ctx.roomId,
      title: input.title,
      description: input.description,
      category: input.category,
      priority: input.priority,
    })
    .select()
    .single();
  if (error) throw error;
  return data as MaintenanceReport;
}

export async function updateMaintenanceReport(
  id: string,
  patch: MaintenanceOwnerUpdateInput,
): Promise<MaintenanceReport> {
  const { data, error } = await supabase
    .from('maintenance_reports')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as MaintenanceReport;
}

// Tenant edit: content fields only; status change rejected client-side
// (DB trigger rejects non-owner status changes regardless).
export async function updateMyMaintenanceReport(
  id: string,
  patch: Partial<MaintenanceCreateInput>,
): Promise<MaintenanceReport> {
  const { title, description, category, priority } = patch;
  const { data, error } = await supabase
    .from('maintenance_reports')
    .update({ title, description, category, priority })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as MaintenanceReport;
}

// ---------------------------------------------------------------------------
// Slice 6: two-step photo flow (D9). image_url stores the STORAGE OBJECT
// PATH, never a signed URL. Signed URLs are minted only for display.
// ---------------------------------------------------------------------------

export const MAINTENANCE_PHOTO_URL_TTL_SECONDS = 3600; // 1h (AS-031)

export { MAINTENANCE_BUCKET };

// Trusted context resolved from the report row itself (not caller input):
// upload(reportId, file) reads the report, builds the exact path from its
// property_id/tenant_id/id, uploads with upsert:false, then attaches.
export async function uploadMaintenanceReportPhoto(reportId: string, file: File): Promise<string> {
  const check = validateMaintenancePhoto(file);
  if (!check.ok) throw new Error(check.error ?? 'Foto tidak valid.');
  const report = await getMaintenanceReport(reportId);
  if (!report) throw new Error('Laporan tidak ditemukan.');
  const objectPath = buildMaintenancePhotoPath(
    { propertyId: report.property_id, tenantId: report.tenant_id, reportId: report.id },
    file.name,
  );
  const { error } = await supabase.storage
    .from(MAINTENANCE_BUCKET)
    .upload(objectPath, file, { upsert: false, contentType: file.type });
  if (error) throw new Error(mapStorageError(error.message));
  await attachMaintenanceReportPhoto(reportId, objectPath);
  return objectPath;
}

// Narrow attach: ONLY image_url may change here. The dedicated surface
// avoids exposing the generic update path to tenant code.
export async function attachMaintenanceReportPhoto(
  reportId: string,
  objectPath: string,
): Promise<MaintenanceReport> {
  if (!isStorableImagePath(objectPath)) throw new Error('Path foto tidak valid.');
  const { data, error } = await supabase
    .from('maintenance_reports')
    .update({ image_url: objectPath })
    .eq('id', reportId)
    .select()
    .single();
  if (error) throw error;
  return data as MaintenanceReport;
}

// Display-only: mint a short-lived signed URL from the stored object path.
export async function getMaintenanceReportPhotoUrl(
  objectPath: string | null,
  expiresIn = MAINTENANCE_PHOTO_URL_TTL_SECONDS,
): Promise<string | null> {
  if (!objectPath) return null;
  if (!isStorableImagePath(objectPath)) throw new Error('Path foto tidak valid.');
  const { data, error } = await supabase.storage
    .from(MAINTENANCE_BUCKET)
    .createSignedUrl(objectPath, expiresIn);
  if (error) throw new Error(mapStorageError(error.message));
  return data.signedUrl;
}

function mapStorageError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('exceeded') || m.includes('too large') || m.includes('max')) {
    return 'Ukuran foto melebihi 5 MB.';
  }
  if (m.includes('mime') || m.includes('type') || m.includes('format')) {
    return 'Tipe file tidak didukung. Gunakan JPG, PNG, atau WebP.';
  }
  if (m.includes('not found') || m.includes('does not exist')) {
    return 'Laporan atau foto tidak ditemukan.';
  }
  if (m.includes('permission') || m.includes('denied') || m.includes('unauthorized') || m.includes('forbidden')) {
    return 'Akses ditolak. Anda tidak berhak atas foto ini.';
  }
  if (m.includes('duplicate') || m.includes('already exists')) {
    return 'Foto sudah ada. Muat ulang dan coba lagi.';
  }
  return 'Unggah foto gagal. Coba lagi.';
}
