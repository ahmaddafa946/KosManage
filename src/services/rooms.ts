import { supabase } from '@/lib/supabase';
import type { Room, RoomStatus } from '@/types/database';
import type { RoomInput } from '@/schemas/room';

export interface RoomFilters {
  q?: string;
  status?: RoomStatus | 'all';
  orderBy?: 'room_number' | 'price' | 'status';
  ascending?: boolean;
}

export async function getRooms(propertyId: string, f: RoomFilters = {}): Promise<Room[]> {
  let q = supabase.from('rooms').select('*').eq('property_id', propertyId);
  if (f.q) q = q.ilike('room_number', `%${f.q}%`);
  if (f.status && f.status !== 'all') q = q.eq('status', f.status);
  const col = f.orderBy ?? 'room_number';
  q = q.order(col, { ascending: f.ascending ?? true });
  const { data, error } = await q;
  if (error) throw error;
  return data as Room[];
}

export async function getRoom(id: string): Promise<Room | null> {
  const { data, error } = await supabase
    .from('rooms')
    .select('*, active_tenant:tenants!tenants_room_id_fkey(*)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as unknown as Room & { active_tenant: unknown };
  const list = Array.isArray(row.active_tenant) ? row.active_tenant : row.active_tenant ? [row.active_tenant] : [];
  const active = (list as Room['active_tenant'][]).find((t) => t && typeof t === 'object' && (t as { status?: string }).status === 'active') ?? null;
  return { ...(row as Room), active_tenant: active ?? null };
}

export async function getAvailableRooms(propertyId: string): Promise<Room[]> {
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('property_id', propertyId)
    .eq('status', 'available')
    .order('room_number');
  if (error) throw error;
  return data as Room[];
}

export async function createRoom(propertyId: string, input: RoomInput): Promise<Room> {
  const { data, error } = await supabase
    .from('rooms')
    .insert({ property_id: propertyId, ...input })
    .select()
    .single();
  if (error) throw error;
  return data as Room;
}

export async function updateRoom(id: string, patch: Partial<RoomInput>): Promise<Room> {
  const { data, error } = await supabase.from('rooms').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data as Room;
}

export async function deleteRoom(id: string): Promise<void> {
  const { error } = await supabase.from('rooms').delete().eq('id', id);
  if (error) throw error;
}
