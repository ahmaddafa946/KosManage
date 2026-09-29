import { supabase } from '@/lib/supabase';
import type { MaintenanceReport, MaintenanceStatus } from '@/types/database';
import type { MaintenanceCreateInput, MaintenanceOwnerUpdateInput } from '@/schemas/maintenance';

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
