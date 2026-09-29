import { describe, expect, it } from 'vitest';
import {
  calculateDaysRemaining,
  formatDaysRemaining,
  getJakartaDateKey,
  getRentalBucket,
  getRentalStatus,
} from './rental';

// Fixed reference: 2026-10-01 12:00 WIB == 2026-10-01T05:00:00Z.
const NOW = new Date('2026-10-01T05:00:00.000Z');

describe('getJakartaDateKey', () => {
  it('memakai tanggal kalender Jakarta, bukan UTC', () => {
    // 2026-10-01T17:00Z == 2026-10-02 00:00 WIB.
    expect(getJakartaDateKey(new Date('2026-10-01T17:00:00.000Z'))).toBe('2026-10-02');
    expect(getJakartaDateKey(new Date('2026-10-01T16:59:59.000Z'))).toBe('2026-10-01');
  });
});

describe('calculateDaysRemaining (now Jakarta = 2026-10-01)', () => {
  it('exact 0: end hari ini', () => {
    expect(calculateDaysRemaining('2026-10-01', NOW)).toBe(0);
  });
  it('1 day', () => {
    expect(calculateDaysRemaining('2026-10-02', NOW)).toBe(1);
  });
  it('6 days', () => {
    expect(calculateDaysRemaining('2026-10-07', NOW)).toBe(6);
  });
  it('7 days', () => {
    expect(calculateDaysRemaining('2026-10-08', NOW)).toBe(7);
  });
  it('14 days', () => {
    expect(calculateDaysRemaining('2026-10-15', NOW)).toBe(14);
  });
  it('15 days', () => {
    expect(calculateDaysRemaining('2026-10-16', NOW)).toBe(15);
  });
  it('30 days', () => {
    expect(calculateDaysRemaining('2026-10-31', NOW)).toBe(30);
  });
  it('31 days', () => {
    expect(calculateDaysRemaining('2026-11-01', NOW)).toBe(31);
  });
  it('negative / past due', () => {
    expect(calculateDaysRemaining('2026-09-30', NOW)).toBe(-1);
    expect(calculateDaysRemaining('2026-09-01', NOW)).toBe(-30);
  });
  it('null end_date -> null (open-ended, bukan 0)', () => {
    expect(calculateDaysRemaining(null, NOW)).toBeNull();
    expect(calculateDaysRemaining(undefined, NOW)).toBeNull();
    expect(calculateDaysRemaining('', NOW)).toBeNull();
  });
  it('midnight boundary Jakarta: instant UTC beda hari tapi kalender Jakarta sama', () => {
    // 2026-10-01T17:00Z masih 2026-10-01 UTC tapi sudah 2026-10-02 WIB.
    const late = new Date('2026-10-01T17:00:00.000Z');
    expect(calculateDaysRemaining('2026-10-02', late)).toBe(0);
    expect(calculateDaysRemaining('2026-10-02', NOW)).toBe(1);
  });
  it('month boundary + year boundary', () => {
    expect(calculateDaysRemaining('2026-11-01', new Date('2026-10-31T17:00:00.000Z'))).toBe(0);
    expect(calculateDaysRemaining('2027-01-01', new Date('2026-12-31T17:00:00.000Z'))).toBe(0);
  });
  it('leap year: 2028-02-29 valid', () => {
    const ref = new Date('2028-02-28T17:00:00.000Z'); // 2028-02-29 WIB
    expect(calculateDaysRemaining('2028-02-29', ref)).toBe(0);
    expect(calculateDaysRemaining('2028-03-01', ref)).toBe(1);
  });
  it('invalid date fail safely -> null', () => {
    expect(calculateDaysRemaining('2026-13-01', NOW)).toBeNull();
    expect(calculateDaysRemaining('2026-02-30', NOW)).toBeNull();
    expect(calculateDaysRemaining('2027-02-29', NOW)).toBeNull(); // 2027 bukan kabisat
    expect(calculateDaysRemaining('bukan-tanggal', NOW)).toBeNull();
    expect(calculateDaysRemaining('2026-1-5', NOW)).toBeNull(); // format tidak ketat
  });
  it('deterministic dengan injected now', () => {
    expect(calculateDaysRemaining('2026-10-10', NOW)).toBe(
      calculateDaysRemaining('2026-10-10', new Date(NOW.getTime())),
    );
  });
});

describe('getRentalBucket', () => {
  it('seluruh bucket', () => {
    expect(getRentalBucket(31)).toBe('normal');
    expect(getRentalBucket(100)).toBe('normal');
    expect(getRentalBucket(30)).toBe('attention');
    expect(getRentalBucket(15)).toBe('attention');
    expect(getRentalBucket(14)).toBe('soon');
    expect(getRentalBucket(7)).toBe('soon');
    expect(getRentalBucket(6)).toBe('very_soon');
    expect(getRentalBucket(1)).toBe('very_soon');
    expect(getRentalBucket(0)).toBe('expired');
    expect(getRentalBucket(-1)).toBe('past_due');
    expect(getRentalBucket(-99)).toBe('past_due');
    expect(getRentalBucket(null)).toBe('open_ended');
  });
});

describe('getRentalStatus + formatDaysRemaining (id)', () => {
  it('menggabung days + bucket', () => {
    expect(getRentalStatus('2026-10-01', NOW)).toEqual({ daysRemaining: 0, bucket: 'expired' });
    expect(getRentalStatus(null, NOW)).toEqual({ daysRemaining: null, bucket: 'open_ended' });
  });
  it('label bahasa Indonesia', () => {
    expect(formatDaysRemaining(31)).toBe('normal');
    expect(formatDaysRemaining(20)).toBe('perhatian');
    expect(formatDaysRemaining(10)).toBe('segera');
    expect(formatDaysRemaining(3)).toBe('sangat segera');
    expect(formatDaysRemaining(0)).toBe('berakhir hari ini');
    expect(formatDaysRemaining(-5)).toBe('sudah lewat');
    expect(formatDaysRemaining(null)).toBe('tanpa tanggal berakhir');
  });
});
