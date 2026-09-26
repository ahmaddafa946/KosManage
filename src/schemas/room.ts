import { z } from 'zod';

export const roomSchema = z.object({
  room_number: z.string().min(1, 'Nomor kamar wajib diisi.').max(20, 'Nomor kamar maksimal 20 karakter.'),
  floor: z.coerce.number().int('Lantai harus bilangan bulat.').min(0, 'Lantai tidak boleh negatif.').nullable().optional(),
  price: z.coerce.number({ invalid_type_error: 'Harga sewa harus berupa angka.' }).min(0, 'Harga sewa tidak boleh negatif.'),
  status: z.enum(['available', 'occupied', 'maintenance'], { errorMap: () => ({ message: 'Status tidak valid.' }) }).default('available'),
  facilities: z.string().max(500, 'Fasilitas maksimal 500 karakter.').nullable().optional(),
  notes: z.string().max(1000, 'Catatan maksimal 1000 karakter.').nullable().optional(),
});

export type RoomInput = z.infer<typeof roomSchema>;
