import { z } from 'zod';

// Slice 1 identity foundation (D1/D2). Role set is closed: owner | tenant.
// profiles.email is a display copy; auth source is auth.users.email.
// Never use user_metadata or this schema for authorization decisions.
export const roleSchema = z.enum(['owner', 'tenant'], {
  errorMap: () => ({ message: 'Role tidak valid.' }),
});

export type UserRole = z.infer<typeof roleSchema>;

export const profileSchema = z.object({
  role: roleSchema.default('owner'),
  email: z.string().email('Format email tidak valid.').nullable().optional().or(z.literal('')),
  phone: z.string().max(20, 'Nomor telepon maksimal 20 karakter.').nullable().optional(),
  full_name: z.string().max(100, 'Nama maksimal 100 karakter.').nullable().optional(),
});

export type ProfileInput = z.infer<typeof profileSchema>;
