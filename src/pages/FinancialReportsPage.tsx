import { useEffect, useMemo, useState } from 'react';
import { Wallet } from 'lucide-react';
import { useProperty } from '@/hooks/useProperty';
import { getRevenueReport, periodRange } from '@/services/dashboard';
import { mapSupabaseError } from '@/lib/errors';
import { formatRupiah } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { SortableTableHead } from '@/components/ui/sortable-table-head';
import { sortRows, type SortDirection } from '@/lib/sorting';

type RangeKey = 'this_month' | 'last_month' | 'last_3' | 'last_6';
type FinancialSortKey = 'period' | 'due' | 'paid' | 'outstanding';

export default function FinancialReportsPage() {
  const { property, loading: propLoading } = useProperty();
  const [range, setRange] = useState<RangeKey>('last_6');
  const [revenue, setRevenue] = useState<{ period: string; due: number; paid: number; outstanding: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<FinancialSortKey>('period');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  async function load() {
    if (!property) return;
    setLoading(true);
    setError(null);
    try {
      setRevenue(await getRevenueReport(property.id, periodRange(range)));
    } catch (err) {
      setError(mapSupabaseError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!propLoading && property) void load();
  }, [propLoading, property?.id, range]);

  const sortedRevenue = useMemo(() => sortRows(
    revenue,
    (row) => row[sortKey],
    sortDirection,
    sortKey === 'period' ? 'date' : 'number',
  ), [revenue, sortKey, sortDirection]);

  function handleSort(key: FinancialSortKey) {
    if (sortKey === key) setSortDirection((direction) => direction === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDirection('asc'); }
  }

  const totalDue = revenue.reduce((sum, row) => sum + row.due, 0);
  const totalPaid = revenue.reduce((sum, row) => sum + row.paid, 0);
  const totalOutstanding = revenue.reduce((sum, row) => sum + row.outstanding, 0);

  if (loading) {
    return (
      <div className="space-y-4" aria-label="Memuat laporan keuangan">
        <Skeleton className="h-8 w-56" />
        <div className="grid gap-4 md:grid-cols-3"><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div>
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold"><Wallet className="h-5 w-5" /> Laporan Keuangan</h1>
          <p className="mt-1 text-sm text-muted-foreground">Ringkasan tagihan, pembayaran diterima, dan tunggakan.</p>
        </div>
        <Select value={range} onValueChange={(value) => setRange(value as RangeKey)}>
          <SelectTrigger className="w-48" aria-label="Filter periode"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="this_month">Bulan ini</SelectItem>
            <SelectItem value="last_month">Bulan lalu</SelectItem>
            <SelectItem value="last_3">3 bulan terakhir</SelectItem>
            <SelectItem value="last_6">6 bulan terakhir</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && (
        <div role="alert" className="space-y-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          <p>{error}</p>
          <Button variant="outline" size="sm" onClick={() => void load()}>Coba lagi</Button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Total Tagihan</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{formatRupiah(totalDue)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Total Diterima</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{formatRupiah(totalPaid)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Tunggakan</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{formatRupiah(totalOutstanding)}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Rincian Keuangan per Periode</CardTitle></CardHeader>
        <CardContent className="p-0">
          {revenue.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Belum ada data keuangan pada periode ini.</div>
          ) : (
            <Table>
              <TableHeader><TableRow>
  <SortableTableHead active={sortKey === 'period'} direction={sortDirection} onSort={() => handleSort('period')}>Periode</SortableTableHead>
  <SortableTableHead active={sortKey === 'due'} direction={sortDirection} onSort={() => handleSort('due')}>Tagihan</SortableTableHead>
  <SortableTableHead active={sortKey === 'paid'} direction={sortDirection} onSort={() => handleSort('paid')}>Diterima</SortableTableHead>
  <SortableTableHead active={sortKey === 'outstanding'} direction={sortDirection} onSort={() => handleSort('outstanding')}>Sisa</SortableTableHead>
</TableRow></TableHeader>
              <TableBody>
                {sortedRevenue.map((row) => (
                  <TableRow key={row.period}>
                    <TableCell className="font-medium">{row.period}</TableCell>
                    <TableCell>{formatRupiah(row.due)}</TableCell>
                    <TableCell>{formatRupiah(row.paid)}</TableCell>
                    <TableCell>{formatRupiah(row.outstanding)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
