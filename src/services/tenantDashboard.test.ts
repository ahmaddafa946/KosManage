import { describe, expect, it } from 'vitest';
import {
  greetingName,
  pickOutstandingBill,
  summarizeMyReports,
  formatRentCountdown,
  tenantDashboardContract,
} from './tenantDashboard';

describe('tenantDashboard helpers (FR-132)', () => {
  it('greetingName: nama -> "Halo, X", kosong -> "Halo"', () => {
    expect(greetingName('Ahmad')).toBe('Halo, Ahmad');
    expect(greetingName('  ')).toBe('Halo');
    expect(greetingName(null)).toBe('Halo');
  });

  it('pickOutstandingBill: overdue dulu lalu due_date paling awal; abaikan paid', () => {
    const bills = [
      { id: 'u1', status: 'unpaid', due_date: '2026-10-05', amount_due: 1_000_000, amount_paid: 0 },
      { id: 'o1', status: 'overdue', due_date: '2026-09-20', amount_due: 1_000_000, amount_paid: 0 },
      { id: 'p1', status: 'paid', due_date: '2026-08-01', amount_due: 1_000_000, amount_paid: 1_000_000 },
      { id: 'o2', status: 'overdue', due_date: '2026-09-10', amount_due: 1_000_000, amount_paid: 200_000 },
    ];
    expect(pickOutstandingBill(bills)?.id).toBe('o2');
    expect(pickOutstandingBill([])).toBeNull();
    expect(pickOutstandingBill([{ id: 'x', status: 'paid', due_date: '2026-01-01', amount_due: 1, amount_paid: 1 }])).toBeNull();
  });

  it('summarizeMyReports: include submitted & in_progress, exclude resolved & closed, max 3 newest first', () => {
    const reports = [
      { id: '1', title: 'AC', status: 'in_progress', created_at: '2026-09-28T10:00:00Z' },
      { id: '2', title: 'Lampu', status: 'submitted', created_at: '2026-09-29T10:00:00Z' },
      { id: '3', title: 'Pintu', status: 'resolved', created_at: '2026-09-27T10:00:00Z' },
      { id: '4', title: 'Air', status: 'in_progress', created_at: '2026-09-30T10:00:00Z' },
      { id: '5', title: 'Jendela', status: 'closed', created_at: '2026-09-26T10:00:00Z' },
      { id: '6', title: 'Keran', status: 'submitted', created_at: '2026-09-25T10:00:00Z' },
    ];
    const s = summarizeMyReports(reports as unknown as Parameters<typeof summarizeMyReports>[0]);
    // active = 4 (Air, Lampu, AC, Keran)
    expect(s.activeTotal).toBe(4);
    // inProgressCount = 2 (Air, AC)
    expect(s.inProgressCount).toBe(2);
    // recentActive = max 3 newest: Air (09-30), Lampu (09-29), AC (09-28)
    expect(s.recentActive.map((r) => r.id)).toEqual(['4', '2', '1']);
    // Pastikan status submitted dan in_progress keduanya hadir di recentActive
    expect(s.recentActive.map((r) => r.status)).toContain('submitted');
    expect(s.recentActive.map((r) => r.status)).toContain('in_progress');
    // Resolved dan closed tidak boleh ada
    expect(s.recentActive.map((r) => r.status)).not.toContain('resolved');
    expect(s.recentActive.map((r) => r.status)).not.toContain('closed');
  });

  it('formatRentCountdown: null -> open-ended; 0 -> hari ini; negatif -> lewat', () => {
    expect(formatRentCountdown(null)).toContain('tanpa');
    expect(formatRentCountdown(12)).toContain('12 hari');
    expect(formatRentCountdown(0)).toContain('hari ini');
    expect(formatRentCountdown(-3)).toContain('lewat');
  });

  it('security contract: dashboard read-only, tanpa mutasi langsung', () => {
    const src = tenantDashboardContract();
    expect(src).toContain('getMyTenant');
    expect(src).not.toMatch(/\.update\(|\.insert\(|\.delete\(|startSimulatedPayment/);
  });
});
