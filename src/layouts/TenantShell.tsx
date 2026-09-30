import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  ChevronsLeft, ChevronsRight, LogOut, Building2,
} from 'lucide-react';
import { TENANT_NAV } from '@/lib/nav';
import { cn } from '@/lib/utils';
import { useAuth } from '@/features/auth/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function TenantShell() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await signOut();
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background/40">
      <aside className={cn('glass-surface z-10 flex flex-col border-r-0 transition-all', collapsed ? 'w-16' : 'w-60')}>
        <div className="flex h-16 items-center gap-3 border-b border-white/50 px-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-white/70"><Building2 className="h-5 w-5 text-primary" /></span>
          {!collapsed && <span className="truncate text-sm font-semibold tracking-tight">KosManage</span>}
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Navigasi penyewa">
          {TENANT_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive ? 'bg-white/60 text-primary shadow-sm ring-1 ring-white/70' : 'text-muted-foreground hover:bg-white/45 hover:text-foreground'
                )
              }
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-white/50 p-3">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
          >
            {collapsed ? <ChevronsRight className="h-4 w-4" /> : <><ChevronsLeft className="h-4 w-4" /> Ciutkan</>}
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="glass-surface sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between border-x-0 border-t-0 px-6">
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold">Kos Saya</h1>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" aria-label="Menu profil">
                {user?.email ?? 'Akun'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="max-w-56 truncate">{user?.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" /> Keluar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto p-6 lg:p-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
