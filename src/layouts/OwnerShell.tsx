import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  ChevronsLeft, ChevronsRight, LogOut, Building2,
} from 'lucide-react';
import { OWNER_NAV } from '@/lib/nav';
import { cn } from '@/lib/utils';
import { useAuth } from '@/features/auth/AuthContext';
import { useProperty } from '@/hooks/useProperty';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';


export default function OwnerShell() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, signOut } = useAuth();
  const { property, loading } = useProperty();
  const navigate = useNavigate();

  async function handleLogout() {
    await signOut();
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex min-h-screen overflow-hidden bg-background/40 md:h-screen">
      <aside className={cn('glass-surface z-10 hidden flex-col border-r-0 transition-all md:flex', collapsed ? 'w-16' : 'w-60')}>
        <div className="flex h-16 items-center gap-3 border-b border-white/50 px-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-white/70"><Building2 className="h-5 w-5 text-primary" /></span>
          {!collapsed && <span className="truncate text-sm font-semibold tracking-tight">KosManage</span>}
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Navigasi utama">
          {OWNER_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive ? 'bg-white/60 text-primary shadow-sm ring-1 ring-white/70 dark:bg-white/10 dark:ring-white/10' : 'text-muted-foreground hover:bg-white/45 hover:text-foreground dark:hover:bg-white/5'
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
        <header className="glass-surface sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between border-x-0 border-t-0 px-3 sm:h-16 sm:px-6">
          <div className="min-w-0">
            {loading ? (
              <Skeleton className="h-5 w-40" />
            ) : (
              <h1 className="truncate text-sm font-semibold">{property?.name ?? 'KosManage'}</h1>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="max-w-[48%] justify-end" aria-label="Menu profil">
                <span className="truncate">{user?.email ?? 'Akun'}</span>
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
        <main className="min-h-0 flex-1 overflow-y-auto p-3 pb-24 sm:p-5 sm:pb-24 lg:p-7 lg:pb-7">
          <Outlet />
        </main>
      </div>
      <nav className="glass-surface fixed inset-x-2 bottom-2 z-50 flex gap-1 overflow-x-auto rounded-2xl p-1.5 md:hidden" aria-label="Navigasi mobile">
        {OWNER_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => cn(
              'flex min-w-[72px] flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[10px] font-medium transition-colors',
              isActive ? 'bg-white/70 text-primary shadow-sm ring-1 ring-white/70 dark:bg-white/10 dark:ring-white/10' : 'text-muted-foreground dark:hover:bg-white/5'
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span className="max-w-[84px] truncate">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
