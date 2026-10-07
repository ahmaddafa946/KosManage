import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Moon, Sun, LogOut, Settings as SettingsIcon } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { useTheme } from '@/features/theme/ThemeContext';
import { getMyProfile, updateMyProfile } from '@/services/profile';
import { tenantProfileUpdateSchema } from '@/schemas/profile';
import { mapSupabaseError } from '@/lib/errors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function TenantProfilePage() {
  const { user, refreshProfile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const profile = await getMyProfile();
        if (!mounted) return;
        if (!profile) {
          setError('Profil belum tersedia. Hubungi pemilik kos.');
          return;
        }
        setFullName(profile.full_name ?? '');
        setPhone(profile.phone ?? '');
      } catch (err) {
        if (mounted) setError(mapSupabaseError(err));
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = tenantProfileUpdateSchema.safeParse({
      full_name: fullName,
      phone: phone || null,
    });

    if (!parsed.success) {
      setMessage(null);
      setError(parsed.error.issues[0]?.message ?? 'Input tidak valid.');
      return;
    }

    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const updated = await updateMyProfile(parsed.data);
      setFullName(updated.full_name ?? '');
      setPhone(updated.phone ?? '');
      try {
        await refreshProfile();
      } catch {
        // Profile data is already saved; keep the local form authoritative if refresh fails.
      }
      setMessage('Profil berhasil disimpan.');
    } catch (err) {
      setError(mapSupabaseError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    await signOut();
    navigate('/login', { replace: true });
  }

  if (loading) {
    return (
      <div className="max-w-2xl space-y-3" aria-label="Memuat profil">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold">
          <SettingsIcon className="h-5 w-5" />
          Pengaturan
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Kelola informasi profil, tampilan, dan sesi Anda.
        </p>
      </div>

      {error && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          {message}
        </p>
      )}

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
        <CardHeader>
          <CardTitle className="text-sm">Informasi Pribadi</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="tenant-profile-name">Nama Lengkap</Label>
              <Input
                id="tenant-profile-name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                disabled={busy}
                autoComplete="name"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="tenant-profile-phone">Nomor Telepon</Label>
              <Input
                id="tenant-profile-phone"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                disabled={busy}
                autoComplete="tel"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="tenant-profile-email">Email Login</Label>
              <Input
                id="tenant-profile-email"
                type="email"
                value={user?.email ?? ''}
                readOnly
                disabled
              />
              <p className="text-xs text-muted-foreground">
                Email login dikelola oleh Supabase Auth dan tidak diubah dari profil ini.
              </p>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={busy}>
                {busy ? 'Menyimpan...' : 'Simpan Perubahan'}
              </Button>
            </div>
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