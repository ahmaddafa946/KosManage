import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TenantReportsPage from './TenantReportsPage';

const mocks = vi.hoisted(() => ({
  getMyTenantOccupancy: vi.fn(),
  getMyMaintenanceReports: vi.fn(),
  createMaintenanceReport: vi.fn(),
  uploadMaintenanceReportPhoto: vi.fn(),
}));

vi.mock('@/services/tenantDashboard', () => ({ getMyTenantOccupancy: mocks.getMyTenantOccupancy }));
vi.mock('@/services/maintenance', () => ({
  getMyMaintenanceReports: mocks.getMyMaintenanceReports,
  createMaintenanceReport: mocks.createMaintenanceReport,
  uploadMaintenanceReportPhoto: mocks.uploadMaintenanceReportPhoto,
}));

describe('TenantReportsPage (Slice 11, FR-140)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getMyTenantOccupancy.mockResolvedValue({
      tenant: { id: 't1', property_id: 'p1', room_id: 'r1' },
      room: { id: 'r1', room_number: 'A-01' },
    });
    mocks.getMyMaintenanceReports.mockResolvedValue([
      { id: 'm1', title: 'AC bocor', description: 'Air menetes', category: 'AC', priority: 'high', status: 'in_progress', created_at: '2026-09-29', image_url: null },
    ]);
    mocks.createMaintenanceReport.mockResolvedValue({
      id: 'm2', title: 'Lampu mati', description: 'Tidak menyala', category: 'other', priority: 'medium', status: 'submitted', created_at: '2026-09-30', image_url: null,
    });
  });

  it('menampilkan laporan milik tenant dan tombol buat laporan', async () => {
    render(<MemoryRouter><TenantReportsPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('AC bocor')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Buat Laporan/ })).toBeInTheDocument();
    expect(screen.getByText('Sedang Diproses')).toBeInTheDocument();
  });

  it('dapat mengajukan laporan baru tanpa field ownership/status dari form', async () => {
    render(<MemoryRouter><TenantReportsPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('AC bocor')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Buat Laporan/ }));
    fireEvent.change(screen.getByLabelText('Judul'), { target: { value: 'Lampu mati' } });
    fireEvent.change(screen.getByLabelText('Deskripsi'), { target: { value: 'Tidak menyala' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ajukan Laporan' }));
    await waitFor(() => expect(mocks.createMaintenanceReport).toHaveBeenCalledWith(
      { propertyId: 'p1', tenantId: 't1', roomId: 'r1' },
      { title: 'Lampu mati', description: 'Tidak menyala', category: 'other', priority: 'medium' },
    ));
  });
});
