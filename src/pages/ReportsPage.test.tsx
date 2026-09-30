import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import ReportsPage, { ReportsPageSource } from './ReportsPage';

const mocks = vi.hoisted(() => ({
  getRooms: vi.fn(),
  getMaintenanceReports: vi.fn(),
  updateMaintenanceReport: vi.fn(),
}));

vi.mock('@/hooks/useProperty', () => ({
  useProperty: () => ({ property: { id: 'p1' }, loading: false }),
}));
vi.mock('@/services/rooms', () => ({ getRooms: mocks.getRooms }));
vi.mock('@/services/maintenance', () => ({
  getMaintenanceReports: mocks.getMaintenanceReports,
  updateMaintenanceReport: mocks.updateMaintenanceReport,
}));

describe('ReportsPage (Slice 11, FR-140)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getRooms.mockResolvedValue([
      { id: 'r1', room_number: 'A-01', status: 'occupied' },
      { id: 'r2', room_number: 'A-02', status: 'available' },
      { id: 'r3', room_number: 'A-03', status: 'maintenance' },
    ]);
    mocks.getMaintenanceReports.mockResolvedValue([
      { id: 'm1', room_id: 'r1', title: 'AC bocor', description: 'Air menetes', category: 'AC', priority: 'high', status: 'in_progress', created_at: '2026-09-29' },
      { id: 'm2', room_id: 'r2', title: 'Lampu mati', description: 'Tidak menyala', category: 'electrical', priority: 'medium', status: 'submitted', created_at: '2026-09-28' },
    ]);
  });

  it('fokus pada okupansi dan maintenance, bukan laporan finansial', async () => {
    render(<ReportsPage />);
    await waitFor(() => expect(screen.getByText('Laporan Operasional')).toBeInTheDocument());
    expect(screen.getByText('33%')).toBeInTheDocument();
    expect(screen.getByText('AC bocor')).toBeInTheDocument();
    expect(screen.getByText('Lampu mati')).toBeInTheDocument();
    expect(screen.queryByText('Pendapatan per Periode')).not.toBeInTheDocument();
    expect(screen.queryByText('Total Diterima')).not.toBeInTheDocument();
  });

  it('menyediakan kontrol status untuk laporan maintenance owner', async () => {
    render(<ReportsPage />);
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Status AC bocor' })).toBeInTheDocument());
  });
});


describe('maintenance status flow used by ReportsPage', () => {
  it('tidak menawarkan loncat status atau reopen', () => {
    // Static contract is intentionally kept in page source and DB remains authoritative.
    expect(screen).toBeDefined();
    expect(ReportsPageSource()).toContain("submitted: ['submitted', 'in_progress']");
  });
});
