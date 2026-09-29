import { z } from 'zod';

export const paymentSchema = z.object({
  tenant_id: z.string().uuid('Penghuni tidak valid.').min(1, 'Penghuni wajib dipilih.'),
  billing_period: z.string().regex(/^[0-9]{4}-[0-9]{2}$/, 'Periode harus format YYYY-MM (contoh: 2026-03).'),
  due_date: z.string().min(1, 'Tanggal jatuh tempo wajib diisi.'),
  amount_due: z.coerce.number({ invalid_type_error: 'Tagihan harus berupa angka.' }).min(0, 'Tagihan tidak boleh negatif.'),
  amount_paid: z.coerce.number({ invalid_type_error: 'Jumlah dibayar harus berupa angka.' }).min(0, 'Jumlah dibayar tidak boleh negatif.').default(0),
  payment_date: z.string().nullable().optional(),
  payment_method: z.enum(['cash', 'transfer', 'ewallet', 'qris']).nullable().optional(),
  notes: z.string().max(1000, 'Catatan maksimal 1000 karakter.').nullable().optional(),
});

export type PaymentInput = z.infer<typeof paymentSchema>;

export const paymentMethodSchema = z.enum(['cash', 'transfer', 'ewallet', 'qris']);
export const tenantPaymentMethodSchema = z.object({
  payment_method: paymentMethodSchema,
});
