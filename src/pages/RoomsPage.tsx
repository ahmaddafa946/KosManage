import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { useProperty } from '@/hooks/useProperty';
import { getRooms, createRoom, updateRoom, deleteRoom, type RoomFilters } from '@/services/rooms';
import { getFacilities, createFacility, getRoomFacilityMap, setRoomFacilities, mergeFacilitySelection } from '@/services/facilities';
import type { Facility } from '@/types/database';
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
import { SortableTableHead } from '@/components/ui/sortable-table-head';
import { sortRows, type SortDirection } from '@/lib/sorting';

const EMPTY: RoomInput = { room_number: '', floor: null, price: 0, status: 'available', notes: '' };
type RoomSortKey = 'room_number' | 'floor' | 'price' | 'status' | 'facilities';

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
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([]);
  const [newFacilityName, setNewFacilityName] = useState('');
  const [addingFacility, setAddingFacility] = useState(false);
  const [roomFacilityNames, setRoomFacilityNames] = useState<Record<string, string>>({});
  const [sortKey, setSortKey] = useState<RoomSortKey>('room_number');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const facilitiesCache = useRef<Facility[]>([]);

  async function load() {
    if (!property) return;
    setLoading(true);
    try {
      const master = await getFacilities(property.id);
      setFacilities(master);
      facilitiesCache.current = master;
      const filters: RoomFilters = { q: q || undefined, status };
      const list = await getRooms(property.id, filters);
      setRooms(list);
      try {
        const map = await getRoomFacilityMap(list.map((r) => r.id));
        const byId = new Map(facilitiesCache.current.map((f) => [f.id, f.name]));
        const names: Record<string, string> = {};
        for (const r of list) {
          const ids = map[r.id] ?? [];
          names[r.id] = ids.length > 0 ? ids.map((id) => byId.get(id) ?? '…').join(', ') : (r.facilities ?? '-');
        }
        setRoomFacilityNames(names);
      } catch {
        const names: Record<string, string> = {};
        for (const r of list) names[r.id] = r.facilities ?? '-';
        setRoomFacilityNames(names);
      }
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

  const sortedRooms = useMemo(() => sortRows(
    rooms,
    (room) => sortKey === 'facilities' ? (roomFacilityNames[room.id] ?? room.facilities) : room[sortKey],
    sortDirection,
    sortKey === 'room_number' ? 'natural' : sortKey === 'price' || sortKey === 'floor' ? 'number' : 'text',
  ), [rooms, roomFacilityNames, sortKey, sortDirection]);

  function handleSort(key: RoomSortKey) {
    if (sortKey === key) setSortDirection((direction) => direction === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDirection('asc'); }
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setSelectedFacilities([]);
    setNewFacilityName('');
    setFormError(null);
    setDialogOpen(true);
  }

  async function openEdit(r: Room) {
    setEditing(r);
    setForm({ room_number: r.room_number, floor: r.floor, price: Number(r.price), status: r.status, notes: r.notes ?? '' });
    setNewFacilityName('');
    setFormError(null);
    setDialogOpen(true);
    // Preselect M2M links; inactive-linked ids preserved on save.
    try {
      const map = await getRoomFacilityMap([r.id]);
      setSelectedFacilities(map[r.id] ?? []);
    } catch {
      setSelectedFacilities([]);
    }
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
      // Preserve links to inactive facilities (hidden from checkboxes).
      const activeIds = new Set(facilities.map((f) => f.id));
      const preserved = selectedFacilities.filter((id) => !activeIds.has(id));
      const checked = selectedFacilities.filter((id) => activeIds.has(id));
      const merged = mergeFacilitySelection(checked, preserved);
      let roomId: string;
      if (editing) {
        await updateRoom(editing.id, parsed.data);
        roomId = editing.id;
      } else {
        const created = await createRoom(property.id, parsed.data);
        roomId = created.id;
      }
      await setRoomFacilities(roomId, merged);
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
            <div className="w-full overflow-x-auto"><Table>
              <TableHeader><TableRow>
  <SortableTableHead active={sortKey === 'room_number'} direction={sortDirection} onSort={() => handleSort('room_number')}>Nomor</SortableTableHead>
  <SortableTableHead active={sortKey === 'floor'} direction={sortDirection} onSort={() => handleSort('floor')}>Lantai</SortableTableHead>
  <SortableTableHead active={sortKey === 'price'} direction={sortDirection} onSort={() => handleSort('price')}>Harga</SortableTableHead>
  <SortableTableHead active={sortKey === 'status'} direction={sortDirection} onSort={() => handleSort('status')}>Status</SortableTableHead>
  <SortableTableHead active={sortKey === 'facilities'} direction={sortDirection} onSort={() => handleSort('facilities')}>Fasilitas</SortableTableHead>
  <TableHead className="text-right">Aksi</TableHead>
</TableRow></TableHeader>
              <TableBody>
                {sortedRooms.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.room_number}</TableCell>
                    <TableCell>{r.floor ?? '-'}</TableCell>
                    <TableCell>{formatRupiah(Number(r.price))}</TableCell>
                    <TableCell><RoomStatusBadge status={r.status} /></TableCell>
                    <TableCell className="max-w-48 truncate">{roomFacilityNames[r.id] ?? r.facilities ?? '-'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(r)} aria-label={`Ubah kamar ${r.room_number}`}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(r)} aria-label={`Hapus kamar ${r.room_number}`}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
            <div className="space-y-2">
              <Label>Fasilitas</Label>
              {facilities.length === 0 ? (
                <p className="text-sm text-muted-foreground">Belum ada fasilitas. Tambahkan di bawah.</p>
              ) : (
                <div className="grid grid-cols-2 gap-2" role="group" aria-label="Pilih fasilitas">
                  {facilities.map((f) => (
                    <label key={f.id} className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-primary"
                        checked={selectedFacilities.includes(f.id)}
                        disabled={busy}
                        onChange={(e) =>
                          setSelectedFacilities((prev) =>
                            e.target.checked ? [...prev, f.id] : prev.filter((id) => id !== f.id)
                          )
                        }
                      />
                      {f.name}
                    </label>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  placeholder="+ Tambahkan Fasilitas"
                  value={newFacilityName}
                  onChange={(e) => setNewFacilityName(e.target.value)}
                  disabled={busy || addingFacility}
                  aria-label="Nama fasilitas baru"
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy || addingFacility || !property || newFacilityName.trim() === ''}
                  onClick={async () => {
                    if (!property) return;
                    setAddingFacility(true);
                    try {
                      const created = await createFacility(property.id, newFacilityName);
                      setFacilities((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
                      setSelectedFacilities((prev) => [...prev, created.id]);
                      setNewFacilityName('');
                    } catch (e) {
                      setFormError(mapSupabaseError(e));
                    } finally {
                      setAddingFacility(false);
                    }
                  }}
                >
                  {addingFacility ? 'Menambah...' : 'Tambah'}
                </Button>
              </div>
            </div>
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
