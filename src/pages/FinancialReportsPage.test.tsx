import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import FinancialReportsPage from './FinancialReportsPage';

const mockGetRevenueReport = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/useProperty', () => ({
  useProperty: () => ({ property: { id: 'p1' }, loading: false }),
}));
vi.mock('@/services/dashboard', () => ({
  getRevenueReport: mockGetRevenueReport,
  periodRange: vi.fn(() => ['2026-08', '2026-09']),
}));

describe('FinancialReportsPage (Slice 11, FR-140)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetRevenueReport.mockResolvedValue([
      { period: '2026-08', due: 2000000, paid: 1800000, outstanding: 200000 },
      { period: '2026-09', due: 2200000, paid: 2200000, outstanding: 0 },
    ]);
  });

  it('hanya menampilkan informasi finansial', async () => {
    render(<FinancialReportsPage />);
    await waitFor(() => expect(screen.getByText('Laporan Keuangan')).toBeInTheDocument());
    expect(screen.getByText('Total Tagihan')).toBeInTheDocument();
    expect(screen.getByText('Tunggakan')).toBeInTheDocument();
    expect(screen.getByText(/^Rp\s4\.200\.000$/u)).toBeInTheDocument();
    expect(screen.queryByText('Okupansi')).not.toBeInTheDocument();
    expect(screen.queryByText('Laporan Operasional')).not.toBeInTheDocument();
  });
});
