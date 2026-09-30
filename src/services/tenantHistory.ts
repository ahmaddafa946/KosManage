import { supabase } from '@/lib/supabase';
import type { Tenant } from '@/types/database';

export async function getMyRentalHistory(): Promise<Tenant[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Sesi berakhir. Silakan login kembali.');

  const { data, error } = await supabase
    .from('tenants')
    .select('*, room:rooms!tenants_room_id_fkey(id,room_number)')
    .eq('profile_id', user.id)
    .order('start_date', { ascending: false });

  if (error) throw error;
  return data as unknown as Tenant[];
}
