import { supabase } from '@/lib/supabase';
import type { Facility } from '@/types/database';
import { normalizeFacilityName } from '@/schemas/facility';

export async function getFacilities(propertyId: string, includeInactive = false): Promise<Facility[]> {
  let q = supabase.from('facilities').select('*').eq('property_id', propertyId).order('name');
  if (!includeInactive) q = q.eq('is_active', true);
  const { data, error } = await q;
  if (error) throw error;
  return data as Facility[];
}

export async function createFacility(propertyId: string, name: string): Promise<Facility> {
  const clean = normalizeFacilityName(name);
  if (!clean) throw new Error('Nama fasilitas wajib diisi.');
  const { data, error } = await supabase
    .from('facilities')
    .insert({ property_id: propertyId, name: clean })
    .select()
    .single();
  if (error) throw error;
  return data as Facility;
}

export async function setFacilityActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase.from('facilities').update({ is_active: isActive }).eq('id', id);
  if (error) throw error;
}

export async function deleteFacility(id: string): Promise<void> {
  const { error } = await supabase.from('facilities').delete().eq('id', id);
  if (error) throw error;
}

// Links for a batch of rooms in one query: { roomId: facilityId[] }.
export async function getRoomFacilityMap(roomIds: string[]): Promise<Record<string, string[]>> {
  if (roomIds.length === 0) return {};
  const { data, error } = await supabase
    .from('room_facilities')
    .select('room_id, facility_id')
    .in('room_id', roomIds);
  if (error) throw error;
  const map: Record<string, string[]> = {};
  for (const row of (data ?? []) as { room_id: string; facility_id: string }[]) {
    (map[row.room_id] ??= []).push(row.facility_id);
  }
  return map;
}

// Sync M2M links to exactly targetIds (diff delete + insert).
export async function setRoomFacilities(roomId: string, targetIds: string[]): Promise<void> {
  const { data: current, error: readErr } = await supabase
    .from('room_facilities')
    .select('facility_id')
    .eq('room_id', roomId);
  if (readErr) throw readErr;
  const have = new Set(((current ?? []) as { facility_id: string }[]).map((r) => r.facility_id));
  const want = new Set(targetIds);
  const toDelete = [...have].filter((id) => !want.has(id));
  const toAdd = [...want].filter((id) => !have.has(id));
  if (toDelete.length > 0) {
    const { error } = await supabase
      .from('room_facilities')
      .delete()
      .eq('room_id', roomId)
      .in('facility_id', toDelete);
    if (error) throw error;
  }
  if (toAdd.length > 0) {
    const { error } = await supabase
      .from('room_facilities')
      .insert(toAdd.map((facility_id) => ({ room_id: roomId, facility_id })));
    if (error) throw error;
  }
}

// Pure: merge selected active ids with preserved inactive-linked ids so
// saving never silently drops links hidden from the checkbox list.
export function mergeFacilitySelection(selectedActive: string[], preservedInactive: string[]): string[] {
  return [...new Set([...selectedActive, ...preservedInactive])];
}
