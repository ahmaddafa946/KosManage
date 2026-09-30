import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, LogIn, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { loginSchema } from '@/schemas/auth';
import { mapSupabaseError } from '@/lib/errors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      const errs: typeof fieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0]);
        if (key === 'email' || key === 'password') errs[key] = issue.message;
      }
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});
    setBusy(true);
    try {
      await signIn(parsed.data.email, parsed.data.password);
      navigate('/', { replace: true });
    } catch (err) {
      setFormError(mapSupabaseError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-[8%] top-[12%] h-48 w-48 rounded-full bg-cyan-300/30 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[8%] right-[8%] h-64 w-64 rounded-full bg-blue-400/25 blur-3xl"
      />

      <Card className="glass-strong relative w-full max-w-md overflow-hidden rounded-[1.75rem]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent"
        />
        <CardHeader className="space-y-5 p-7 pb-5 sm:p-8 sm:pb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-white/80 dark:ring-white/10">
              <Building2 className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">KosManage</p>
              <p className="text-xs text-muted-foreground">Manajemen kos yang lebih sederhana</p>
            </div>
          </div>

          <div className="space-y-2">
            <CardTitle className="text-2xl tracking-tight sm:text-[1.75rem]">Selamat datang kembali</CardTitle>
            <CardDescription className="text-sm leading-6">
              Masuk untuk melanjutkan ke dashboard pengelolaan kos Anda.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-7 pt-1 sm:p-8 sm:pt-1">
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="nama@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={busy}
              />
              {fieldErrors.email && <p className="text-xs text-destructive">{fieldErrors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="Masukkan password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={busy}
              />
              {fieldErrors.password && <p className="text-xs text-destructive">{fieldErrors.password}</p>}
            </div>

            {formError && (
              <p role="alert" className="rounded-xl border border-destructive/15 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                {formError}
              </p>
            )}

            <Button type="submit" className="h-11 w-full rounded-xl text-[0.95rem]" disabled={busy}>
              <LogIn className="h-4 w-4" aria-hidden="true" />
              {busy ? 'Memproses...' : 'Masuk'}
            </Button>

            <div className="flex items-start gap-2 rounded-xl border border-white/60 bg-white/35 px-3 py-2.5 dark:border-white/10 dark:bg-white/5 text-xs leading-5 text-muted-foreground backdrop-blur-xl">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <span>Sesi login dilindungi oleh autentikasi Supabase.</span>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
