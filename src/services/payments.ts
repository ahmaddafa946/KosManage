import { supabase } from '@/lib/supabase';
import type { Payment, PaymentMethod, PaymentStatus } from '@/types/database';
import type { PaymentInput } from '@/schemas/payment';

export interface PaymentFilters {
  billingPeriod?: string;
  status?: PaymentStatus | 'all';
  method?: PaymentMethod | 'all';
  tenantId?: string;
}

export async function getPayments(propertyId: string, f: PaymentFilters = {}): Promise<Payment[]> {
  let q = supabase
    .from('payments')
    .select('*, tenant:tenants!payments_tenant_id_fkey(id,name), room:rooms!payments_room_id_fkey(id,room_number)')
    .eq('property_id', propertyId);
  if (f.billingPeriod) q = q.eq('billing_period', f.billingPeriod);
  if (f.status && f.status !== 'all') q = q.eq('status', f.status);
  if (f.method && f.method !== 'all') q = q.eq('payment_method', f.method);
  if (f.tenantId) q = q.eq('tenant_id', f.tenantId);
  q = q.order('due_date', { ascending: false });
  const { data, error } = await q;
  if (error) throw error;
  return data as unknown as Payment[];
}

export async function getPayment(id: string) {
  const { data, error } = await supabase
    .from('payments')
    .select('*, tenant:tenants!payments_tenant_id_fkey(*), room:rooms!payments_room_id_fkey(*)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createPayment(propertyId: string, input: PaymentInput): Promise<Payment> {
  const payload = {
    property_id: propertyId,
    tenant_id: input.tenant_id,
    billing_period: input.billing_period,
    due_date: input.due_date,
    amount_due: input.amount_due,
    amount_paid: input.amount_paid ?? 0,
    payment_date: input.payment_date || null,
    payment_method: input.payment_method ?? null,
    notes: input.notes ?? null,
  };
  const { data, error } = await supabase.from('payments').insert(payload).select().single();
  if (error) throw error;
  return data as Payment;
}

export async function updatePayment(id: string, patch: Partial<PaymentInput>): Promise<Payment> {
  const normalized = { ...patch } as Record<string, unknown>;
  if (normalized.payment_date === '') normalized.payment_date = null;
  const { data, error } = await supabase.from('payments').update(normalized).eq('id', id).select().single();
  if (error) throw error;
  return data as Payment;
}

export async function deletePayment(id: string): Promise<void> {
  const { error } = await supabase.from('payments').delete().eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Tenant bills + SIMULASI flow. Tenant never writes payments directly:
// completion goes through the start_simulated_payment RPC (no amount input).
// ---------------------------------------------------------------------------

export async function getMyBills(): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*, room:rooms!payments_room_id_fkey(id,room_number)')
    .order('due_date', { ascending: false });
  if (error) throw error;
  return data as unknown as Payment[];
}

export async function startSimulatedPayment(paymentId: string, method: PaymentMethod): Promise<Payment> {
  const { data, error } = await supabase.rpc('start_simulated_payment', {
    p_payment_id: paymentId,
    p_payment_method: method,
  });
  if (error) throw new Error(mapPaymentError(error.message));
  return data as Payment;
}

function mapPaymentError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('not authenticated')) return 'Anda harus masuk terlebih dahulu.';
  if (m.includes('invalid payment method')) return 'Metode pembayaran tidak valid.';
  if (m.includes('payment not found')) return 'Tagihan tidak ditemukan.';
  if (m.includes('access denied')) return 'Akses ditolak. Tagihan ini bukan milik Anda.';
  return 'Pembayaran simulasi gagal. Coba lagi.';
}
