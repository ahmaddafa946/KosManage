import { describe, expect, it } from 'vitest';
import { isAllowedTransition } from './maintenanceLifecycle';

describe('isAllowedTransition (RED: module belum ada)', () => {
  it('forward-only allowed', () => {
    expect(isAllowedTransition('submitted', 'in_progress')).toBe(true);
    expect(isAllowedTransition('in_progress', 'resolved')).toBe(true);
    expect(isAllowedTransition('resolved', 'closed')).toBe(true);
  });
  it('skip/backward/reopen ditolak', () => {
    expect(isAllowedTransition('submitted', 'resolved')).toBe(false);
    expect(isAllowedTransition('submitted', 'closed')).toBe(false);
    expect(isAllowedTransition('in_progress', 'submitted')).toBe(false);
    expect(isAllowedTransition('resolved', 'in_progress')).toBe(false);
    expect(isAllowedTransition('closed', 'submitted')).toBe(false);
    expect(isAllowedTransition('closed', 'in_progress')).toBe(false);
    expect(isAllowedTransition('closed', 'resolved')).toBe(false);
  });
  it('same-status = no-op allowed', () => {
    expect(isAllowedTransition('submitted', 'submitted')).toBe(true);
  });
});
