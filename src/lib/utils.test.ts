import { describe, expect, it } from 'vitest';
import { formatRupiah, formatDate } from '@/lib/utils';

describe('format utils', () => {
  it('formatRupiah format IDR tanpa desimal', () => {
    const out = formatRupiah(1500000);
    expect(out).toContain('Rp');
    expect(out).toContain('1.500.000');
  });

  it('formatDate tanggal valid id-ID, null jadi dash', () => {
    expect(formatDate(null)).toBe('-');
    expect(formatDate('2026-03-10')).toContain('2026');
  });
});
