import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useProperty } from '@/hooks/useProperty';
import { getPayments, createPayment, updatePayment, deletePayment } from '@/services/payments';
import { getTenants } from '@/services/tenants';
import { paymentSchema, type PaymentInput } from '@/schemas/payment';
import { mapSupabaseError } from '@/lib/errors';
import { formatRupiah, formatDate } from '@/lib/utils';
import type { Payment, PaymentMethod, PaymentStatus, Tenant } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PaymentStatusBadge } from '@/components/StatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { SortableTableHead } from '@/components/ui/sortable-table-head';
import { sortRows, type SortDirection } from '@/lib/sorting';

type PaymentSortKey = 'tenant' | 'room' | 'billing_period' | 'due_date' | 'amount_due' | 'amount_paid' | 'status' | 'payment_method';

const EMPTY: PaymentInput = { tenant_id: '', billing_period: new Date().toISOString().slice(0, 7), due_date: new Date().toISOString().slice(0, 10), amount_due: 0, amount_paid: 0, payment_date: '', payment_method: null, notes: '' };

export default function PaymentsPage() {
  const { property, loading: propLoading } = useProperty();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fStatus, setFStatus] = useState<PaymentStatus | 'all'>('all');
  const [fMethod, setFMethod] = useState<PaymentMethod | 'all'>('all');
  const [fPeriod, setFPeriod] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Payment | null>(null);
  const [form, setForm] = useState<PaymentInput>(EMPTY);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Payment | null>(null);
  const [sortKey, setSortKey] = useState<PaymentSortKey>('due_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  async function load() {
    if (!property) return;
    setLoading(true);
    try {
      const [p, t] = await Promise.all([
        getPayments(property.id, {
          status: fStatus,
          method: fMethod,
          billingPeriod: fPeriod || undefined,
        }),
        getTenants(property.id, { status: 'all' }),
      ]);
      setPayments(p);
      setTenants(t);
      setError(null);
    } catch (e) {
      setError(mapSupabaseError(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!propLoading && property) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propLoading, property?.id]);

  const sortedPayments = useMemo(() => sortRows(
    payments,
    (payment) => {
      switch (sortKey) {
        case 'tenant': return payment.tenant?.name;
        case 'room': return payment.room?.room_number;
        case 'billing_period': return payment.billing_period;
        case 'due_date': return payment.due_date;
        case 'amount_due': return Number(payment.amount_due);
        case 'amount_paid': return Number(payment.amount_paid);
        case 'status': return payment.status;
        case 'payment_method': return payment.payment_method;
      }
    },
    sortDirection,
    ['amount_due', 'amount_paid'].includes(sortKey) ? 'number' : sortKey === 'due_date' ? 'date' : sortKey === 'room' ? 'natural' : 'text',
  ), [payments, sortKey, sortDirection]);

  function handleSort(key: PaymentSortKey) {
    if (sortKey === key) setSortDirection((direction) => direction === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDirection('asc'); }
  }

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY, billing_period: new Date().toISOString().slice(0, 7), due_date: new Date().toISOString().slice(0, 10) });
    setFormError(null);
    setDialogOpen(true);
  }

  function openEdit(p: Payment) {
    setEditing(p);
    setForm({
      tenant_id: p.tenant_id, billing_period: p.billing_period, due_date: p.due_date,
      amount_due: Number(p.amount_due), amount_paid: Number(p.amount_paid),
      payment_date: p.payment_date ?? '', payment_method: p.payment_method, notes: p.notes ?? '',
    });
    setFormError(null);
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!property) return;
    const parsed = paymentSchema.safeParse(form);
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? 'Input tidak valid.');
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      if (editing) await updatePayment(editing.id, parsed.data);
      else await createPayment(property.id, parsed.data);
      setDialogOpen(false);
      await load();
    } catch (err) {
      setFormError(mapSupabaseError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setBusy(true);
    try {
      await deletePayment(confirmDelete.id);
      setConfirmDelete(null);
      await load();
    } catch (e) {
      setError(mapSupabaseError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input className="w-36" type="month" value={fPeriod} onChange={(e) => setFPeriod(e.target.value)} aria-label="Filter periode" />
        <Select value={fStatus} onValueChange={(v) => setFStatus(v as PaymentStatus | 'all')}>
          <SelectTrigger className="w-40" aria-label="Filter status"><SelectValue placeholder="Semua status" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Semua status</SelectItem><SelectItem value="unpaid">Belum Bayar</SelectItem><SelectItem value="partial">Sebagian</SelectItem><SelectItem value="paid">Lunas</SelectItem><SelectItem value="overdue">Terlambat</SelectItem></SelectContent>
        </Select>
        <Select value={fMethod} onValueChange={(v) => setFMethod(v as PaymentMethod | 'all')}>
          <SelectTrigger className="w-40" aria-label="Filter metode"><SelectValue placeholder="Semua metode" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Semua metode</SelectItem><SelectItem value="cash">Cash</SelectItem><SelectItem value="transfer">Transfer</SelectItem><SelectItem value="ewallet">E-Wallet</SelectItem><SelectItem value="qris">QRIS</SelectItem></SelectContent>
        </Select>
        <Button variant="outline" onClick={() => void load()}>Terapkan</Button>
        <Button onClick={openCreate}><Plus className="h-4 w-4" /> Catat Pembayaran</Button>
      </div>

      {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive" role="alert">{error}</div>}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
          ) : payments.length === 0 ? (
            <div className="p-8 text-center">
              <p className="font-medium">Belum ada pembayaran</p>
              <p className="mt-1 text-sm text-muted-foreground">Catat tagihan atau pembayaran pertama.</p>
              <Button className="mt-4" onClick={openCreate}><Plus className="h-4 w-4" /> Catat Pembayaran</Button>
            </div>
          ) : (
            <Table>
              <TableHeader><TableRow>
  <SortableTableHead active={sortKey === 'tenant'} direction={sortDirection} onSort={() => handleSort('tenant')}>Penghuni</SortableTableHead>
  <SortableTableHead active={sortKey === 'room'} direction={sortDirection} onSort={() => handleSort('room')}>Kamar</SortableTableHead>
  <SortableTableHead active={sortKey === 'billing_period'} direction={sortDirection} onSort={() => handleSort('billing_period')}>Periode</SortableTableHead>
  <SortableTableHead active={sortKey === 'due_date'} direction={sortDirection} onSort={() => handleSort('due_date')}>Jatuh Tempo</SortableTableHead>
  <SortableTableHead active={sortKey === 'amount_due'} direction={sortDirection} onSort={() => handleSort('amount_due')}>Tagihan</SortableTableHead>
  <SortableTableHead active={sortKey === 'amount_paid'} direction={sortDirection} onSort={() => handleSort('amount_paid')}>Dibayar</SortableTableHead>
  <SortableTableHead active={sortKey === 'status'} direction={sortDirection} onSort={() => handleSort('status')}>Status</SortableTableHead>
  <SortableTableHead active={sortKey === 'payment_method'} direction={sortDirection} onSort={() => handleSort('payment_method')}>Metode</SortableTableHead>
  <TableHead className="text-right">Aksi</TableHead>
</TableRow></TableHeader>
              <TableBody>
                {sortedPayments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.tenant?.name ?? '-'}</TableCell>
                    <TableCell>{p.room?.room_number ?? '-'}</TableCell>
                    <TableCell>{p.billing_period}</TableCell>
                    <TableCell>{formatDate(p.due_date)}</TableCell>
                    <TableCell>{formatRupiah(Number(p.amount_due))}</TableCell>
                    <TableCell>{formatRupiah(Number(p.amount_paid))}</TableCell>
                    <TableCell><PaymentStatusBadge status={p.status} /></TableCell>
                    <TableCell>{p.payment_method ?? '-'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(p)} aria-label="Ubah pembayaran"><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(p)} aria-label="Hapus pembayaran"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Ubah Pembayaran' : 'Catat Pembayaran'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1"><Label>Penghuni</Label>
              <Select value={form.tenant_id} onValueChange={(v) => setForm({ ...form, tenant_id: v })}>
                <SelectTrigger><SelectValue placeholder="Pilih penghuni" /></SelectTrigger>
                <SelectContent>{tenants.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label htmlFor="pperiod">Periode (YYYY-MM)</Label><Input id="pperiod" type="month" value={form.billing_period} onChange={(e) => setForm({ ...form, billing_period: e.target.value })} disabled={busy} /></div>
              <div className="space-y-1"><Label htmlFor="pdue">Jatuh Tempo</Label><Input id="pdue" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} disabled={busy} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label htmlFor="pdueamt">Tagihan</Label><Input id="pdueamt" type="number" min={0} value={form.amount_due} onChange={(e) => setForm({ ...form, amount_due: Number(e.target.value) })} disabled={busy} /></div>
              <div className="space-y-1"><Label htmlFor="ppaid">Dibayar</Label><Input id="ppaid" type="number" min={0} value={form.amount_paid} onChange={(e) => setForm({ ...form, amount_paid: Number(e.target.value) })} disabled={busy} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label htmlFor="ppdate">Tanggal Bayar (opsional)</Label><Input id="ppdate" type="date" value={form.payment_date ?? ''} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} disabled={busy} /></div>
              <div className="space-y-1"><Label>Metode</Label>
                <Select value={form.payment_method ?? ''} onValueChange={(v) => setForm({ ...form, payment_method: (v === '' ? null : v) as PaymentMethod | null })}>
                  <SelectTrigger><SelectValue placeholder="Pilih metode" /></SelectTrigger>
                  <SelectContent><SelectItem value="cash">Cash</SelectItem><SelectItem value="transfer">Transfer</SelectItem><SelectItem value="ewallet">E-Wallet</SelectItem><SelectItem value="qris">QRIS</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Status dihitung otomatis oleh database berdasarkan nominal dan jatuh tempo.</p>
            {formError && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{formError}</p>}
            <DialogFooter><Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={busy}>Batal</Button><Button type="submit" disabled={busy}>{busy ? 'Menyimpan...' : 'Simpan'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmDelete} onOpenChange={(o) => { if (!o) setConfirmDelete(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Hapus pembayaran?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Tindakan ini tidak dapat dibatalkan.</p>
          <DialogFooter><Button variant="outline" onClick={() => setConfirmDelete(null)} disabled={busy}>Batal</Button><Button variant="destructive" onClick={() => void handleDelete()} disabled={busy}>{busy ? 'Menghapus...' : 'Hapus'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
