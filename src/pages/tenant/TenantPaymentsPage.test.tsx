import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TenantPaymentsPage from './TenantPaymentsPage';

vi.mock('@/services/payments', () => ({
  getMyBills: vi.fn(async () => [
    { id: 'b1', billing_period: '2026-09', due_date: '2026-09-30', amount_due: 1500000, amount_paid: 0, status: 'unpaid', payment_method: null, payment_reference: null, payment_date: null },
    { id: 'b2', billing_period: '2026-08', due_date: '2026-08-31', amount_due: 1500000, amount_paid: 1500000, status: 'paid', payment_method: 'qris', payment_reference: 'SIMULASI-ABC', payment_date: '2026-08-15' },
  ]),
  startSimulatedPayment: vi.fn(async (id: string, m: string) => ({
    id, billing_period: '2026-09', due_date: '2026-09-30', amount_due: 1500000, amount_paid: 1500000, status: 'paid', payment_method: m, payment_reference: 'SIMULASI-B1', payment_date: '2026-09-29',
  })),
}));

describe('TenantPaymentsPage (Slice 7)', () => {
  it('QRIS ada, SIMULASI label + konfirmasi eksplisit, sukses refresh status', async () => {
    render(<TenantPaymentsPage />);
    await waitFor(() => expect(screen.getByText(/Tagihan Aktif/)).toBeInTheDocument());
    expect(screen.getByText('QRIS' as never)).toBeDefined;
    fireEvent.click(screen.getByText('Bayar (Simulasi)'));
    await waitFor(() => expect(screen.getByText('Pembayaran SIMULASI')).toBeInTheDocument());
    expect(screen.getByText(/bukan transaksi gateway sungguhan/)).toBeInTheDocument();
    fireEvent.click(screen.getByText('Ya, Lunasi (Simulasi)'));
    await waitFor(() => expect(screen.getByText(/SIMULASI-B1/)).toBeInTheDocument());
  });
});
