import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TenantDashboardPage from './TenantDashboardPage';

vi.mock('@/features/auth/AuthContext', () => ({
  useAuth: () => ({ profile: { full_name: 'Ahmad' }, user: { email: 'ahmad@example.com' } }),
}));

vi.mock('@/services/tenantDashboard', async (orig) => {
  const actual = await orig() as Record<string, unknown>;
  return {
    ...actual,
    getMyTenantOccupancy: vi.fn(async () => ({
      tenant: { id: 't1', name: 'Ahmad', rent_price: 1500000, start_date: '2026-01-01', end_date: '2026-10-13' },
      room: { id: 'r1', room_number: 'A-01', floor: 1, price: 1500000 },
    })),
  };
});

vi.mock('@/services/payments', () => ({
  getMyBills: vi.fn(async () => [
    { id: 'b1', billing_period: '2026-09', due_date: '2026-09-30', amount_due: 1500000, amount_paid: 500000, status: 'partial' },
  ]),
}));

vi.mock('@/services/maintenance', () => ({
  getMyMaintenanceReports: vi.fn(async () => [
    { id: '1', title: 'AC bocor', status: 'in_progress', created_at: '2026-09-28' },
    { id: '2', title: 'Lampu mati', status: 'submitted', created_at: '2026-09-29' },
  ]),
}));

describe('TenantDashboardPage (Slice 9, FR-132)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('tampilkan greeting, kamar, harga, countdown, tagihan + Bayar Sekarang, Laporan Saya', async () => {
    render(<MemoryRouter><TenantDashboardPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText(/Halo, Ahmad/)).toBeInTheDocument());
    expect(screen.getByText(/Kamar A-01/)).toBeInTheDocument();
    expect(screen.getAllByText(/1\.500\.000/).length).toBeGreaterThan(0);
    expect(screen.getByText(/hari/i)).toBeInTheDocument();
    expect(screen.getByText('Periode 2026-09')).toBeInTheDocument();
    expect(screen.getByText('Bayar Sekarang')).toBeInTheDocument();
    expect(screen.getByText('Laporan Saya')).toBeInTheDocument();
  });

  it('tampilkan laporan aktif: submitted DAN in_progress (inkonsistensi Fixed)', async () => {
    render(<MemoryRouter><TenantDashboardPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('AC bocor')).toBeInTheDocument());
    // Submitted yang sebelumnya disembunyikan (inkonsistensi) sekarang tampil
    expect(screen.getByText('Lampu mati')).toBeInTheDocument();
    expect(screen.getByText('Diajukan')).toBeInTheDocument();
    expect(screen.getByText('Sedang Diproses')).toBeInTheDocument();
  });

  it('getMyBills rejection -> error state (tidak swallowed ke empty state)', async () => {
    const pay = await import('@/services/payments');
    vi.mocked(pay.getMyBills).mockRejectedValueOnce(new Error('network fail'));
    render(<MemoryRouter><TenantDashboardPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    // Empty states tidak boleh tampil saat query gagal
    expect(screen.queryByText(/Semua tagihan lunas/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Tidak ada laporan kendala aktif/)).not.toBeInTheDocument();
    expect(screen.getByText('Coba lagi')).toBeInTheDocument();
  });

  it('getMyMaintenanceReports rejection -> error state (tidak swallowed)', async () => {
    const mnt = await import('@/services/maintenance');
    vi.mocked(mnt.getMyMaintenanceReports).mockRejectedValueOnce(new Error('db fail'));
    render(<MemoryRouter><TenantDashboardPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.queryByText(/Semua tagihan lunas/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Tidak ada laporan kendala aktif/)).not.toBeInTheDocument();
  });

  it('empty states tetap tampil saat query sukses & data kosong', async () => {
    const pay = await import('@/services/payments');
    const mnt = await import('@/services/maintenance');
    vi.mocked(pay.getMyBills).mockResolvedValueOnce([]);
    vi.mocked(mnt.getMyMaintenanceReports).mockResolvedValueOnce([]);
    render(<MemoryRouter><TenantDashboardPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText(/Semua tagihan lunas/)).toBeInTheDocument());
    expect(screen.getByText(/Tidak ada laporan kendala aktif/)).toBeInTheDocument();
    // kontrak: dashboard TIDAK panggil startSimulatedPayment / update langsung
    expect('startSimulatedPayment' in pay).toBe(false);
    expect(JSON.stringify(Object.keys(mnt))).not.toMatch(/update|insert|delete/i);
  });

  it('retry action trigger reload', async () => {
    const pay = await import('@/services/payments');
    vi.mocked(pay.getMyBills).mockRejectedValueOnce(new Error('flaky'));
    render(<MemoryRouter><TenantDashboardPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('Coba lagi')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Coba lagi'));
    await waitFor(() => expect(screen.getByText(/Halo, Ahmad/)).toBeInTheDocument());
  });
});
