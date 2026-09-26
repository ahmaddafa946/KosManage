import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  LayoutDashboard, BedDouble, Users, Wallet, BarChart3, Settings,
  ChevronsLeft, ChevronsRight, LogOut, Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/features/auth/AuthContext';
import { useProperty } from '@/hooks/useProperty';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/rooms', label: 'Kamar', icon: BedDouble, end: false },
  { to: '/tenants', label: 'Penghuni', icon: Users, end: false },
  { to: '/payments', label: 'Pembayaran', icon: Wallet, end: false },
  { to: '/reports', label: 'Laporan', icon: BarChart3, end: false },
  { to: '/settings', label: 'Pengaturan', icon: Settings, end: false },
];

export default function AppShell() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, signOut } = useAuth();
  const { property, loading } = useProperty();
  const navigate = useNavigate();

  async function handleLogout() {
    await signOut();
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className={cn('flex flex-col border-r bg-card transition-all', collapsed ? 'w-16' : 'w-60')}>
        <div className="flex h-14 items-center gap-2 border-b px-4">
          <Building2 className="h-5 w-5 shrink-0 text-primary" />
          {!collapsed && <span className="truncate text-sm font-semibold">KosManage</span>}
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-2" aria-label="Navigasi utama">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )
              }
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t p-2">
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
        <header className="flex h-14 shrink-0 items-center justify-between border-b bg-card px-6">
          <div className="min-w-0">
            {loading ? (
              <Skeleton className="h-5 w-40" />
            ) : (
              <h1 className="truncate text-sm font-semibold">{property?.name ?? 'KosManage'}</h1>
            )}
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
        <main className="min-h-0 flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
