import { z } from 'zod';

export const maintenanceCategorySchema = z.enum(['AC', 'electrical', 'plumbing', 'furniture', 'internet', 'other']);
export const maintenancePrioritySchema = z.enum(['low', 'medium', 'high']);
export const maintenanceStatusSchema = z.enum(['submitted', 'in_progress', 'resolved', 'closed']);

// Create: caller-owned fields only. property_id/tenant_id/room_id/status/
// resolved_at/image_url are set server-side or by service from session
// context — never accepted from raw client input here.
export const maintenanceCreateSchema = z.object({
  title: z.string().trim().min(1, 'Judul wajib diisi.').max(120, 'Judul maksimal 120 karakter.'),
  description: z.string().trim().min(1, 'Deskripsi wajib diisi.').max(2000, 'Deskripsi maksimal 2000 karakter.'),
  category: maintenanceCategorySchema,
  priority: maintenancePrioritySchema,
});

export type MaintenanceCreateInput = z.infer<typeof maintenanceCreateSchema>;

// Tenant edit: content fields only, status excluded by construction.
export const maintenanceTenantUpdateSchema = maintenanceCreateSchema.partial();

// Owner process: content + forward status step. resolved_at excluded:
// DB trigger is authoritative.
export const maintenanceOwnerUpdateSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().min(1).max(2000).optional(),
  category: maintenanceCategorySchema.optional(),
  priority: maintenancePrioritySchema.optional(),
  status: maintenanceStatusSchema.optional(),
});

export type MaintenanceOwnerUpdateInput = z.infer<typeof maintenanceOwnerUpdateSchema>;
