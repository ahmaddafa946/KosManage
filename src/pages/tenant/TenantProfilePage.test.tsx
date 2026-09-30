import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TenantProfilePage from './TenantProfilePage';

const mocks = vi.hoisted(() => ({
  getMyProfile: vi.fn(),
  updateMyProfile: vi.fn(),
  refreshProfile: vi.fn(),
}));

vi.mock('@/services/profile', () => ({
  getMyProfile: mocks.getMyProfile,
  updateMyProfile: mocks.updateMyProfile,
}));

vi.mock('@/features/auth/AuthContext', () => ({
  useAuth: () => ({
    user: { email: 'tenant@example.com' },
    refreshProfile: mocks.refreshProfile,
  }),
}));

describe('TenantProfilePage (Slice 10, FR-130)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getMyProfile.mockResolvedValue({
      id: 'tenant-1', full_name: 'Ahmad', role: 'tenant',
      email: 'tenant@example.com', phone: '08123456789',
    });
    mocks.updateMyProfile.mockResolvedValue({
      id: 'tenant-1', full_name: 'Ahmad Baru', role: 'tenant',
      email: 'tenant@example.com', phone: '08987654321',
    });
    mocks.refreshProfile.mockResolvedValue(undefined);
  });

  it('memuat profil tenant dan menampilkan email login sebagai read-only', async () => {
    render(<MemoryRouter><TenantProfilePage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByDisplayValue('Ahmad')).toBeInTheDocument());
    expect(screen.getByDisplayValue('tenant@example.com')).toBeDisabled();
    expect(screen.getByText(/Email login dikelola oleh Supabase Auth/)).toBeInTheDocument();
  });

  it('update hanya mengirim nama dan telepon, lalu refresh profile context', async () => {
    render(<MemoryRouter><TenantProfilePage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByDisplayValue('Ahmad')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('Nama Lengkap'), { target: { value: 'Ahmad Baru' } });
    fireEvent.change(screen.getByLabelText('Nomor Telepon'), { target: { value: '08987654321' } });
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Perubahan' }));
    await waitFor(() => expect(mocks.updateMyProfile).toHaveBeenCalledWith({
      full_name: 'Ahmad Baru', phone: '08987654321',
    }));
    await waitFor(() => expect(mocks.refreshProfile).toHaveBeenCalled());
    expect(await screen.findByRole('status')).toHaveTextContent('Profil berhasil disimpan.');
  });

  it('validasi nama wajib diisi dan tidak memanggil update', async () => {
    render(<MemoryRouter><TenantProfilePage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByDisplayValue('Ahmad')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('Nama Lengkap'), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Perubahan' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Nama wajib diisi.');
    expect(mocks.updateMyProfile).not.toHaveBeenCalled();
  });

  it('menampilkan error terpetakan saat update gagal', async () => {
    mocks.updateMyProfile.mockRejectedValueOnce(new Error('network failure'));
    render(<MemoryRouter><TenantProfilePage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByDisplayValue('Ahmad')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('Nomor Telepon'), { target: { value: '0899' } });
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Perubahan' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Gagal terhubung. Periksa koneksi Anda.');
    expect(mocks.refreshProfile).not.toHaveBeenCalled();
  });
});