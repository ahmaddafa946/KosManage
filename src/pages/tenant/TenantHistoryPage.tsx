import { useEffect, useState } from 'react';
import { History, Home, Wallet } from 'lucide-react';
import { getMyBills } from '@/services/payments';
import { getMyRentalHistory } from '@/services/tenantHistory';
import { mapSupabaseError } from '@/lib/errors';
import type { Payment, Tenant } from '@/types/database';
import { PaymentStatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate, formatRupiah } from '@/lib/utils';

export default function TenantHistoryPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [rentals, setRentals] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [bills, rentalRows] = await Promise.all([getMyBills(), getMyRentalHistory()]);
      setPayments(bills.filter((bill) => bill.status === 'paid'));
      setRentals(rentalRows);
    } catch (err) {
      setError(mapSupabaseError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  if (loading) {
    return (
      <div className="space-y-4" aria-label="Memuat riwayat">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold"><History className="h-5 w-5" /> Riwayat</h1>
        <p className="mt-1 text-sm text-muted-foreground">Riwayat pembayaran dan masa sewa Anda.</p>
      </div>

      {error && (
        <div role="alert" className="space-y-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          <p>{error}</p>
          <Button variant="outline" size="sm" onClick={() => void load()}>Coba lagi</Button>
        </div>
      )}

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Wallet className="h-4 w-4" /> Riwayat Pembayaran</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {payments.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">Belum ada pembayaran lunas.</p>
          ) : payments.map((payment) => (
            <div key={payment.id} className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">Periode {payment.billing_period}</p>
                <p className="text-xs text-muted-foreground">
                  Dibayar {payment.payment_date ? formatDate(payment.payment_date) : '-'} · {(payment.payment_method ?? '-').toUpperCase()}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold">{formatRupiah(Number(payment.amount_paid))}</span>
                <PaymentStatusBadge status={payment.status} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Home className="h-4 w-4" /> Riwayat Masa Sewa</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {rentals.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">Belum ada riwayat masa sewa.</p>
          ) : rentals.map((rental) => (
            <div key={rental.id} className="rounded-md border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{rental.room?.room_number ? 'Kamar ' + rental.room.room_number : 'Kamar tidak tersedia'}</p>
                <span className="text-xs text-muted-foreground">{rental.status === 'active' ? 'Aktif' : 'Selesai'}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatDate(rental.start_date)} — {rental.end_date ? formatDate(rental.end_date) : 'Berjalan'}
              </p>
              <p className="mt-1 text-sm">{formatRupiah(Number(rental.rent_price))} / bulan</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
