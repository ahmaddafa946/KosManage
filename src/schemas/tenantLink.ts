import { z } from 'zod';

// Slice 1 tenant linkage (D2). profile_id nullable: null = legacy/unlinked.
// One ACTIVE tenant per profile enforced by partial unique index
// uq_tenants_one_active_per_profile_idx in migration 20260327000000.
export const tenantLinkSchema = z.object({
  profile_id: z.string().uuid('Profile tidak valid.').nullable(),
});

export type TenantLinkInput = z.infer<typeof tenantLinkSchema>;
