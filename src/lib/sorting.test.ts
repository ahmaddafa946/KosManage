import { describe, expect, it } from 'vitest';
import { sortRows, type SortDirection } from '@/lib/sorting';

describe('sortRows', () => {
  const direction: SortDirection = 'asc';

  it('mengurutkan nomor kamar secara numerik-natural', () => {
    const rows = [{ room: '10' }, { room: '2' }, { room: '1' }, { room: '20A' }];
    expect(sortRows(rows, (row) => row.room, direction, 'natural').map((row) => row.room))
      .toEqual(['1', '2', '10', '20A']);
  });

  it('mengurutkan angka secara ascending dan descending', () => {
    const rows = [{ value: 1500000 }, { value: 900000 }, { value: 1200000 }];
    expect(sortRows(rows, (row) => row.value, 'asc', 'number').map((row) => row.value))
      .toEqual([900000, 1200000, 1500000]);
    expect(sortRows(rows, (row) => row.value, 'desc', 'number').map((row) => row.value))
      .toEqual([1500000, 1200000, 900000]);
  });

  it('menempatkan nilai kosong di belakang pada kedua arah', () => {
    const rows = [{ value: null }, { value: 'Budi' }, { value: 'Andi' }];
    expect(sortRows(rows, (row) => row.value, 'asc', 'text').map((row) => row.value))
      .toEqual(['Andi', 'Budi', null]);
    expect(sortRows(rows, (row) => row.value, 'desc', 'text').map((row) => row.value))
      .toEqual(['Budi', 'Andi', null]);
  });

  it('mengurutkan tanggal ISO secara kronologis', () => {
    const rows = [{ date: '2026-09-10' }, { date: '2026-08-01' }, { date: '2026-09-01' }];
    expect(sortRows(rows, (row) => row.date, 'asc', 'date').map((row) => row.date))
      .toEqual(['2026-08-01', '2026-09-01', '2026-09-10']);
  });
});
