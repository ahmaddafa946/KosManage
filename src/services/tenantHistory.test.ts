import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getMyRentalHistory } from './tenantHistory';

const mocks = vi.hoisted(() => {
  const chain = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
  };
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.order.mockReturnValue(chain);
  return { chain, getUser: vi.fn() };
});

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getUser: mocks.getUser },
    from: vi.fn(() => mocks.chain),
  },
}));

describe('tenantHistory service (Slice 11)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('hanya mengambil riwayat sewa milik profile user', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'tenant-1' } } });
    mocks.chain.order.mockResolvedValue({
      data: [{ id: 'rental-1', profile_id: 'tenant-1', status: 'inactive' }],
      error: null,
    });

    const result = await getMyRentalHistory();

    expect(result).toHaveLength(1);
    expect(mocks.chain.eq).toHaveBeenCalledWith('profile_id', 'tenant-1');
    expect(mocks.chain.order).toHaveBeenCalledWith('start_date', { ascending: false });
  });

  it('menolak tanpa session', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });
    await expect(getMyRentalHistory()).rejects.toThrow('Sesi berakhir');
  });
});
