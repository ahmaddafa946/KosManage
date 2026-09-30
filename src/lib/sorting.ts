export type SortDirection = 'asc' | 'desc';
export type SortKind = 'text' | 'number' | 'date' | 'natural';

function compareNatural(a: string, b: string): number {
  return a.localeCompare(b, 'id', { numeric: true, sensitivity: 'base' });
}

export function compareSortValues(
  left: string | number | Date | null | undefined,
  right: string | number | Date | null | undefined,
  kind: SortKind = 'text',
): number {
  const leftEmpty = left == null || left === '';
  const rightEmpty = right == null || right === '';

  if (leftEmpty || rightEmpty) {
    if (leftEmpty && rightEmpty) return 0;
    return leftEmpty ? 1 : -1;
  }

  if (kind === 'number') return Number(left) - Number(right);
  if (kind === 'date') return new Date(String(left)).getTime() - new Date(String(right)).getTime();
  if (kind === 'natural') return compareNatural(String(left), String(right));
  return String(left).localeCompare(String(right), 'id', { numeric: true, sensitivity: 'base' });
}

export function sortRows<T>(
  rows: T[],
  getValue: (row: T) => string | number | Date | null | undefined,
  direction: SortDirection = 'asc',
  kind: SortKind = 'text',
): T[] {
  const multiplier = direction === 'asc' ? 1 : -1;
  return rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => {
      const compared = compareSortValues(getValue(a.row), getValue(b.row), kind);
      return compared === 0 ? a.index - b.index : compared * multiplier;
    })
    .map(({ row }) => row);
}
