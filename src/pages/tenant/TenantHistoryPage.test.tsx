import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TenantHistoryPage from './TenantHistoryPage';

const mocks = vi.hoisted(() => ({
  getMyBills: vi.fn(),
  getMyRentalHistory: vi.fn(),
}));

vi.mock('@/services/payments', () => ({ getMyBills: mocks.getMyBills }));
vi.mock('@/services/tenantHistory', () => ({ getMyRentalHistory: mocks.getMyRentalHistory }));

describe('TenantHistoryPage (Slice 11, FR-140)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getMyBills.mockResolvedValue([
      { id: 'p1', billing_period: '2026-08', status: 'paid', amount_due: 1000000, amount_paid: 1000000, payment_date: '2026-08-03', payment_method: 'transfer' },
      { id: 'p2', billing_period: '2026-09', status: 'overdue', amount_due: 1000000, amount_paid: 0, payment_date: null, payment_method: null },
    ]);
    mocks.getMyRentalHistory.mockResolvedValue([
      { id: 't1', room: { room_number: 'A-01' }, start_date: '2026-01-01', end_date: '2026-10-13', rent_price: 1000000, status: 'active' },
      { id: 't2', room: { room_number: 'B-02' }, start_date: '2025-01-01', end_date: '2025-12-31', rent_price: 900000, status: 'inactive' },
    ]);
  });

  it('memuat riwayat pembayaran dan masa sewa', async () => {
    render(<MemoryRouter><TenantHistoryPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('Periode 2026-08')).toBeInTheDocument());
    expect(screen.getByText('Riwayat Masa Sewa')).toBeInTheDocument();
    expect(screen.getByText('Kamar A-01')).toBeInTheDocument();
    expect(screen.getByText('Kamar B-02')).toBeInTheDocument();
    expect(screen.queryByText('Periode 2026-09')).not.toBeInTheDocument();
  });
});
