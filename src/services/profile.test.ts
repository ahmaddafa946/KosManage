import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getMyProfile, updateMyProfile } from './profile';

const mocks = vi.hoisted(() => {
  const chain = {
    select: vi.fn(),
    update: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(),
    single: vi.fn(),
  };
  chain.select.mockReturnValue(chain);
  chain.update.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  return { chain, getUser: vi.fn() };
});

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getUser: mocks.getUser },
    from: vi.fn(() => mocks.chain),
  },
}));

describe('profile service (Slice 10)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getMyProfile hanya membaca profile milik user yang sedang login', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'tenant-1' } } });
    mocks.chain.maybeSingle.mockResolvedValue({
      data: { id: 'tenant-1', full_name: 'Ahmad', role: 'tenant', email: 'tenant@example.com', phone: '0812' },
      error: null,
    });

    const result = await getMyProfile();

    expect(result?.id).toBe('tenant-1');
    expect(mocks.chain.eq).toHaveBeenCalledWith('id', 'tenant-1');
  });

  it('updateMyProfile hanya mengirim full_name dan phone', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'tenant-1' } } });
    mocks.chain.single.mockResolvedValue({
      data: { id: 'tenant-1', full_name: 'Nama Baru', role: 'tenant', email: 'tenant@example.com', phone: '0899' },
      error: null,
    });

    const result = await updateMyProfile({
      full_name: '  Nama Baru  ',
      phone: ' 0899 ',
      role: 'owner',
      id: 'attacker-id',
    } as never);

    expect(result.full_name).toBe('Nama Baru');
    expect(mocks.chain.update).toHaveBeenCalledWith({
      full_name: 'Nama Baru',
      phone: '0899',
    });
  });

  it('updateMyProfile menolak operasi tanpa session', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });

    await expect(updateMyProfile({ full_name: 'Nama', phone: null })).rejects.toThrow('Sesi berakhir');
    expect(mocks.chain.update).not.toHaveBeenCalled();
  });
});