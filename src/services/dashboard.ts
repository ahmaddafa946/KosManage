import { supabase } from '@/lib/supabase';
import type { DashboardSummary, Payment, MaintenancePriority, MaintenanceStatus } from '@/types/database';
import { calculateDaysRemaining, getJakartaDateKey } from '@/lib/rental';

function currentPeriod(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function shiftPeriod(period: string, delta: number): string {
  const [y, m] = period.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return currentPeriod(d);
}

export async function getDashboardSummary(propertyId: string): Promise<DashboardSummary> {
  const period = currentPeriod();
  const [{ data: rooms }, { data: tenants }, { data: monthPayments }, { data: outstanding }] = await Promise.all([
    supabase.from('rooms').select('status').eq('property_id', propertyId),
    supabase.from('tenants').select('id').eq('property_id', propertyId).eq('status', 'active'),
    supabase.from('payments').select('amount_paid').eq('property_id', propertyId).eq('billing_period', period),
    supabase.from('payments').select('amount_due,amount_paid').eq('property_id', propertyId).in('status', ['unpaid', 'partial', 'overdue']),
  ]);
  if (!rooms || !tenants || !monthPayments || !outstanding) throw new Error('Gagal memuat ringkasan. Silakan coba lagi.');
  const by = (s: string) => rooms.filter((r: { status: string }) => r.status === s).length;
  return {
    totalRooms: rooms.length,
    occupiedRooms: by('occupied'),
    availableRooms: by('available'),
    maintenanceRooms: by('maintenance'),
    totalTenants: tenants.length,
    monthlyRevenue: monthPayments.reduce((a: number, p: { amount_paid: number }) => a + Number(p.amount_paid), 0),
    totalOutstanding: outstanding.reduce((a: number, p: { amount_due: number; amount_paid: number }) => a + (Number(p.amount_due) - Number(p.amount_paid)), 0),
  };
}

export async function getRecentPayments(propertyId: string, limit = 8): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*, tenant:tenants!payments_tenant_id_fkey(id,name), room:rooms!payments_room_id_fkey(id,room_number)')
    .eq('property_id', propertyId)
    .order('updated_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as unknown as Payment[];
}

export async function getOutstandingPayments(propertyId: string, limit = 10): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*, tenant:tenants!payments_tenant_id_fkey(id,name), room:rooms!payments_room_id_fkey(id,room_number)')
    .eq('property_id', propertyId)
    .in('status', ['unpaid', 'partial', 'overdue'])
    .order('due_date', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return sortPaymentsDue(data as unknown as Payment[]);
}

export async function getUpcomingPayments(propertyId: string, limit = 10): Promise<Payment[]> {
  const today = new Date().toISOString().slice(0, 10);
  const future = new Date();
  future.setDate(future.getDate() + 14);
  const { data, error } = await supabase
    .from('payments')
    .select('*, tenant:tenants!payments_tenant_id_fkey(id,name), room:rooms!payments_room_id_fkey(id,room_number)')
    .eq('property_id', propertyId)
    .in('status', ['unpaid', 'partial', 'overdue'])
    .lte('due_date', future.toISOString().slice(0, 10))
    .gte('due_date', '2000-01-01')
    .order('due_date', { ascending: true })
    .limit(limit);
  if (error) throw error;
  void today;
  return data as unknown as Payment[];
}

export interface RevenuePoint { period: string; due: number; paid: number; outstanding: number; }

export async function getRevenueReport(propertyId: string, months: string[]): Promise<RevenuePoint[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('billing_period,amount_due,amount_paid')
    .eq('property_id', propertyId)
    .in('billing_period', months);
  if (error) throw error;
  return months.map((period) => {
    const rows = (data as { billing_period: string; amount_due: number; amount_paid: number }[]).filter((r) => r.billing_period === period);
    const due = rows.reduce((a, r) => a + Number(r.amount_due), 0);
    const paid = rows.reduce((a, r) => a + Number(r.amount_paid), 0);
    return { period, due, paid, outstanding: Math.max(0, due - paid) };
  });
}

export function periodRange(kind: 'this_month' | 'last_month' | 'last_3' | 'last_6'): string[] {
  const base = currentPeriod();
  if (kind === 'this_month') return [base];
  if (kind === 'last_month') return [shiftPeriod(base, -1)];
  const n = kind === 'last_3' ? 3 : 6;
  return Array.from({ length: n }, (_, i) => shiftPeriod(base, -(n - 1 - i)));
}


export const MAINTENANCE_STATUS_LABEL: Record<MaintenanceStatus, string> = {
  submitted: 'Diajukan',
  in_progress: 'Sedang Diproses',
  resolved: 'Selesai',
  closed: 'Ditutup',
};

export function remainingAmount(amountDue: number, amountPaid: number): number {
  return Math.max(0, Number(amountDue) - Number(amountPaid));
}

/** Upcoming expiry window: 0..30 Jakarta calendar days inclusive. Past-due and open-ended excluded. */
export function isUpcomingExpiry(daysRemaining: number | null): boolean {
  return daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 30;
}

export interface RentalExpiryItem {
  tenant_id: string;
  tenant_name: string;
  room_number: string | null;
  end_date: string;
  days_remaining: number;
}

export interface MaintenanceDashboardItem {
  id: string;
  title: string;
  room_number: string | null;
  tenant_name: string | null;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  created_at: string;
}

export interface MaintenanceDashboard {
  activeTotal: number;
  inProgress: number;
  submitted: number;
  recent: MaintenanceDashboardItem[];
}

type TenantExpiryRow = {
  id: string;
  name: string;
  end_date: string | null;
  status: string;
  room?: { room_number: string } | null;
};

export function selectUpcomingExpiries(rows: TenantExpiryRow[], now: Date = new Date()): RentalExpiryItem[] {
  const items: RentalExpiryItem[] = [];
  for (const r of rows) {
    if (r.status !== 'active' || !r.end_date) continue;
    const days = calculateDaysRemaining(r.end_date, now);
    if (!isUpcomingExpiry(days)) continue;
    items.push({
      tenant_id: r.id,
      tenant_name: r.name,
      room_number: r.room?.room_number ?? null,
      end_date: r.end_date,
      days_remaining: days as number,
    });
  }
  items.sort((a, b) => a.days_remaining - b.days_remaining || a.end_date.localeCompare(b.end_date));
  return items.slice(0, 8);
}

export async function getMaintenanceDashboard(propertyId: string): Promise<MaintenanceDashboard> {
  const { data, error } = await supabase
    .from('maintenance_reports')
    .select('id,title,priority,status,created_at, room:rooms!maintenance_reports_room_id_fkey(room_number), tenant:tenants!maintenance_reports_tenant_id_fkey(name)')
    .eq('property_id', propertyId)
    .in('status', ['submitted', 'in_progress'])
    .order('created_at', { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as unknown as Array<{
    id: string;
    title: string;
    priority: MaintenancePriority;
    status: MaintenanceStatus;
    created_at: string;
    room?: { room_number: string } | null;
    tenant?: { name: string } | null;
  }>;
  const submitted = rows.filter((r) => r.status === 'submitted').length;
  const inProgress = rows.filter((r) => r.status === 'in_progress').length;
  const recent: MaintenanceDashboardItem[] = rows.slice(0, 5).map((r) => ({
    id: r.id,
    title: r.title,
    room_number: r.room?.room_number ?? null,
    tenant_name: r.tenant?.name ?? null,
    priority: r.priority,
    status: r.status,
    created_at: r.created_at,
  }));
  return { activeTotal: submitted + inProgress, inProgress, submitted, recent };
}

export async function getUpcomingRentalExpiries(propertyId: string, now: Date = new Date()): Promise<RentalExpiryItem[]> {
  const today = getJakartaDateKey(now);
  const horizon = (() => {
    const [y, m, d] = today.split('-').map(Number);
    const t = Date.UTC(y, m - 1, d + 30);
    const dt = new Date(t);
    return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
  })();
  const { data, error } = await supabase
    .from('tenants')
    .select('id,name,end_date,status, room:rooms!tenants_room_id_fkey(room_number)')
    .eq('property_id', propertyId)
    .eq('status', 'active')
    .not('end_date', 'is', null)
    .gte('end_date', today)
    .lte('end_date', horizon)
    .order('end_date', { ascending: true })
    .limit(50);
  if (error) throw error;
  return selectUpcomingExpiries((data ?? []) as unknown as TenantExpiryRow[], now);
}

export function sortPaymentsDue<T extends { status: string; due_date: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const rank = (st: string) => (st === 'overdue' ? 0 : 1);
    const r = rank(a.status) - rank(b.status);
    if (r !== 0) return r;
    return a.due_date.localeCompare(b.due_date);
  });
}
