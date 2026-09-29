import { describe, expect, it } from 'vitest';
import { facilitySchema, facilityIdsSchema, normalizeFacilityName, parseLegacyFacilityTokens } from '@/schemas/facility';
import { mergeFacilitySelection } from './facilities';

describe('facilitySchema', () => {
  it('menolak nama kosong', () => {
    expect(facilitySchema.safeParse({ name: '   ' }).success).toBe(false);
  });
  it('menolak nama > 100 char', () => {
    expect(facilitySchema.safeParse({ name: 'x'.repeat(101) }).success).toBe(false);
  });
  it('menerima input valid, default is_active true', () => {
    const r = facilitySchema.safeParse({ name: ' WiFi ' });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.name).toBe('WiFi');
      expect(r.data.is_active).toBe(true);
    }
  });
});

describe('facilityIdsSchema', () => {
  it('menolak id bukan uuid', () => {
    expect(facilityIdsSchema.safeParse(['bukan-uuid']).success).toBe(false);
  });
  it('menerima array uuid', () => {
    expect(facilityIdsSchema.safeParse(['123e4567-e89b-12d3-a456-426614174000']).success).toBe(true);
  });
});

describe('dedupe case + whitespace ("AC", " ac ", "AC" -> satu)', () => {
  it('schema trim whitespace, case dipertahankan; DB unique index yang dedupe case', () => {
    const a = facilitySchema.safeParse({ name: 'AC' });
    const c = facilitySchema.safeParse({ name: ' ac ' });
    expect(a.success && c.success).toBe(true);
    if (a.success && c.success) {
      expect(a.data.name).toBe('AC');
      expect(c.data.name).toBe('ac');
      // unik per property dijamin DB: lower(btrim(name))
      expect(a.data.name.toLowerCase()).toBe(c.data.name.toLowerCase());
    }
  });
  it('normalizeFacilityName menyamakan varian whitespace/case', () => {
    const n = (v: string) => normalizeFacilityName(v).toLowerCase();
    expect(new Set(['AC', ' ac ', 'AC'].map(n)).size).toBe(1);
  });
});

describe('normalizeFacilityName', () => {
  it('trim + collapse whitespace', () => {
    expect(normalizeFacilityName('  AC   Central  ')).toBe('AC Central');
  });
});

describe('mergeFacilitySelection', () => {
  it('menggabung selected + inactive-linked tanpa duplikat', () => {
    expect(mergeFacilitySelection(['a', 'b'], ['b', 'c'])).toEqual(['a', 'b', 'c']);
  });
  it('tidak menghapus link inactive yang disembunyikan dari checkbox', () => {
    expect(mergeFacilitySelection([], ['x'])).toEqual(['x']);
  });
});

describe('parseLegacyFacilityTokens (corrective 20260331)', () => {
  it('"AC + Kasur + Lemari + Listrik + Wifi" -> 5', () => {
    expect(parseLegacyFacilityTokens('AC + Kasur + Lemari + Listrik + Wifi')).toEqual(
      ['AC', 'Kasur', 'Lemari', 'Listrik', 'Wifi']
    );
  });
  it('"AC, WiFi, Kamar Mandi" -> 3', () => {
    expect(parseLegacyFacilityTokens('AC, WiFi, Kamar Mandi')).toEqual(['AC', 'WiFi', 'Kamar Mandi']);
  });
  it('"AC + AC + ac" -> 1 (case-insensitive dedupe)', () => {
    expect(parseLegacyFacilityTokens('AC + AC + ac')).toEqual(['AC']);
  });
  it('trim whitespace + ignore empty tokens', () => {
    expect(parseLegacyFacilityTokens('  AC  +  + Kasur ,, ')).toEqual(['AC', 'Kasur']);
  });
  it('"AC + Kasur, Lemari + Wifi" -> 4 (mixed delimiter CASE B)', () => {
    expect(parseLegacyFacilityTokens('AC + Kasur, Lemari + Wifi')).toEqual(
      ['AC', 'Kasur', 'Lemari', 'Wifi']
    );
  });
  it('null/empty -> []', () => {
    expect(parseLegacyFacilityTokens(null)).toEqual([]);
    expect(parseLegacyFacilityTokens('')).toEqual([]);
  });
});
