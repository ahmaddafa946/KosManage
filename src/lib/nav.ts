import {
  LayoutDashboard, BedDouble, Users, Wallet, BarChart3,
  History, Wrench,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end: boolean;
}

// D8: owner sees 7 items (Laporan operasional vs Laporan Keuangan split).
export const OWNER_NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/rooms', label: 'Kamar', icon: BedDouble, end: false },
  { to: '/tenants', label: 'Penghuni', icon: Users, end: false },
  { to: '/payments', label: 'Pembayaran', icon: Wallet, end: false },
  { to: '/reports', label: 'Laporan', icon: BarChart3, end: false },
  { to: '/financial-reports', label: 'Laporan Keuangan', icon: Wallet, end: false },
];

// D8: tenant sees 6 items (Laporan Saya = maintenance reports, Riwayat = history).
export const TENANT_NAV: NavItem[] = [
  { to: '/tenant', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/tenant/room', label: 'Kamar Saya', icon: BedDouble, end: false },
  { to: '/tenant/payments', label: 'Pembayaran', icon: Wallet, end: false },
  { to: '/tenant/reports', label: 'Laporan Saya', icon: Wrench, end: false },
  { to: '/tenant/history', label: 'Riwayat', icon: History, end: false },
];
