import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types/database';
import type { TenantProfileUpdateInput } from '@/schemas/profile';

export async function getMyProfile(): Promise<Profile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Sesi berakhir. Silakan login kembali.');

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (error) throw error;
  return (data as Profile | null) ?? null;
}

/**
 * Guarded self-edit: the payload is explicitly whitelisted.
 * Never accepts or forwards role/id/ownership/payment fields.
 */
export async function updateMyProfile(input: TenantProfileUpdateInput): Promise<Profile> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Sesi berakhir. Silakan login kembali.');

  const payload = {
    full_name: input.full_name.trim(),
    phone: input.phone?.trim() ? input.phone.trim() : null,
  };

  const { data, error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', user.id)
    .select('*')
    .single();

  if (error) throw error;
  return data as Profile;
}