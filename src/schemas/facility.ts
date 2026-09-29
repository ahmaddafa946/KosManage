import { z } from 'zod';

export const facilitySchema = z.object({
  name: z
    .string()
    .transform((v) => normalizeFacilityName(v))
    .pipe(z.string().min(1, 'Nama fasilitas wajib diisi.').max(100, 'Nama fasilitas maksimal 100 karakter.')),
  is_active: z.boolean().default(true),
});

export type FacilityInput = z.infer<typeof facilitySchema>;

export const facilityIdsSchema = z.array(z.string().uuid('ID fasilitas tidak valid.'));

// ponytail: dedupe case-insensitive hanya di client; uniqueness final
// ditegakkan unique index DB (property_id, lower(name)).
export function normalizeFacilityName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

// Mirror of the DB backfill tokenization (corrective migration 20260331):
// legacy used BOTH '+' and ',' as separators. Split on both, trim,
// drop empties, cap 100 chars, dedupe case-insensitively per property.
export function parseLegacyFacilityTokens(legacy: string | null | undefined): string[] {
  if (!legacy) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of legacy.replace(/\+/g, ',').split(',')) {
    const token = normalizeFacilityName(raw);
    if (!token || token.length > 100) continue;
    const key = token.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(token);
  }
  return out;
}
