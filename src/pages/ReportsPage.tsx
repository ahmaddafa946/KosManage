import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Wrench } from 'lucide-react';
import { useProperty } from '@/hooks/useProperty';
import { getRooms } from '@/services/rooms';
import { getMaintenanceReports, updateMaintenanceReport } from '@/services/maintenance';
import { mapSupabaseError } from '@/lib/errors';
import type { MaintenanceReport, MaintenanceStatus, Room } from '@/types/database';
import { MaintenanceStatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/utils';

const STATUS_OPTIONS: { value: MaintenanceStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Semua status' },
  { value: 'submitted', label: 'Diajukan' },
  { value: 'in_progress', label: 'Sedang Diproses' },
  { value: 'resolved', label: 'Selesai' },
  { value: 'closed', label: 'Ditutup' },
];

const CATEGORY_LABEL: Record<MaintenanceReport['category'], string> = {
  AC: 'AC',
  electrical: 'Listrik',
  plumbing: 'Plumbing',
  furniture: 'Furnitur',
  internet: 'Internet',
  other: 'Lainnya',
};

const NEXT_STATUS_OPTIONS: Record<MaintenanceStatus, MaintenanceStatus[]> = {
  submitted: ['submitted', 'in_progress'],
  in_progress: ['in_progress', 'resolved'],
  resolved: ['resolved', 'closed'],
  closed: ['closed'],
};

const PRIORITY_LABEL: Record<MaintenanceReport['priority'], string> = {
  low: 'Rendah',
  medium: 'Sedang',
  high: 'Tinggi',
};

export function ReportsPageSource(): string {
  return JSON.stringify(NEXT_STATUS_OPTIONS);
}

export default function ReportsPage() {
  const { property, loading: propLoading } = useProperty();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [reports, setReports] = useState<MaintenanceReport[]>([]);
  const [status, setStatus] = useState<MaintenanceStatus | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    if (!property) return;
    setLoading(true);
    setError(null);
    try {
      const [roomRows, reportRows] = await Promise.all([
        getRooms(property.id),
        getMaintenanceReports(property.id),
      ]);
      setRooms(roomRows);
      setReports(reportRows);
    } catch (err) {
      setError(mapSupabaseError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!propLoading && property) void load();
  }, [propLoading, property?.id]);

  const visibleReports = useMemo(
    () => (status === 'all' ? reports : reports.filter((report) => report.status === status)),
    [reports, status],
  );

  const occupied = rooms.filter((room) => room.status === 'occupied').length;
  const occupancy = rooms.length > 0 ? Math.round((occupied / rooms.length) * 100) : 0;
  const activeReports = reports.filter((report) => report.status === 'submitted' || report.status === 'in_progress').length;
  const inProgress = reports.filter((report) => report.status === 'in_progress').length;
  const maintenanceRooms = rooms.filter((room) => room.status === 'maintenance').length;

  function roomLabel(roomId: string | null): string {
    if (!roomId) return 'Kamar -';
    return rooms.find((room) => room.id === roomId)?.room_number ?? 'Kamar -';
  }

  async function handleStatusChange(report: MaintenanceReport, next: MaintenanceStatus) {
    if (next === report.status) return;
    setBusyId(report.id);
    setError(null);
    try {
      const updated = await updateMaintenanceReport(report.id, { status: next });
      setReports((current) => current.map((item) => item.id === updated.id ? updated : item));
    } catch (err) {
      setError(mapSupabaseError(err));
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4" aria-label="Memuat laporan operasional">
        <Skeleton className="h-8 w-56" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold">
          <BarChart3 className="h-5 w-5" />
          Laporan Operasional
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pantau okupansi dan kendala maintenance kos.
        </p>
      </div>

      {error && (
        <div role="alert" className="space-y-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          <p>{error}</p>
          <Button variant="outline" size="sm" onClick={() => void load()}>Coba lagi</Button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Okupansi</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{occupancy}%</div><p className="text-xs text-muted-foreground">{occupied} dari {rooms.length} kamar terisi</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Laporan Aktif</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{activeReports}</div><p className="text-xs text-muted-foreground">Diajukan + sedang diproses</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Sedang Diproses</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{inProgress}</div><p className="text-xs text-muted-foreground">Membutuhkan tindak lanjut</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Maintenance Kamar</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{maintenanceRooms}</div><p className="text-xs text-muted-foreground">Kamar berstatus maintenance</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-sm"><Wrench className="h-4 w-4" /> Laporan Maintenance</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">Laporan tenant dan status penanganannya.</p>
          </div>
          <Select value={status} onValueChange={(value) => setStatus(value as MaintenanceStatus | 'all')}>
            <SelectTrigger className="w-48" aria-label="Filter status laporan"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="space-y-3">
          {visibleReports.length === 0 ? (
            <div className="rounded-md border border-dashed p-8 text-center">
              <p className="font-medium">{reports.length === 0 ? 'Belum ada laporan maintenance' : 'Tidak ada laporan pada filter ini'}</p>
              <p className="mt-1 text-sm text-muted-foreground">Laporan kendala dari tenant akan muncul di sini.</p>
            </div>
          ) : (
            visibleReports.slice(0, 10).map((report) => (
              <div key={report.id} className="rounded-lg border p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{report.title}</p>
                      <MaintenanceStatusBadge status={report.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">{roomLabel(report.room_id)} · {CATEGORY_LABEL[report.category]} · Prioritas {PRIORITY_LABEL[report.priority]}</p>
                    <p className="text-sm">{report.description}</p>
                    <p className="text-xs text-muted-foreground">Diajukan {formatDate(report.created_at)}</p>
                  </div>
                  <Select
                    value={report.status}
                    onValueChange={(value) => void handleStatusChange(report, value as MaintenanceStatus)}
                    disabled={busyId === report.id}
                  >
                    <SelectTrigger className="w-44" aria-label={'Status ' + report.title}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.filter((option): option is { value: MaintenanceStatus; label: string } => option.value !== 'all' && NEXT_STATUS_OPTIONS[report.status].includes(option.value)).map((option) => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
