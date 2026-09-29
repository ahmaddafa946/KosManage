import type { MaintenanceStatus } from '@/types/database';

// Forward-only lifecycle (FR-111, narrowest; mirror DB trigger
// guard_maintenance_transition). No skip, no reopen, no backward.
const NEXT: Record<Exclude<MaintenanceStatus, 'closed'>, MaintenanceStatus> = {
  submitted: 'in_progress',
  in_progress: 'resolved',
  resolved: 'closed',
};

export function isAllowedTransition(from: MaintenanceStatus, to: MaintenanceStatus): boolean {
  if (from === to) return true; // no-op
  return NEXT[from as Exclude<MaintenanceStatus, 'closed'>] === to;
}

// Tenant lane: tenant cannot touch status at all (client-side mirror;
// DB trigger enforces for non-owners).
export function isTenantUpdatableStatus(from: MaintenanceStatus, to: MaintenanceStatus): boolean {
  return from === to;
}
