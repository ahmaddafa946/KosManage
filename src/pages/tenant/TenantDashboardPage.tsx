import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BedDouble, Wallet, Wrench, Calendar, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PaymentStatusBadge, MaintenanceStatusBadge } from '@/components/StatusBadge';
import { useAuth } from '@/features/auth/AuthContext';
import { getMyBills } from '@/services/payments';
import { getMyMaintenanceReports } from '@/services/maintenance';
import {
  getMyTenantOccupancy,
  greetingName,
  pickOutstandingBill,
  summarizeMyReports,
  formatRentCountdown,
  type TenantOccupancy,
  type MyReportsSummary,
} from '@/services/tenantDashboard';
import { calculateDaysRemaining } from '@/lib/rental';
import { mapSupabaseError } from '@/lib/errors';
import { formatRupiah, formatDate } from '@/lib/utils';
import type { Payment } from '@/types/database';

export default function TenantDashboardPage() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const [occupancy, setOccupancy] = useState<TenantOccupancy | null>(null);
  const [bills, setBills] = useState<Payment[]>([]);
  const [reportsSummary, setReportsSummary] = useState<MyReportsSummary>({ activeTotal: 0, inProgressCount: 0, recentActive: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      // Critical queries: do not swallow errors into empty states
      const [occ, bList, rList] = await Promise.all([
        getMyTenantOccupancy(),
        getMyBills(),
        getMyMaintenanceReports(),
      ]);
      setOccupancy(occ);
      setBills(bList);
      setReportsSummary(summarizeMyReports(rList));
    } catch (e) {
      setError(mapSupabaseError(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4" aria-label="Memuat dashboard penyewa">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3">
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        <Button variant="outline" onClick={() => void loadData()}>Coba lagi</Button>
      </div>
    );
  }

  const displayName = profile?.full_name || occupancy?.tenant?.name || user?.email?.split('@')[0];
  const greeting = greetingName(displayName);
  const tenant = occupancy?.tenant;
  const room = occupancy?.room;
  const rentPrice = tenant?.rent_price ?? room?.price ?? 0;
  const daysRemaining = calculateDaysRemaining(tenant?.end_date);
  const activeBill = pickOutstandingBill(bills);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{greeting} 👋</h1>
        <p className="text-sm text-muted-foreground">Ringkasan kamar, masa sewa, tagihan, dan laporan Anda.</p>
      </div>

      {/* Kamar & Masa Sewa */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Kamar Saya</CardTitle>
            <BedDouble className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            {room ? (
              <>
                <div className="text-2xl font-bold">Kamar {room.room_number}</div>
                <p className="text-sm text-muted-foreground">
                  {formatRupiah(Number(rentPrice))} <span className="text-xs">/ bulan</span>
                </p>
                {room.floor && <p className="text-xs text-muted-foreground">Lantai {room.floor}</p>}
                <div className="pt-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/tenant/room">Detail Kamar <ArrowRight className="ml-1 h-3 w-3" /></Link>
                  </Button>
                </div>
              </>
            ) : (
              <div className="py-2 text-sm text-muted-foreground">
                <p>Belum ada kamar yang terhubung ke akun Anda.</p>
                <p className="text-xs">Hubungi pemilik kos untuk menghubungkan data sewa.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Masa Sewa</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            {tenant ? (
              <>
                <div className="text-lg font-semibold">{formatRentCountdown(daysRemaining)}</div>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <p>Mulai: {formatDate(tenant.start_date)}</p>
                  <p>Berakhir: {tenant.end_date ? formatDate(tenant.end_date) : 'Tidak ditentukan (berjalan)'}</p>
                </div>
              </>
            ) : (
              <p className="py-2 text-sm text-muted-foreground">Data masa sewa belum tersedia.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tagihan & Pembayaran */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="h-4 w-4" /> Tagihan & Pembayaran
            </CardTitle>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/tenant/payments">Semua Tagihan <ArrowRight className="ml-1 h-3 w-3" /></Link>
          </Button>
        </CardHeader>
        <CardContent>
          {activeBill ? (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl p-4 glass-surface">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-base">Periode {activeBill.billing_period}</span>
                  <PaymentStatusBadge status={activeBill.status} />
                </div>
                <p className="text-xs text-muted-foreground">Jatuh tempo: {formatDate(activeBill.due_date)}</p>
                <p className="text-sm font-medium">
                  Sisa Tagihan: {formatRupiah(Number(activeBill.amount_due) - Number(activeBill.amount_paid))}
                </p>
              </div>
              <div>
                <Button onClick={() => navigate('/tenant/payments')}>
                  Bayar Sekarang
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 py-4 text-sm text-muted-foreground">
              <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
              <span>Semua tagihan lunas! Tidak ada tagihan yang perlu dibayar saat ini.</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Laporan Saya */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Wrench className="h-4 w-4" /> Laporan Saya
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/tenant/reports">Buka Laporan <ArrowRight className="ml-1 h-3 w-3" /></Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-6 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Laporan aktif</p>
              <p className="text-xl font-bold">{reportsSummary.activeTotal}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Sedang diproses</p>
              <p className="text-xl font-bold">{reportsSummary.inProgressCount}</p>
            </div>
          </div>

          {reportsSummary.recentActive.length > 0 ? (
            <div className="space-y-2 pt-2 border-t">
              <p className="text-xs font-medium text-muted-foreground">Laporan Aktif Terbaru:</p>
              {reportsSummary.recentActive.map((r) => (
                <div key={r.id} className="flex items-center justify-between text-sm py-1 border-b last:border-b-0">
                  <div className="min-w-0 pr-2">
                    <p className="truncate font-medium">{r.title}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(r.created_at)}</p>
                  </div>
                  <MaintenanceStatusBadge status={r.status} />
                </div>
              ))}
            </div>
          ) : (
            <div className="py-2 text-sm text-muted-foreground">
              <p>Tidak ada laporan kendala aktif.</p>
              <p className="text-xs">Ada kerusakan kamar? <Link to="/tenant/reports" className="text-primary underline">Ajukan laporan baru</Link></p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
