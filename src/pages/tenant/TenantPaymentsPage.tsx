import { useEffect, useState } from 'react';
import { getMyBills, startSimulatedPayment } from '@/services/payments';
import { tenantPaymentMethodSchema } from '@/schemas/payment';
import { formatRupiah, formatDate } from '@/lib/utils';
import type { Payment, PaymentMethod } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PaymentStatusBadge } from '@/components/StatusBadge';
import { Skeleton } from '@/components/ui/skeleton';

const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'ewallet', label: 'E-Wallet' },
  { value: 'qris', label: 'QRIS' },
];

export default function TenantPaymentsPage() {
  const [bills, setBills] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState<Record<string, PaymentMethod>>({});
  const [confirm, setConfirm] = useState<Payment | null>(null);
  const [busy, setBusy] = useState(false);
  const [simError, setSimError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      setBills(await getMyBills());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat tagihan.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const unpaid = bills.filter((b) => b.status !== 'paid');
  const history = bills.filter((b) => b.status === 'paid');

  function openConfirm(bill: Payment) {
    const parsed = tenantPaymentMethodSchema.safeParse({ payment_method: method[bill.id] ?? 'qris' });
    if (!parsed.success) { setSimError('Pilih metode pembayaran yang valid.'); return; }
    setSimError(null);
    setConfirm(bill);
  }

  async function handleSimulate() {
    if (!confirm) return;
    const m = method[confirm.id] ?? 'qris';
    setBusy(true);
    setSimError(null);
    try {
      const updated = await startSimulatedPayment(confirm.id, m);
      setBills((prev) => prev.map((b) => (b.id === updated.id ? { ...b, ...updated } : b)));
      setConfirm(null);
    } catch (e) {
      setSimError(e instanceof Error ? e.message : 'Pembayaran simulasi gagal.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3" aria-label="Memuat tagihan">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold">Pembayaran Saya</h1>
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        <Button variant="outline" onClick={() => void load()}>Coba lagi</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Pembayaran Saya</h1>

      <section aria-label="Tagihan aktif" className="space-y-3">
        <h2 className="text-base font-medium">Tagihan Aktif ({unpaid.length})</h2>
        {unpaid.length === 0 && (
          <Card><CardContent className="py-6 text-center text-sm text-muted-foreground">Tidak ada tagihan aktif. Semua lunas.</CardContent></Card>
        )}
        {unpaid.map((b) => (
          <Card key={b.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-sm">
                <span>Periode {b.billing_period} · Jatuh tempo {formatDate(b.due_date)}</span>
                <PaymentStatusBadge status={b.status} />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tagihan</span>
                <span className="font-semibold">{formatRupiah(Number(b.amount_due))}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Dibayar</span>
                <span>{formatRupiah(Number(b.amount_paid))}</span>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Select value={method[b.id] ?? 'qris'} onValueChange={(v) => setMethod((m) => ({ ...m, [b.id]: v as PaymentMethod }))}>
                  <SelectTrigger aria-label="Metode pembayaran"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {METHODS.map((m) => (<SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>))}
                  </SelectContent>
                </Select>
                <Button onClick={() => openConfirm(b)}>Bayar (Simulasi)</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section aria-label="Riwayat pembayaran" className="space-y-3">
        <h2 className="text-base font-medium">Riwayat ({history.length})</h2>
        {history.length === 0 && (
          <Card><CardContent className="py-6 text-center text-sm text-muted-foreground">Belum ada riwayat pembayaran.</CardContent></Card>
        )}
        {history.map((b) => (
          <Card key={b.id}>
            <CardContent className="space-y-1 py-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium">Periode {b.billing_period}</span>
                <PaymentStatusBadge status={b.status} />
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>{formatRupiah(Number(b.amount_due))} · {b.payment_method?.toUpperCase() ?? '-'}</span>
                <span>{b.payment_date ? formatDate(b.payment_date) : '-'}</span>
              </div>
              {b.payment_reference && (<p className="text-xs text-muted-foreground">Ref: {b.payment_reference}</p>)}
            </CardContent>
          </Card>
        ))}
      </section>

      <Dialog open={!!confirm} onOpenChange={(o) => { if (!o) setConfirm(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Pembayaran SIMULASI</DialogTitle></DialogHeader>
          <div className="space-y-2 text-sm">
            <p className="rounded-md bg-amber-500/10 px-3 py-2 font-medium text-amber-700">
              SIMULASI — ini bukan transaksi gateway sungguhan dan tidak diproses oleh penyedia pembayaran mana pun.
            </p>
            {confirm && (
              <p>
                Lunasi tagihan periode <strong>{confirm.billing_period}</strong> sebesar{' '}
                <strong>{formatRupiah(Number(confirm.amount_due))}</strong> via{' '}
                <strong>{(method[confirm.id] ?? 'qris').toUpperCase()}</strong>?
              </p>
            )}
            {simError && <p role="alert" className="text-destructive">{simError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(null)} disabled={busy}>Batal</Button>
            <Button onClick={() => void handleSimulate()} disabled={busy}>{busy ? 'Memproses...' : 'Ya, Lunasi (Simulasi)'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
