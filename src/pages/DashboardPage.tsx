import { Link } from 'react-router-dom';
import { BedDouble, Users, Wallet, AlertTriangle, Wrench, CalendarClock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useProperty } from '@/hooks/useProperty';
import { useEffect, useState } from 'react';
import {
  getDashboardSummary,
  getOutstandingPayments,
  getRecentPayments,
  getUpcomingPayments,
  getMaintenanceDashboard,
  getUpcomingRentalExpiries,
  remainingAmount,
  type MaintenanceDashboard,
  type RentalExpiryItem,
} from '@/services/dashboard';
import { formatDaysRemaining } from '@/lib/rental';
import { mapSupabaseError } from '@/lib/errors';
import { formatRupiah, formatDate } from '@/lib/utils';
import { PaymentStatusBadge, MaintenanceStatusBadge } from '@/components/StatusBadge';
import type { DashboardSummary, Payment } from '@/types/database';

export default function DashboardPage() {
  const { property, loading: propLoading, ensureProperty } = useProperty();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [recent, setRecent] = useState<Payment[]>([]);
  const [outstanding, setOutstanding] = useState<Payment[]>([]);
  const [upcoming, setUpcoming] = useState<Payment[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceDashboard | null>(null);
  const [expiries, setExpiries] = useState<RentalExpiryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (propLoading) return;
      try {
        let pid = property?.id;
        if (!pid) {
          const created = await ensureProperty('Kos Saya');
          pid = created.id;
        }
        setLoading(true);
        const [s, r, o, u, m, e] = await Promise.all([
          getDashboardSummary(pid!),
          getRecentPayments(pid!),
          getOutstandingPayments(pid!),
          getUpcomingPayments(pid!),
          getMaintenanceDashboard(pid!),
          getUpcomingRentalExpiries(pid!),
        ]);
        setSummary(s);
        setRecent(r);
        setOutstanding(o);
        setUpcoming(u);
        setMaintenance(m);
        setExpiries(e);
        setError(null);
      } catch (e) {
        setError(mapSupabaseError(e));
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [propLoading, property?.id]);

  if (loading || propLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive" role="alert">
        {error}
      </div>
    );
  }

  const kpis = [
    { label: 'Total Kamar', value: String(summary?.totalRooms ?? 0), icon: BedDouble },
    { label: 'Terisi', value: String(summary?.occupiedRooms ?? 0), icon: BedDouble },
    { label: 'Kosong', value: String(summary?.availableRooms ?? 0), icon: BedDouble },
    { label: 'Maintenance', value: String(summary?.maintenanceRooms ?? 0), icon: AlertTriangle },
    { label: 'Total Penghuni', value: String(summary?.totalTenants ?? 0), icon: Users },
    { label: 'Pendapatan Bulan Ini', value: formatRupiah(summary?.monthlyRevenue ?? 0), icon: Wallet },
    { label: 'Total Tunggakan', value: formatRupiah(summary?.totalOutstanding ?? 0), icon: AlertTriangle },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">{k.label}</CardTitle>
              <k.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="min-w-0 break-words text-lg font-bold sm:text-xl">{k.value}</div>
            </CardContent>
          </Card>
        ))}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Okupansi</CardTitle></CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {summary && summary.totalRooms > 0 ? `${Math.round((summary.occupiedRooms / summary.totalRooms) * 100)}%` : '0%'}
            </div>
            <p className="text-xs text-muted-foreground">{summary?.occupiedRooms ?? 0} dari {summary?.totalRooms ?? 0} kamar</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid min-w-0 gap-3 sm:gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Wrench className="h-4 w-4" /> Laporan Maintenance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-6 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Total laporan aktif</p>
                <p className="text-lg font-semibold">{maintenance?.activeTotal ?? 0}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Sedang diproses</p>
                <p className="text-lg font-semibold">{maintenance?.inProgress ?? 0}</p>
              </div>
            </div>
            {maintenance?.inProgress === 0 && (
              <p className="text-sm text-muted-foreground">Tidak ada laporan maintenance yang sedang diproses.</p>
            )}
            {(maintenance?.recent.length ?? 0) === 0 && (
              <p className="text-sm text-muted-foreground">Belum ada laporan aktif. <Link to="/reports" className="text-primary underline">Lihat laporan</Link></p>
            )}
            {maintenance?.recent.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{r.title} · {r.room_number ?? '-'} · {r.tenant_name ?? '-'}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(r.created_at)} · {r.priority}</p>
                </div>
                <MaintenanceStatusBadge status={r.status} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <CalendarClock className="h-4 w-4" /> Sewa Berakhir 30 Hari
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {expiries.length === 0 && (
              <p className="text-sm text-muted-foreground">Tidak ada sewa yang berakhir dalam 30 hari.</p>
            )}
            {expiries.map((x) => (
              <div key={x.tenant_id} className="flex items-center justify-between gap-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{x.tenant_name} — {x.room_number ?? '-'}</p>
                  <p className="text-xs text-muted-foreground">
                    {x.days_remaining === 0 ? 'Berakhir hari ini' : `${x.days_remaining} hari lagi`} · {formatDate(x.end_date)} · {formatDaysRemaining(x.days_remaining)}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid min-w-0 gap-3 sm:gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-sm">Pembayaran Terbaru</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {recent.length === 0 && <p className="text-sm text-muted-foreground">Belum ada pembayaran. <Link to="/payments" className="text-primary underline">Catat pembayaran</Link></p>}
            {recent.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{p.tenant?.name ?? 'Penghuni'} · {p.room?.room_number ?? '-'}</p>
                  <p className="text-xs text-muted-foreground">{p.billing_period} · {formatDate(p.payment_date ?? p.due_date)}</p>
                </div>
                <PaymentStatusBadge status={p.status} />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Jatuh Tempo Terdekat</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {upcoming.length === 0 && <p className="text-sm text-muted-foreground">Tidak ada jatuh tempo mendesak.</p>}
            {upcoming.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{p.tenant?.name ?? 'Penghuni'} · {formatRupiah(remainingAmount(Number(p.amount_due), Number(p.amount_paid)))}</p>
                  <p className="text-xs text-muted-foreground">Jatuh tempo {formatDate(p.due_date)}</p>
                </div>
                <PaymentStatusBadge status={p.status} />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              Pembayaran Perlu Ditindaklanjuti <Badge variant="secondary" className="ml-1">{outstanding.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {outstanding.length === 0 && <p className="text-sm text-muted-foreground">Tidak ada tunggakan. Semua lunas.</p>}
            {outstanding.slice(0, 8).map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{p.tenant?.name ?? 'Penghuni'} · {p.room?.room_number ?? '-'}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.billing_period} · jatuh tempo {formatDate(p.due_date)} · sisa {formatRupiah(remainingAmount(Number(p.amount_due), Number(p.amount_paid)))}
                  </p>
                </div>
                <PaymentStatusBadge status={p.status} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
