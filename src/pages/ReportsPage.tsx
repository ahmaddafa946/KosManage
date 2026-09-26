import { useEffect, useState } from 'react';
import { useProperty } from '@/hooks/useProperty';
import { getRevenueReport, periodRange } from '@/services/dashboard';
import { getRooms } from '@/services/rooms';
import { mapSupabaseError } from '@/lib/errors';
import { formatRupiah } from '@/lib/utils';
import type { Room } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

type RangeKey = 'this_month' | 'last_month' | 'last_3' | 'last_6';

export default function ReportsPage() {
  const { property, loading: propLoading } = useProperty();
  const [range, setRange] = useState<RangeKey>('last_6');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [revenue, setRevenue] = useState<{ period: string; due: number; paid: number; outstanding: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!property) return;
      setLoading(true);
      try {
        const months = periodRange(range);
        const [roomRows, rev] = await Promise.all([
          getRooms(property.id),
          getRevenueReport(property.id, months),
        ]);
        setRooms(roomRows);
        setRevenue(rev);
        setError(null);
      } catch (e) {
        setError(mapSupabaseError(e));
      } finally {
        setLoading(false);
      }
    }
    if (!propLoading && property) void load();
  }, [propLoading, property, range]);

  const total = rooms.length;
  const occupied = rooms.filter((r) => r.status === 'occupied').length;
  const available = rooms.filter((r) => r.status === 'available').length;
  const maintenance = rooms.filter((r) => r.status === 'maintenance').length;
  const occupancyRate = total > 0 ? Math.round((occupied / total) * 100) : 0;
  const totalPaid = revenue.reduce((a, r) => a + r.paid, 0);
  const totalDue = revenue.reduce((a, r) => a + r.due, 0);
  const maxPaid = Math.max(1, ...revenue.map((r) => r.paid));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Select value={range} onValueChange={(v) => setRange(v as RangeKey)}>
          <SelectTrigger className="w-48" aria-label="Filter periode"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="this_month">Bulan ini</SelectItem>
            <SelectItem value="last_month">Bulan lalu</SelectItem>
            <SelectItem value="last_3">3 bulan terakhir</SelectItem>
            <SelectItem value="last_6">6 bulan terakhir</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive" role="alert">{error}</div>}

      {loading ? (
        <div className="space-y-2"><Skeleton className="h-24 w-full" /><Skeleton className="h-48 w-full" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <Card><CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Okupansi</CardTitle></CardHeader><CardContent><div className="text-xl font-bold">{occupancyRate}%</div><p className="text-xs text-muted-foreground">{occupied} dari {total} kamar terisi</p></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Kosong</CardTitle></CardHeader><CardContent><div className="text-xl font-bold">{available}</div><p className="text-xs text-muted-foreground">Maintenance: {maintenance}</p></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Total Tagihan (periode)</CardTitle></CardHeader><CardContent><div className="text-xl font-bold">{formatRupiah(totalDue)}</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Total Diterima (periode)</CardTitle></CardHeader><CardContent><div className="text-xl font-bold">{formatRupiah(totalPaid)}</div></CardContent></Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-sm">Pendapatan per Periode</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {revenue.length === 0 && <p className="text-sm text-muted-foreground">Belum ada data pada periode ini.</p>}
              {revenue.map((r) => (
                <div key={r.period} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{r.period}</span>
                    <span className="text-muted-foreground">{formatRupiah(r.paid)} / {formatRupiah(r.due)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted" role="img" aria-label={`Pendapatan ${r.period}: ${formatRupiah(r.paid)}`}>
                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round((r.paid / maxPaid) * 100)}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground">Sisa: {formatRupiah(r.outstanding)}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Rincian Periode</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Periode</TableHead><TableHead>Tagihan</TableHead><TableHead>Diterima</TableHead><TableHead>Sisa</TableHead></TableRow></TableHeader>
                <TableBody>
                  {revenue.map((r) => (
                    <TableRow key={r.period}>
                      <TableCell className="font-medium">{r.period}</TableCell>
                      <TableCell>{formatRupiah(r.due)}</TableCell>
                      <TableCell>{formatRupiah(r.paid)}</TableCell>
                      <TableCell>{formatRupiah(r.outstanding)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

