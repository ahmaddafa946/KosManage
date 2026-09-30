import { useEffect, useState } from 'react';
import { Plus, Wrench } from 'lucide-react';
import { getMyTenantOccupancy } from '@/services/tenantDashboard';
import {
  createMaintenanceReport,
  getMyMaintenanceReports,
  uploadMaintenanceReportPhoto,
} from '@/services/maintenance';
import { maintenanceCreateSchema } from '@/schemas/maintenance';
import { mapSupabaseError } from '@/lib/errors';
import type { MaintenanceCategory, MaintenancePriority, MaintenanceReport } from '@/types/database';
import { MaintenanceStatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/utils';

const CATEGORIES: { value: MaintenanceCategory; label: string }[] = [
  { value: 'AC', label: 'AC' },
  { value: 'electrical', label: 'Listrik' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'furniture', label: 'Furnitur' },
  { value: 'internet', label: 'Internet' },
  { value: 'other', label: 'Lainnya' },
];

const PRIORITIES: { value: MaintenancePriority; label: string }[] = [
  { value: 'low', label: 'Rendah' },
  { value: 'medium', label: 'Sedang' },
  { value: 'high', label: 'Tinggi' },
];

export default function TenantReportsPage() {
  const [reports, setReports] = useState<MaintenanceReport[]>([]);
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [roomNumber, setRoomNumber] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'other' as MaintenanceCategory,
    priority: 'medium' as MaintenancePriority,
    file: null as File | null,
  });
  const [formError, setFormError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [occupancy, ownReports] = await Promise.all([
        getMyTenantOccupancy(),
        getMyMaintenanceReports(),
      ]);
      setReports(ownReports);
      setPropertyId(occupancy?.tenant.property_id ?? null);
      setTenantId(occupancy?.tenant.id ?? null);
      setRoomId(occupancy?.room?.id ?? occupancy?.tenant.room_id ?? null);
      setRoomNumber(occupancy?.room?.room_number ?? null);
    } catch (err) {
      setError(mapSupabaseError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  function resetForm() {
    setForm({
      title: '',
      description: '',
      category: 'other',
      priority: 'medium',
      file: null,
    });
    setFormError(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = maintenanceCreateSchema.safeParse({
      title: form.title,
      description: form.description,
      category: form.category,
      priority: form.priority,
    });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? 'Input tidak valid.');
      return;
    }
    if (!propertyId || !tenantId) {
      setFormError('Akun Anda belum terhubung ke data penghuni aktif. Hubungi pemilik kos.');
      return;
    }

    setBusy(true);
    setFormError(null);
    setMessage(null);
    try {
      const created = await createMaintenanceReport({
        propertyId,
        tenantId,
        roomId,
      }, parsed.data);

      let finalReport = created;
      if (form.file) {
        try {
          await uploadMaintenanceReportPhoto(created.id, form.file);
          finalReport = (await getMyMaintenanceReports()).find((report) => report.id === created.id) ?? created;
        } catch {
          setMessage('Laporan berhasil dibuat, tetapi foto gagal diunggah. Silakan coba lagi.');
          setReports((current) => [created, ...current.filter((report) => report.id !== created.id)]);
          setDialogOpen(false);
          resetForm();
          return;
        }
      }

      setReports((current) => [finalReport, ...current.filter((report) => report.id !== finalReport.id)]);
      setDialogOpen(false);
      resetForm();
      setMessage('Laporan berhasil diajukan.');
    } catch (err) {
      setFormError(mapSupabaseError(err));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4" aria-label="Memuat laporan saya">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold"><Wrench className="h-5 w-5" /> Laporan Saya</h1>
          <p className="mt-1 text-sm text-muted-foreground">Ajukan dan pantau laporan maintenance kamar Anda{roomNumber ? ' (' + roomNumber + ')' : ''}.</p>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }} disabled={!propertyId || !tenantId}><Plus className="h-4 w-4" /> Buat Laporan</Button>
      </div>

      {error && (
        <div role="alert" className="space-y-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          <p>{error}</p>
          <Button variant="outline" size="sm" onClick={() => void load()}>Coba lagi</Button>
        </div>
      )}
      {message && <p role="status" className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{message}</p>}

      <div className="space-y-3">
        {reports.length === 0 ? (
          <Card><CardContent className="py-10 text-center"><p className="font-medium">Belum ada laporan</p><p className="mt-1 text-sm text-muted-foreground">Buat laporan jika ada kerusakan atau kendala di kamar.</p></CardContent></Card>
        ) : reports.map((report) => (
          <Card key={report.id}>
            <CardContent className="space-y-2 py-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2"><span className="font-medium">{report.title}</span><MaintenanceStatusBadge status={report.status} /></div>
                <span className="text-xs text-muted-foreground">{formatDate(report.created_at)}</span>
              </div>
              <p className="text-sm text-muted-foreground">{report.description}</p>
              <p className="text-xs text-muted-foreground">Kategori: {CATEGORIES.find((item) => item.value === report.category)?.label ?? report.category}</p>
              {report.image_url && <p className="text-xs text-muted-foreground">Foto terlampir.</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open && !busy) setDialogOpen(false); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Buat Laporan Maintenance</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1"><Label htmlFor="report-title">Judul</Label><Input id="report-title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} disabled={busy} placeholder="Contoh: AC tidak dingin" /></div>
            <div className="space-y-1">
              <Label htmlFor="report-description">Deskripsi</Label>
              <textarea
                id="report-description"
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                disabled={busy}
                placeholder="Jelaskan kendala yang terjadi..."
                className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Kategori</Label>
                <Select value={form.category} onValueChange={(value) => setForm({ ...form, category: value as MaintenanceCategory })} disabled={busy}>
                  <SelectTrigger aria-label="Kategori laporan"><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Prioritas</Label>
                <Select value={form.priority} onValueChange={(value) => setForm({ ...form, priority: value as MaintenancePriority })} disabled={busy}>
                  <SelectTrigger aria-label="Prioritas laporan"><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORITIES.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="report-photo">Foto (opsional)</Label>
              <Input id="report-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setForm({ ...form, file: event.target.files?.[0] ?? null })} disabled={busy} />
              <p className="text-xs text-muted-foreground">Maksimal 5 MB. JPG, PNG, atau WebP.</p>
            </div>
            {formError && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{formError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={busy}>Batal</Button>
              <Button type="submit" disabled={busy}>{busy ? 'Mengirim...' : 'Ajukan Laporan'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
