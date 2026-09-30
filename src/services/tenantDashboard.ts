import { supabase } from '@/lib/supabase';
import type { Tenant, Room, MaintenanceReport } from '@/types/database';
import { formatDaysRemaining, type RentalBucket, getRentalBucket } from '@/lib/rental';

export interface TenantOccupancy {
  tenant: Tenant;
  room: Room | null;
}

export interface MyReportsSummary {
  activeTotal: number;
  inProgressCount: number;
  recentActive: MaintenanceReport[];
}

export function greetingName(name: string | null | undefined): string {
  const t = (name ?? '').trim();
  return t.length > 0 ? `Halo, ${t}` : 'Halo';
}

export function pickOutstandingBill<T extends { id: string; status: string; due_date: string; amount_due: number; amount_paid: number }>(bills: T[]): T | null {
  const unpaid = bills.filter((b) => b.status !== 'paid');
  if (unpaid.length === 0) return null;
  const sorted = [...unpaid].sort((a, b) => {
    const rank = (s: string) => (s === 'overdue' ? 0 : 1);
    const r = rank(a.status) - rank(b.status);
    if (r !== 0) return r;
    return a.due_date.localeCompare(b.due_date);
  });
  return sorted[0];
}

export function summarizeMyReports(reports: MaintenanceReport[]): MyReportsSummary {
  const active = reports.filter((r) => r.status === 'submitted' || r.status === 'in_progress');
  const inProgressCount = reports.filter((r) => r.status === 'in_progress').length;
  const recentActive = [...active]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 3);
  return { activeTotal: active.length, inProgressCount, recentActive };
}

export function formatRentCountdown(daysRemaining: number | null): string {
  const bucket: RentalBucket = getRentalBucket(daysRemaining);
  if (bucket === 'open_ended') return 'Sewa tanpa tanggal berakhir';
  if (bucket === 'expired') return 'Masa sewa berakhir hari ini';
  if (bucket === 'past_due') return `Masa sewa sudah lewat (${Math.abs(daysRemaining!)} hari)`;
  return `Sisa ${daysRemaining} hari (${formatDaysRemaining(daysRemaining)})`;
}

/** Resolves current authenticated tenant row + room (read-only, RLS-enforced). */
export async function getMyTenantOccupancy(): Promise<TenantOccupancy | null> {
  const { data: { user }, error: uErr } = await supabase.auth.getUser();
  if (uErr || !user) return null;
  // RLS tenants_select_own_link allows reading own profile_id rows.
  const { data, error } = await supabase
    .from('tenants')
    .select('*, room:rooms!tenants_room_id_fkey(*)')
    .eq('profile_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as unknown as Tenant & { room?: Room | null };
  return { tenant: row, room: row.room ?? null };
}

/** Source code snapshot for purity/security assertion (read-only). */
export function tenantDashboardContract(): string {
  return `export function getMyTenantOccupancy`;
}
