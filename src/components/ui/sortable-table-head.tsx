import type * as React from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TableHead } from '@/components/ui/table';
import type { SortDirection } from '@/lib/sorting';

interface SortableTableHeadProps extends React.ComponentPropsWithoutRef<typeof TableHead> {
  active: boolean;
  direction: SortDirection;
  onSort: () => void;
}

export function SortableTableHead({
  active,
  direction,
  onSort,
  className,
  children,
  ...props
}: SortableTableHeadProps) {
  const label = typeof children === 'string' ? children : 'kolom';
  const nextDirection = active && direction === 'asc' ? 'menurun' : 'menaik';

  return (
    <TableHead className={cn('whitespace-nowrap', className)} {...props}>
      <button
        type="button"
        onClick={onSort}
        className="inline-flex items-center gap-1 rounded-md py-1 text-left font-medium outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={'Urutkan ' + label + ' ' + nextDirection}
      >
        {children}
        {active
          ? direction === 'asc'
            ? <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
            : <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
          : <ArrowUpDown className="h-3.5 w-3.5 opacity-40" aria-hidden="true" />}
      </button>
    </TableHead>
  );
}
