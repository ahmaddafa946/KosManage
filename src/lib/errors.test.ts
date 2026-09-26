import { describe, expect, it } from 'vitest';
import { computePaymentStatusLocal } from '@/lib/errors';

describe('computePaymentStatusLocal (mirror DB compute_payment_status)', () => {
  it('paid saat amount_paid >= amount_due', () => {
    expect(computePaymentStatusLocal(100, 100, '2026-09-30')).toBe('paid');
    expect(computePaymentStatusLocal(100, 150, '2026-09-30')).toBe('paid');
  });

  it('overdue saat lewat due date dan belum lunas', () => {
    expect(computePaymentStatusLocal(100, 0, '2026-01-01', new Date('2026-09-26'))).toBe('overdue');
    expect(computePaymentStatusLocal(100, 50, '2026-01-01', new Date('2026-09-26'))).toBe('overdue');
  });

  it('partial saat bayar sebagian dan belum jatuh tempo', () => {
    expect(computePaymentStatusLocal(100, 50, '2026-12-31', new Date('2026-09-26'))).toBe('partial');
  });

  it('unpaid saat belum bayar dan belum jatuh tempo', () => {
    expect(computePaymentStatusLocal(100, 0, '2026-12-31', new Date('2026-09-26'))).toBe('unpaid');
  });
});
