import { z } from 'zod';

export const tenantSchema = z.object({
  name: z.string().min(1, 'Nama lengkap wajib diisi.').max(100, 'Nama maksimal 100 karakter.'),
  phone: z.string().max(20, 'Nomor telepon maksimal 20 karakter.').nullable().optional(),
  email: z.string().email('Format email tidak valid.').nullable().optional().or(z.literal('')),
  identity_number: z.string().max(30, 'Nomor identitas maksimal 30 karakter.').nullable().optional(),
  room_id: z.string().uuid('Kamar tidak valid.').nullable().optional(),
  start_date: z.string().min(1, 'Tanggal mulai wajib diisi.'),
  end_date: z.string().nullable().optional(),
  rent_price: z.coerce.number({ invalid_type_error: 'Harga sewa harus berupa angka.' }).min(0, 'Harga sewa tidak boleh negatif.'),
  deposit: z.coerce.number({ invalid_type_error: 'Deposit harus berupa angka.' }).min(0, 'Deposit tidak boleh negatif.').nullable().optional(),
  status: z.enum(['active', 'inactive']).default('active'),
  notes: z.string().max(1000, 'Catatan maksimal 1000 karakter.').nullable().optional(),
}).refine((d) => !d.end_date || d.end_date >= d.start_date, {
  message: 'Tanggal selesai tidak boleh sebelum tanggal mulai.',
  path: ['end_date'],
}).refine((d) => d.status !== 'active' || !!d.room_id, {
  message: 'Penghuni aktif wajib memiliki kamar.',
  path: ['room_id'],
});

export type TenantInput = z.infer<typeof tenantSchema>;
