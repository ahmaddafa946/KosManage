import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, History, Home, Wallet } from 'lucide-react';
import { getMyBills } from '@/services/payments';
import { getMyRentalHistory } from '@/services/tenantHistory';
import { mapSupabaseError } from '@/lib/errors';
import type { Payment, Tenant } from '@/types/database';
import { PaymentStatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate, formatRupiah } from '@/lib/utils';
import { sortRows, type SortDirection } from '@/lib/sorting';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type HistoryPaymentSortKey = 'period' | 'payment_date' | 'amount_paid' | 'method';
type HistoryRentalSortKey = 'room' | 'start_date' | 'end_date' | 'rent_price' | 'status';

export default function TenantHistoryPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [rentals, setRentals] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentSortKey, setPaymentSortKey] = useState<HistoryPaymentSortKey>('period');
  const [paymentSortDirection, setPaymentSortDirection] = useState<SortDirection>('desc');
  const [rentalSortKey, setRentalSortKey] = useState<HistoryRentalSortKey>('start_date');
  const [rentalSortDirection, setRentalSortDirection] = useState<SortDirection>('desc');

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

  const sortedPayments = useMemo(() => sortRows(
    payments,
    (payment) => {
      switch (paymentSortKey) {
        case 'period': return payment.billing_period;
        case 'payment_date': return payment.payment_date;
        case 'amount_paid': return Number(payment.amount_paid);
        case 'method': return payment.payment_method;
      }
    },
    paymentSortDirection,
    paymentSortKey === 'amount_paid' ? 'number' : paymentSortKey === 'payment_date' ? 'date' : 'text',
  ), [payments, paymentSortKey, paymentSortDirection]);

  const sortedRentals = useMemo(() => sortRows(
    rentals,
    (rental) => {
      switch (rentalSortKey) {
        case 'room': return rental.room?.room_number;
        case 'start_date': return rental.start_date;
        case 'end_date': return rental.end_date;
        case 'rent_price': return Number(rental.rent_price);
        case 'status': return rental.status;
      }
    },
    rentalSortDirection,
    rentalSortKey === 'rent_price' ? 'number' : rentalSortKey.includes('date') ? 'date' : rentalSortKey === 'room' ? 'natural' : 'text',
  ), [rentals, rentalSortKey, rentalSortDirection]);

  function togglePaymentSort(key: HistoryPaymentSortKey) {
    if (paymentSortKey === key) setPaymentSortDirection((direction) => direction === 'asc' ? 'desc' : 'asc');
    else { setPaymentSortKey(key); setPaymentSortDirection('asc'); }
  }

  function toggleRentalSort(key: HistoryRentalSortKey) {
    if (rentalSortKey === key) setRentalSortDirection((direction) => direction === 'asc' ? 'desc' : 'asc');
    else { setRentalSortKey(key); setRentalSortDirection('asc'); }
  }

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
        <CardHeader className="flex flex-wrap items-center justify-between gap-2">
  <CardTitle className="flex items-center gap-2 text-sm"><Wallet className="h-4 w-4" /> Riwayat Pembayaran</CardTitle>
  <div className="flex items-center gap-2">
    <Select value={paymentSortKey} onValueChange={(value) => togglePaymentSort(value as HistoryPaymentSortKey)}>
      <SelectTrigger className="w-40" aria-label="Urutkan riwayat pembayaran"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="period">Periode</SelectItem>
        <SelectItem value="payment_date">Tanggal bayar</SelectItem>
        <SelectItem value="amount_paid">Nominal</SelectItem>
        <SelectItem value="method">Metode</SelectItem>
      </SelectContent>
    </Select>
    <Button variant="outline" size="icon" onClick={() => setPaymentSortDirection((direction) => direction === 'asc' ? 'desc' : 'asc')} aria-label={paymentSortDirection === 'asc' ? 'Urutkan menurun' : 'Urutkan menaik'}>
      {paymentSortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
    </Button>
  </div>
</CardHeader>
        <CardContent className="space-y-2">
          {payments.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">Belum ada pembayaran lunas.</p>
          ) : sortedPayments.map((payment) => (
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
        <CardHeader className="flex flex-wrap items-center justify-between gap-2">
  <CardTitle className="flex items-center gap-2 text-sm"><Home className="h-4 w-4" /> Riwayat Masa Sewa</CardTitle>
  <div className="flex items-center gap-2">
    <Select value={rentalSortKey} onValueChange={(value) => toggleRentalSort(value as HistoryRentalSortKey)}>
      <SelectTrigger className="w-40" aria-label="Urutkan riwayat masa sewa"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="room">Nomor kamar</SelectItem>
        <SelectItem value="start_date">Tanggal mulai</SelectItem>
        <SelectItem value="end_date">Tanggal selesai</SelectItem>
        <SelectItem value="rent_price">Harga sewa</SelectItem>
        <SelectItem value="status">Status</SelectItem>
      </SelectContent>
    </Select>
    <Button variant="outline" size="icon" onClick={() => setRentalSortDirection((direction) => direction === 'asc' ? 'desc' : 'asc')} aria-label={rentalSortDirection === 'asc' ? 'Urutkan menurun' : 'Urutkan menaik'}>
      {rentalSortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
    </Button>
  </div>
</CardHeader>
        <CardContent className="space-y-2">
          {rentals.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">Belum ada riwayat masa sewa.</p>
          ) : sortedRentals.map((rental) => (
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
