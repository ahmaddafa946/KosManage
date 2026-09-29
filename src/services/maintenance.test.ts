import { describe, expect, it } from 'vitest';
import * as svc from './maintenance';

describe('maintenance service contract', () => {
  it('mengekspos fungsi yang diharapkan, tanpa storage/upload', () => {
    for (const fn of [
      'getMaintenanceReports',
      'getMaintenanceReport',
      'getMyMaintenanceReports',
      'createMaintenanceReport',
      'updateMaintenanceReport',
      'updateMyMaintenanceReport',
    ]) {
      expect(typeof (svc as Record<string, unknown>)[fn]).toBe('function');
    }
    for (const fn of ['uploadReportPhoto', 'updateReportImage', 'getSignedUrl', 'createBucket', 'deleteMaintenanceReport']) {
      expect((svc as Record<string, unknown>)[fn]).toBeUndefined();
    }
  });
});
