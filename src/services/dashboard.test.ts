import { describe, expect, it } from 'vitest';
import {
  remainingAmount,
  isUpcomingExpiry,
  MAINTENANCE_STATUS_LABEL,
  selectUpcomingExpiries,
  sortPaymentsDue,
} from './dashboard';

describe('remainingAmount (display only)', () => {
  it('sisa = due - paid, tidak negatif', () => {
    expect(remainingAmount(1_500_000, 500_000)).toBe(1_000_000);
    expect(remainingAmount(100, 100)).toBe(0);
    expect(remainingAmount(100, 150)).toBe(0);
  });
});

describe('upcoming rental window (Jakarta, 0..30 inclusive)', () => {
  const now = new Date('2026-10-01T00:00:00+07:00');

  it('include 0 (berakhir hari ini) sampai 30, exclude past_due dan open-ended', () => {
    expect(isUpcomingExpiry(30)).toBe(true);
    expect(isUpcomingExpiry(15)).toBe(true);
    expect(isUpcomingExpiry(0)).toBe(true);
    expect(isUpcomingExpiry(31)).toBe(false);
    expect(isUpcomingExpiry(-1)).toBe(false);
    expect(isUpcomingExpiry(null)).toBe(false);
  });

  it('selectUpcomingExpiries: active + end_date, urut daysRemaining, inject now', () => {
    const rows = [
      { id: 'a', name: 'Ahmad', end_date: '2026-10-13', status: 'active', room: { room_number: 'A-01' } },
      { id: 'b', name: 'Budi', end_date: '2026-09-30', status: 'active', room: { room_number: 'B-02' } },
      { id: 'c', name: 'Cici', end_date: null, status: 'active', room: { room_number: 'C-03' } },
      { id: 'd', name: 'Dedi', end_date: '2026-10-02', status: 'inactive', room: { room_number: 'D-04' } },
      { id: 'e', name: 'Eka', end_date: '2026-11-01', status: 'active', room: { room_number: 'E-05' } },
    ];
    const out = selectUpcomingExpiries(rows, now);
    expect(out.map((x) => x.tenant_id)).toEqual(['a']);
    expect(out[0].days_remaining).toBe(12);
    expect(out[0].room_number).toBe('A-01');
  });

  it('hari ini masuk upcoming, kemarin tidak', () => {
    const rows = [
      { id: 'today', name: 'T', end_date: '2026-10-01', status: 'active', room: { room_number: 'T-01' } },
      { id: 'yest', name: 'Y', end_date: '2026-09-30', status: 'active', room: { room_number: 'Y-01' } },
    ];
    const out = selectUpcomingExpiries(rows, now);
    expect(out.map((x) => x.tenant_id)).toEqual(['today']);
    expect(out[0].days_remaining).toBe(0);
  });
});

describe('maintenance labels (SSOT, no invented status)', () => {
  it('empat status resmi', () => {
    expect(MAINTENANCE_STATUS_LABEL.submitted).toBe('Diajukan');
    expect(MAINTENANCE_STATUS_LABEL.in_progress).toBe('Sedang Diproses');
    expect(MAINTENANCE_STATUS_LABEL.resolved).toBe('Selesai');
    expect(MAINTENANCE_STATUS_LABEL.closed).toBe('Ditutup');
  });
});

describe('sortPaymentsDue', () => {
  it('overdue dulu, lalu due_date naik', () => {
    const rows = [
      { status: 'unpaid', due_date: '2026-10-01' },
      { status: 'overdue', due_date: '2026-10-05' },
      { status: 'overdue', due_date: '2026-09-20' },
      { status: 'partial', due_date: '2026-09-01' },
    ];
    expect(sortPaymentsDue(rows).map((r) => r.due_date)).toEqual([
      '2026-09-20', '2026-10-05', '2026-09-01', '2026-10-01',
    ]);
  });
});
