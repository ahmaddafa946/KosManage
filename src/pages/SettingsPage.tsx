import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Moon, Sun } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { useProperty } from '@/hooks/useProperty';
import { updateProperty } from '@/services/properties';
import { propertySchema } from '@/schemas/property';
import { mapSupabaseError } from '@/lib/errors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useTheme } from '@/features/theme/ThemeContext';

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const { property, loading, setProperty } = useProperty();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (property) {
      setName(property.name);
      setAddress(property.address ?? '');
    }
  }, [property]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!property) return;
    const parsed = propertySchema.safeParse({ name, address: address || null });
    if (!parsed.success) {
      setMsg({ kind: 'err', text: parsed.error.issues[0]?.message ?? 'Input tidak valid.' });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const updated = await updateProperty(property.id, parsed.data);
      setProperty(updated);
      setMsg({ kind: 'ok', text: 'Data kos berhasil disimpan.' });
    } catch (err) {
      setMsg({ kind: 'err', text: mapSupabaseError(err) });
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    await signOut();
    navigate('/login', { replace: true });
  }

  if (loading) return <div className="space-y-2"><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div>;

  return (
    <div className="max-w-2xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Tampilan</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium">Mode gelap</p>
            <p className="text-xs text-muted-foreground">
              Gunakan tema gelap untuk tampilan yang lebih nyaman pada kondisi minim cahaya.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="shrink-0"
            aria-pressed={theme === 'dark'}
            onClick={toggleTheme}
          >
            {theme === 'dark' ? (
              <>
                <Sun className="h-4 w-4" aria-hidden="true" />
                Mode terang
              </>
            ) : (
              <>
                <Moon className="h-4 w-4" aria-hidden="true" />
                Mode gelap
              </>
            )}
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-sm">Profil Pemilik</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p><span className="text-muted-foreground">Email: </span><span className="font-medium">{user?.email ?? '-'}</span></p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Informasi Kos</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="pname">Nama Kos</Label>
              <Input id="pname" value={name} onChange={(e) => setName(e.target.value)} disabled={busy} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="paddr">Alamat</Label>
              <Input id="paddr" value={address} onChange={(e) => setAddress(e.target.value)} disabled={busy} />
            </div>
            {msg && (
              <p role={msg.kind === 'err' ? 'alert' : 'status'} className={msg.kind === 'err' ? 'rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive' : 'rounded-md bg-green-50 px-3 py-2 text-sm text-green-700'}>
                {msg.text}
              </p>
            )}
            <Button type="submit" disabled={busy}>{busy ? 'Menyimpan...' : 'Simpan'}</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Sesi</CardTitle></CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => void handleLogout()}>
            <LogOut className="h-4 w-4" /> Keluar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
