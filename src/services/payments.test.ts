import { describe, expect, it, vi } from 'vitest';
import * as svc from './payments';

describe('payments tenant contract (Slice 7)', () => {
  it('mengekspos getMyBills + startSimulatedPayment', () => {
    expect(typeof svc.getMyBills).toBe('function');
    expect(typeof svc.startSimulatedPayment).toBe('function');
  });
  it('owner CRUD tetap ada', () => {
    for (const fn of ['getPayments', 'getPayment', 'createPayment', 'updatePayment', 'deletePayment']) {
      expect(typeof (svc as Record<string, unknown>)[fn]).toBe('function');
    }
  });
  it('startSimulatedPayment hanya kirim id+method via RPC, bukan update amount', async () => {
    const rpc = vi.fn(async () => ({ data: { id: 'p1', status: 'paid' }, error: null }));
    const from = vi.fn(() => { throw new Error('tenant must not use from().update'); });
    vi.resetModules();
    vi.doMock('@/lib/supabase', () => ({ supabase: { rpc, from } }));
    const { startSimulatedPayment } = await import('./payments');
    const res = await startSimulatedPayment('p1', 'qris');
    expect(rpc).toHaveBeenCalledWith('start_simulated_payment', { p_payment_id: 'p1', p_payment_method: 'qris' });
    expect(from).not.toHaveBeenCalled();
    expect((res as { status: string }).status).toBe('paid');
    vi.doUnmock('@/lib/supabase');
  });
});
