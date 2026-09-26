import { supabase } from '@/lib/supabase';
import type { Tenant, TenantStatus } from '@/types/database';
import type { TenantInput } from '@/schemas/tenant';

export interface TenantFilters {
  q?: string;
  status?: TenantStatus | 'all';
}

function clean(input: TenantInput) {
  return {
    ...input,
    email: input.email === '' ? null : input.email ?? null,
    end_date: input.end_date === '' ? null : input.end_date ?? null,
    deposit: input.deposit ?? null,
  };
}

export async function getTenants(propertyId: string, f: TenantFilters = {}): Promise<Tenant[]> {
  let q = supabase.from('tenants').select('*, room:rooms!tenants_room_id_fkey(id,room_number,status)').eq('property_id', propertyId);
  if (f.status && f.status !== 'all') q = q.eq('status', f.status);
  if (f.q) q = q.or(`name.ilike.%${f.q}%,phone.ilike.%${f.q}%`);
  q = q.order('name');
  const { data, error } = await q;
  if (error) throw error;
  return data as unknown as Tenant[];
}

export async function getTenant(id: string) {
  const { data, error } = await supabase
    .from('tenants')
    .select('*, room:rooms!tenants_room_id_fkey(*), payments:payments!payments_tenant_id_fkey(*)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createTenant(propertyId: string, input: TenantInput): Promise<Tenant> {
  const { data, error } = await supabase
    .from('tenants')
    .insert({ property_id: propertyId, ...clean(input) })
    .select()
    .single();
  if (error) throw error;
  return data as Tenant;
}

export async function updateTenant(id: string, patch: Partial<TenantInput>): Promise<Tenant> {
  const normalized = { ...patch } as Record<string, unknown>;
  if (normalized.email === '') normalized.email = null;
  if (normalized.end_date === '') normalized.end_date = null;
  const { data, error } = await supabase.from('tenants').update(normalized).eq('id', id).select().single();
  if (error) throw error;
  return data as Tenant;
}

export async function deactivateTenant(id: string, endDate?: string | null): Promise<Tenant> {
  const patch: Record<string, unknown> = { status: 'inactive' };
  if (endDate) patch.end_date = endDate;
  const { data, error } = await supabase.from('tenants').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data as Tenant;
}

export async function deleteTenant(id: string): Promise<void> {
  const { error } = await supabase.from('tenants').delete().eq('id', id);
  if (error) throw error;
}
