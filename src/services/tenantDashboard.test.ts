import { describe, expect, it } from 'vitest';
import {
  greetingName,
  pickOutstandingBill,
  summarizeMyReports,
  formatRentCountdown,
  tenantDashboardContract,
} from './tenantDashboard';

describe('tenantDashboard helpers (FR-132, RED)', () => {
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
  it('summarizeMyReports: hitung aktif (submitted+in_progress), daftar in_progress terbaru maks 3', () => {
    const reports = [
      { id: '1', title: 'AC', status: 'in_progress', created_at: '2026-09-28' },
      { id: '2', title: 'Lampu', status: 'submitted', created_at: '2026-09-29' },
      { id: '3', title: 'Pintu', status: 'resolved', created_at: '2026-09-27' },
      { id: '4', title: 'Air', status: 'in_progress', created_at: '2026-09-30' },
      { id: '5', title: 'Jendela', status: 'closed', created_at: '2026-09-26' },
    ];
    const s = summarizeMyReports(reports as unknown as Parameters<typeof summarizeMyReports>[0]);
    expect(s.activeTotal).toBe(3);
    expect(s.inProgress.map((r) => r.id)).toEqual(['4', '1']);
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
