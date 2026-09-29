// Rental countdown, computed only — never persisted (FR-100, D7).
// Calendar-date math in Asia/Jakarta: UTC timestamps are converted to the
// Jakarta civil date FIRST, so results never shift a day. No date library.

export type RentalBucket =
  | 'normal'
  | 'attention'
  | 'soon'
  | 'very_soon'
  | 'expired'
  | 'past_due'
  | 'open_ended';

export interface RentalStatus {
  daysRemaining: number | null;
  bucket: RentalBucket;
}

const DAY_MS = 86_400_000;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

// Current (or given) instant -> Jakarta calendar date 'YYYY-MM-DD'.
export function getJakartaDateKey(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  return parts; // en-CA yields YYYY-MM-DD
}

// Strict YYYY-MM-DD -> UTC-midnight epoch days. Null on invalid input
// (wrong shape, month 13, Feb 30, non-leap Feb 29). Never throws.
function dateKeyToEpochDays(key: string): number | null {
  const m = DATE_RE.exec(key);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const t = Date.UTC(y, mo - 1, d);
  const check = new Date(t);
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d) {
    return null; // overflow like Feb 30 rolled into March
  }
  return Math.floor(t / DAY_MS);
}

// end_date calendar date MINUS current Jakarta calendar date.
// Null/empty end_date -> null (open-ended). Invalid -> null (fail safe).
export function calculateDaysRemaining(
  endDate: string | null | undefined,
  now: Date = new Date(),
): number | null {
  if (!endDate) return null;
  const endDays = dateKeyToEpochDays(endDate);
  if (endDays === null) return null;
  const todayDays = dateKeyToEpochDays(getJakartaDateKey(now));
  if (todayDays === null) return null; // unreachable, Intl always valid
  return endDays - todayDays;
}

export function getRentalBucket(daysRemaining: number | null): RentalBucket {
  if (daysRemaining === null) return 'open_ended';
  if (daysRemaining < 0) return 'past_due';
  if (daysRemaining === 0) return 'expired';
  if (daysRemaining <= 6) return 'very_soon';
  if (daysRemaining <= 14) return 'soon';
  if (daysRemaining <= 30) return 'attention';
  return 'normal';
}

export function getRentalStatus(
  endDate: string | null | undefined,
  now: Date = new Date(),
): RentalStatus {
  const daysRemaining = calculateDaysRemaining(endDate, now);
  return { daysRemaining, bucket: getRentalBucket(daysRemaining) };
}

// Display labels (id). Bucket enum stays the logic source, not these strings.
export function formatDaysRemaining(daysRemaining: number | null): string {
  switch (getRentalBucket(daysRemaining)) {
    case 'normal':
      return 'normal';
    case 'attention':
      return 'perhatian';
    case 'soon':
      return 'segera';
    case 'very_soon':
      return 'sangat segera';
    case 'expired':
      return 'berakhir hari ini';
    case 'past_due':
      return 'sudah lewat';
    case 'open_ended':
      return 'tanpa tanggal berakhir';
  }
}
