import { describe, expect, it } from 'vitest';
import { roomSchema } from '@/schemas/room';
import { tenantSchema } from '@/schemas/tenant';
import { paymentSchema } from '@/schemas/payment';
import { loginSchema } from '@/schemas/auth';

describe('Zod schemas', () => {
  it('roomSchema menolak harga negatif', () => {
    const r = roomSchema.safeParse({ room_number: 'A1', price: -1 });
    expect(r.success).toBe(false);
  });

  it('roomSchema menerima input valid', () => {
    const r = roomSchema.safeParse({ room_number: 'A1', price: 500000 });
    expect(r.success).toBe(true);
  });

  it('tenantSchema menolak active tanpa room', () => {
    const r = tenantSchema.safeParse({
      name: 'Budi', room_id: null, start_date: '2026-01-01', rent_price: 500000, status: 'active',
    });
    expect(r.success).toBe(false);
  });

  it('tenantSchema menolak end_date sebelum start_date', () => {
    const r = tenantSchema.safeParse({
      name: 'Budi', room_id: '123e4567-e89b-12d3-a456-426614174000',
      start_date: '2026-02-01', end_date: '2026-01-01', rent_price: 500000, status: 'active',
    });
    expect(r.success).toBe(false);
  });

  it('paymentSchema menolak amount negatif dan periode salah', () => {
    expect(paymentSchema.safeParse({
      tenant_id: '123e4567-e89b-12d3-a456-426614174000',
      billing_period: '2026-03', due_date: '2026-03-10', amount_due: -5,
    }).success).toBe(false);
    expect(paymentSchema.safeParse({
      tenant_id: '123e4567-e89b-12d3-a456-426614174000',
      billing_period: ' Maret 2026', due_date: '2026-03-10', amount_due: 500000,
    }).success).toBe(false);
  });

  it('paymentSchema menerima input valid', () => {
    const r = paymentSchema.safeParse({
      tenant_id: '123e4567-e89b-12d3-a456-426614174000',
      billing_period: '2026-03', due_date: '2026-03-10', amount_due: 500000, amount_paid: 0,
    });
    expect(r.success).toBe(true);
  });

  it('loginSchema menolak email invalid', () => {
    expect(loginSchema.safeParse({ email: 'bukan-email', password: 'secret123' }).success).toBe(false);
  });
});
