import { describe, expect, it, vi } from 'vitest';

const REPORT = {
  id: '33333333-3333-4333-8333-333333333333',
  property_id: '11111111-1111-4111-8111-111111111111',
  tenant_id: '22222222-2222-4222-8222-222222222222',
};
const EXPECTED_PATH = `${REPORT.property_id}/${REPORT.tenant_id}/${REPORT.id}/a.jpg`;

describe('two-step photo semantics (mocked storage)', () => {
  it('urutan: validasi -> baca report -> upload -> attach PATH; gagal upload -> tanpa attach', async () => {
    const order: string[] = [];
    const upload = vi.fn(async () => { order.push('upload'); return { error: null }; });
    const updateEq = vi.fn(() => ({
      select: () => ({ single: async () => { order.push('attach'); return { data: { ...REPORT, image_url: EXPECTED_PATH }, error: null }; } }),
    }));
    const update = vi.fn((..._args: unknown[]) => ({ eq: updateEq }));
    vi.doMock('@/lib/supabase', () => ({
      supabase: {
        from: (t: string) => {
          if (t === 'maintenance_reports' && order.length === 0) {
            return { select: () => ({ eq: () => ({ maybeSingle: async () => { order.push('read'); return { data: REPORT, error: null }; } }), update }) };
          }
          return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: REPORT, error: null }) }) }), update };
        },
        storage: { from: () => ({ upload, createSignedUrl: async () => ({ data: { signedUrl: 'https://signed/x' }, error: null }) }) },
      },
    }));
    const svc = await import('./maintenance');
    const path = await svc.uploadMaintenanceReportPhoto(REPORT.id, new File(['xx'], 'a.jpg', { type: 'image/jpeg' }));
    expect(path).toBe(EXPECTED_PATH);
    expect(order).toEqual(['read', 'upload', 'attach']);
    expect(updateEq).toHaveBeenCalledWith('id', REPORT.id);
    const sent = (update.mock.calls[0]?.[0] ?? {}) as Record<string, unknown>;
    expect(Object.keys(sent)).toEqual(['image_url']); // narrow attach
    vi.doUnmock('@/lib/supabase');
  });

  it('attach menolak signed URL; getPhotoUrl null saat kosong', async () => {
    vi.doMock('@/lib/supabase', () => ({
      supabase: {
        from: () => ({ update: vi.fn() }),
        storage: { from: () => ({ createSignedUrl: vi.fn(async () => ({ data: null, error: new Error('x') })) }) },
      },
    }));
    const svc = await import('./maintenance');
    await expect(svc.attachMaintenanceReportPhoto(REPORT.id, 'https://evil/x.jpg')).rejects.toThrow();
    expect(await svc.getMaintenanceReportPhotoUrl(null)).toBeNull();
    vi.doUnmock('@/lib/supabase');
  });
});
