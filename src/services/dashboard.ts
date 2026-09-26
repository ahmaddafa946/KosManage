import { supabase } from '@/lib/supabase';
import type { DashboardSummary, Payment } from '@/types/database';

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
  return data as unknown as Payment[];
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
