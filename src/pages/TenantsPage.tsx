import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Pencil, UserX, Trash2 } from 'lucide-react';
import { useProperty } from '@/hooks/useProperty';
import { getTenants, createTenant, updateTenant, deactivateTenant, deleteTenant } from '@/services/tenants';
import { getAvailableRooms, getRooms } from '@/services/rooms';
import { tenantSchema, type TenantInput } from '@/schemas/tenant';
import { mapSupabaseError } from '@/lib/errors';
import { formatRupiah, formatDate } from '@/lib/utils';
import type { Room, Tenant, TenantStatus } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { SortableTableHead } from '@/components/ui/sortable-table-head';
import { sortRows, type SortDirection } from '@/lib/sorting';

type TenantSortKey = 'name' | 'room' | 'phone' | 'start_date' | 'rent_price' | 'status';

const EMPTY: TenantInput = { name: '', phone: '', email: '', identity_number: '', room_id: '', start_date: new Date().toISOString().slice(0, 10), end_date: '', rent_price: 0, deposit: null, status: 'active', notes: '' };

export default function TenantsPage() {
  const { property, loading: propLoading } = useProperty();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [availRooms, setAvailRooms] = useState<Room[]>([]);
  const [allRooms, setAllRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<TenantStatus | 'all'>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Tenant | null>(null);
  const [form, setForm] = useState<TenantInput>(EMPTY);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Tenant | null>(null);
  const [sortKey, setSortKey] = useState<TenantSortKey>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  async function load() {
    if (!property) return;
    setLoading(true);
    try {
      const [t, a, all] = await Promise.all([
        getTenants(property.id, { q: q || undefined, status }),
        getAvailableRooms(property.id),
        getRooms(property.id),
      ]);
      setTenants(t);
      setAvailRooms(a);
      setAllRooms(all);
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

  const sortedTenants = useMemo(() => sortRows(
    tenants,
    (tenant) => sortKey === 'room' ? roomLabel(tenant.room_id) : tenant[sortKey],
    sortDirection,
    sortKey === 'rent_price' ? 'number' : sortKey === 'start_date' ? 'date' : sortKey === 'room' ? 'natural' : 'text',
  ), [tenants, allRooms, sortKey, sortDirection]);

  function handleSort(key: TenantSortKey) {
    if (sortKey === key) setSortDirection((direction) => direction === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDirection('asc'); }
  }

  function roomLabel(id: string | null): string {
    if (!id) return '-';
    return allRooms.find((r) => r.id === id)?.room_number ?? '-';
  }

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY, start_date: new Date().toISOString().slice(0, 10) });
    setFormError(null);
    setDialogOpen(true);
  }

  function openEdit(t: Tenant) {
    setEditing(t);
    setForm({
      name: t.name, phone: t.phone ?? '', email: t.email ?? '', identity_number: t.identity_number ?? '',
      room_id: t.room_id ?? '', start_date: t.start_date, end_date: t.end_date ?? '',
      rent_price: Number(t.rent_price), deposit: t.deposit != null ? Number(t.deposit) : null,
      status: t.status, notes: t.notes ?? '',
    });
    setFormError(null);
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!property) return;
    const payload = { ...form, room_id: form.room_id === '' ? null : form.room_id };
    const parsed = tenantSchema.safeParse(payload);
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? 'Input tidak valid.');
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      if (editing) await updateTenant(editing.id, parsed.data);
      else await createTenant(property.id, parsed.data);
      setDialogOpen(false);
      await load();
    } catch (err) {
      setFormError(mapSupabaseError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleDeactivate(t: Tenant) {
    setBusy(true);
    try {
      await deactivateTenant(t.id, new Date().toISOString().slice(0, 10));
      await load();
    } catch (e) {
      setError(mapSupabaseError(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setBusy(true);
    try {
      await deleteTenant(confirmDelete.id);
      setConfirmDelete(null);
      await load();
    } catch (e) {
      setError(mapSupabaseError(e));
    } finally {
      setBusy(false);
    }
  }

  const roomOptions = editing ? [...availRooms, ...allRooms.filter((r) => r.id === editing.room_id)] : availRooms;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Cari nama / telepon..." value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void load(); }} aria-label="Cari penghuni" />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as TenantStatus | 'all')}>
          <SelectTrigger className="w-44" aria-label="Filter status"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Semua</SelectItem><SelectItem value="active">Aktif</SelectItem><SelectItem value="inactive">Nonaktif</SelectItem></SelectContent>
        </Select>
        <Button variant="outline" onClick={() => void load()}>Cari</Button>
        <Button onClick={openCreate}><Plus className="h-4 w-4" /> Tambah Penghuni</Button>
      </div>

      {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive" role="alert">{error}</div>}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
          ) : tenants.length === 0 ? (
            <div className="p-8 text-center">
              <p className="font-medium">Belum ada penghuni</p>
              <p className="mt-1 text-sm text-muted-foreground">Tambahkan penghuni ke kamar yang tersedia.</p>
              <Button className="mt-4" onClick={openCreate}><Plus className="h-4 w-4" /> Tambah Penghuni</Button>
            </div>
          ) : (
            <div className="w-full overflow-x-auto"><Table>
              <TableHeader><TableRow>
  <SortableTableHead active={sortKey === 'name'} direction={sortDirection} onSort={() => handleSort('name')}>Nama</SortableTableHead>
  <SortableTableHead active={sortKey === 'room'} direction={sortDirection} onSort={() => handleSort('room')}>Kamar</SortableTableHead>
  <SortableTableHead active={sortKey === 'phone'} direction={sortDirection} onSort={() => handleSort('phone')}>Telepon</SortableTableHead>
  <SortableTableHead active={sortKey === 'start_date'} direction={sortDirection} onSort={() => handleSort('start_date')}>Mulai</SortableTableHead>
  <SortableTableHead active={sortKey === 'rent_price'} direction={sortDirection} onSort={() => handleSort('rent_price')}>Sewa</SortableTableHead>
  <SortableTableHead active={sortKey === 'status'} direction={sortDirection} onSort={() => handleSort('status')}>Status</SortableTableHead>
  <TableHead className="text-right">Aksi</TableHead>
</TableRow></TableHeader>
              <TableBody>
                {sortedTenants.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell>{roomLabel(t.room_id)}</TableCell>
                    <TableCell>{t.phone ?? '-'}</TableCell>
                    <TableCell>{formatDate(t.start_date)}</TableCell>
                    <TableCell>{formatRupiah(Number(t.rent_price))}</TableCell>
                    <TableCell>{t.status === 'active' ? <Badge>Aktif</Badge> : <Badge variant="secondary">Nonaktif</Badge>}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(t)} aria-label={`Ubah ${t.name}`}><Pencil className="h-4 w-4" /></Button>
                      {t.status === 'active' && (
                        <Button variant="ghost" size="sm" onClick={() => void handleDeactivate(t)} aria-label={`Nonaktifkan ${t.name}`}><UserX className="h-4 w-4" /></Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(t)} aria-label={`Hapus ${t.name}`}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table></div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Ubah Penghuni' : 'Tambah Penghuni'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1"><Label htmlFor="tname">Nama Lengkap</Label><Input id="tname" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} disabled={busy} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label htmlFor="tphone">Telepon</Label><Input id="tphone" value={form.phone ?? ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} disabled={busy} /></div>
              <div className="space-y-1"><Label htmlFor="temail">Email (opsional)</Label><Input id="temail" type="email" value={form.email ?? ''} onChange={(e) => setForm({ ...form, email: e.target.value })} disabled={busy} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Kamar</Label>
                <Select value={form.room_id ?? ''} onValueChange={(v) => setForm({ ...form, room_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Pilih kamar tersedia" /></SelectTrigger>
                  <SelectContent>
                    {roomOptions.length === 0 && <SelectItem value="__none" disabled>Tidak ada kamar tersedia</SelectItem>}
                    {roomOptions.map((r) => <SelectItem key={r.id} value={r.id}>{r.room_number} · {formatRupiah(Number(r.price))}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as TenantStatus })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="active">Aktif</SelectItem><SelectItem value="inactive">Nonaktif</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label htmlFor="tstart">Tanggal Mulai</Label><Input id="tstart" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} disabled={busy} /></div>
              <div className="space-y-1"><Label htmlFor="tend">Tanggal Selesai (opsional)</Label><Input id="tend" type="date" value={form.end_date ?? ''} onChange={(e) => setForm({ ...form, end_date: e.target.value })} disabled={busy} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label htmlFor="trent">Harga Sewa</Label><Input id="trent" type="number" min={0} value={form.rent_price} onChange={(e) => setForm({ ...form, rent_price: Number(e.target.value) })} disabled={busy} /></div>
              <div className="space-y-1"><Label htmlFor="tdep">Deposit (opsional)</Label><Input id="tdep" type="number" min={0} value={form.deposit ?? ''} onChange={(e) => setForm({ ...form, deposit: e.target.value === '' ? null : Number(e.target.value) })} disabled={busy} /></div>
            </div>
            {formError && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{formError}</p>}
            <DialogFooter><Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={busy}>Batal</Button><Button type="submit" disabled={busy}>{busy ? 'Menyimpan...' : 'Simpan'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmDelete} onOpenChange={(o) => { if (!o) setConfirmDelete(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Hapus {confirmDelete?.name}?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Disarankan menonaktifkan penghuni agar riwayat pembayaran tetap ada. Hapus permanen hanya jika belum ada pembayaran.</p>
          <DialogFooter><Button variant="outline" onClick={() => setConfirmDelete(null)} disabled={busy}>Batal</Button><Button variant="destructive" onClick={() => void handleDelete()} disabled={busy}>{busy ? 'Menghapus...' : 'Hapus'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
