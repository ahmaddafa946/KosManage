import { useEffect, useState } from 'react';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { useProperty } from '@/hooks/useProperty';
import { getRooms, createRoom, updateRoom, deleteRoom, type RoomFilters } from '@/services/rooms';
import { roomSchema, type RoomInput } from '@/schemas/room';
import { mapSupabaseError } from '@/lib/errors';
import { formatRupiah } from '@/lib/utils';
import type { Room, RoomStatus } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RoomStatusBadge } from '@/components/StatusBadge';
import { Skeleton } from '@/components/ui/skeleton';

const EMPTY: RoomInput = { room_number: '', floor: null, price: 0, status: 'available', facilities: '', notes: '' };

export default function RoomsPage() {
  const { property, loading: propLoading } = useProperty();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<RoomStatus | 'all'>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Room | null>(null);
  const [form, setForm] = useState<RoomInput>(EMPTY);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Room | null>(null);

  async function load() {
    if (!property) return;
    setLoading(true);
    try {
      const filters: RoomFilters = { q: q || undefined, status };
      setRooms(await getRooms(property.id, filters));
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

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setFormError(null);
    setDialogOpen(true);
  }

  function openEdit(r: Room) {
    setEditing(r);
    setForm({ room_number: r.room_number, floor: r.floor, price: Number(r.price), status: r.status, facilities: r.facilities ?? '', notes: r.notes ?? '' });
    setFormError(null);
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!property) return;
    const parsed = roomSchema.safeParse(form);
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? 'Input tidak valid.');
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      if (editing) await updateRoom(editing.id, parsed.data);
      else await createRoom(property.id, parsed.data);
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
      await deleteRoom(confirmDelete.id);
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
        <div className="relative min-w-52 flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Cari nomor kamar..." value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void load(); }} aria-label="Cari kamar" />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as RoomStatus | 'all')}>
          <SelectTrigger className="w-44" aria-label="Filter status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua status</SelectItem>
            <SelectItem value="available">Kosong</SelectItem>
            <SelectItem value="occupied">Terisi</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => void load()}>Cari</Button>
        <Button onClick={openCreate}><Plus className="h-4 w-4" /> Tambah Kamar</Button>
      </div>

      {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive" role="alert">{error}</div>}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
          ) : rooms.length === 0 ? (
            <div className="p-8 text-center">
              <p className="font-medium">Belum ada kamar</p>
              <p className="mt-1 text-sm text-muted-foreground">Tambahkan kamar pertama Anda.</p>
              <Button className="mt-4" onClick={openCreate}><Plus className="h-4 w-4" /> Tambah Kamar</Button>
            </div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Nomor</TableHead><TableHead>Lantai</TableHead><TableHead>Harga</TableHead><TableHead>Status</TableHead><TableHead>Fasilitas</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
              <TableBody>
                {rooms.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.room_number}</TableCell>
                    <TableCell>{r.floor ?? '-'}</TableCell>
                    <TableCell>{formatRupiah(Number(r.price))}</TableCell>
                    <TableCell><RoomStatusBadge status={r.status} /></TableCell>
                    <TableCell className="max-w-48 truncate">{r.facilities ?? '-'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(r)} aria-label={`Ubah kamar ${r.room_number}`}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(r)} aria-label={`Hapus kamar ${r.room_number}`}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
          <DialogHeader><DialogTitle>{editing ? 'Ubah Kamar' : 'Tambah Kamar'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label htmlFor="room_number">Nomor Kamar</Label><Input id="room_number" value={form.room_number} onChange={(e) => setForm({ ...form, room_number: e.target.value })} disabled={busy} /></div>
              <div className="space-y-1"><Label htmlFor="floor">Lantai</Label><Input id="floor" type="number" value={form.floor ?? ''} onChange={(e) => setForm({ ...form, floor: e.target.value === '' ? null : Number(e.target.value) })} disabled={busy} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label htmlFor="price">Harga Sewa</Label><Input id="price" type="number" min={0} value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} disabled={busy} /></div>
              <div className="space-y-1"><Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as RoomStatus })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="available">Kosong</SelectItem><SelectItem value="occupied">Terisi</SelectItem><SelectItem value="maintenance">Maintenance</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1"><Label htmlFor="facilities">Fasilitas</Label><Input id="facilities" value={form.facilities ?? ''} onChange={(e) => setForm({ ...form, facilities: e.target.value })} disabled={busy} /></div>
            <div className="space-y-1"><Label htmlFor="notes">Catatan</Label><Input id="notes" value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} disabled={busy} /></div>
            {formError && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{formError}</p>}
            <DialogFooter><Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={busy}>Batal</Button><Button type="submit" disabled={busy}>{busy ? 'Menyimpan...' : 'Simpan'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmDelete} onOpenChange={(o) => { if (!o) setConfirmDelete(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Hapus kamar {confirmDelete?.room_number}?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Kamar dengan penghuni aktif tidak dapat dihapus. Tindakan ini tidak dapat dibatalkan.</p>
          <DialogFooter><Button variant="outline" onClick={() => setConfirmDelete(null)} disabled={busy}>Batal</Button><Button variant="destructive" onClick={() => void handleDelete()} disabled={busy}>{busy ? 'Menghapus...' : 'Hapus'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
