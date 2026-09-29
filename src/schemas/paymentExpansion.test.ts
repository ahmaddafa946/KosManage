import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { paymentMethodSchema, tenantPaymentMethodSchema } from './payment';

describe('payment method qris (RED)', () => {
  it('qris diterima', () => {
    expect(paymentMethodSchema.safeParse('qris').success).toBe(true);
  });
  it('metode lama tetap diterima', () => {
    for (const m of ['cash', 'transfer', 'ewallet']) {
      expect(paymentMethodSchema.safeParse(m).success).toBe(true);
    }
  });
  it('metode invalid ditolak', () => {
    expect(paymentMethodSchema.safeParse('bitcoin').success).toBe(false);
  });
  it('skema tenant: hanya method, tanpa amount/status/ids', () => {
    const shape = Object.keys(tenantPaymentMethodSchema.shape);
    expect(shape).toEqual(['payment_method']);
    for (const f of ['amount_paid', 'status', 'paid_at', 'tenant_id', 'property_id', 'payment_reference']) {
      expect(shape).not.toContain(f);
    }
  });
});

describe('migration payment expansion (RED: file belum ada)', () => {
  const MIG = '20260929200000_payment_expansion.sql';
  it('satu migration Slice 7 ada', () => {
    const sql = readFileSync(join(__dirname, '../../supabase/migrations', MIG), 'utf8');
    expect(sql).toContain('payment_reference');
    expect(sql).toContain('qris');
    expect(sql).toContain('start_simulated_payment');
  });
  it('tanpa tenant UPDATE/INSERT generik; tanpa fake gateway URL', () => {
    const sql = readFileSync(join(__dirname, '../../supabase/migrations', MIG), 'utf8');
    const sqlLines = sql.split('\n').filter((l) => !l.trimStart().startsWith('--'));
    const body = sqlLines.join('\n');
    expect(body).not.toMatch(/create policy payments_(insert|update)_tenant/);
    expect(body).not.toMatch(/https?:\/\//);
  });
});
