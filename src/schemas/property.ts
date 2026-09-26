import { z } from 'zod';

export const propertySchema = z.object({
  name: z.string().min(1, 'Nama kos wajib diisi.').max(100, 'Nama kos maksimal 100 karakter.'),
  address: z.string().max(500, 'Alamat maksimal 500 karakter.').nullable().optional(),
});

export type PropertyInput = z.infer<typeof propertySchema>;
