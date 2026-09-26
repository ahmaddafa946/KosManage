import { supabase } from '@/lib/supabase';
import type { Property } from '@/types/database';

export async function getPrimaryProperty(): Promise<Property | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as Property | null;
}

export async function createProperty(name: string, address?: string | null): Promise<Property> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Sesi berakhir. Silakan login kembali.');
  const { data, error } = await supabase
    .from('properties')
    .insert({ owner_id: user.id, name, address: address ?? null })
    .select()
    .single();
  if (error) throw error;
  return data as Property;
}

export async function updateProperty(id: string, patch: { name?: string; address?: string | null }): Promise<Property> {
  const { data, error } = await supabase
    .from('properties')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Property;
}
