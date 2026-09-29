import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { RoleGuard } from '@/features/auth/ProtectedRoute';
import * as AuthCtx from '@/features/auth/AuthContext';
import { OWNER_NAV, TENANT_NAV } from '@/lib/nav';

function mockAuth(user: object | null, role: unknown) {
  vi.spyOn(AuthCtx, 'useAuth').mockReturnValue({
    user, profile: role === undefined ? null : { role },
    loading: false, signOut: vi.fn(), signIn: vi.fn(), signUp: vi.fn(),
  } as unknown as ReturnType<typeof AuthCtx.useAuth>);
}

function App({ at, allow }: { at: string; allow: ('owner' | 'tenant')[] }) {
  return (
    <MemoryRouter initialEntries={[at]}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/" element={<RoleGuard allow={['owner']}><div>Owner Home</div></RoleGuard>} />
        <Route path="/tenant" element={<RoleGuard allow={['tenant']}><div>Tenant Home</div></RoleGuard>} />
        <Route path="/test" element={<RoleGuard allow={allow}><div>Guarded</div></RoleGuard>} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => vi.restoreAllMocks());

describe('RoleGuard matrix', () => {
  it('unauthenticated -> login', () => {
    mockAuth(null, undefined);
    render(<App at="/test" allow={['owner']} />);
    expect(screen.getByText('Login Page')).toBeTruthy();
  });
  it('owner opens owner route -> PASS', () => {
    mockAuth({ id: 'u1' }, 'owner');
    render(<App at="/test" allow={['owner']} />);
    expect(screen.getByText('Guarded')).toBeTruthy();
  });
  it('owner opens tenant route -> redirect to owner home (no loop)', () => {
    mockAuth({ id: 'u1' }, 'owner');
    render(<App at="/tenant" allow={['tenant']} />);
    expect(screen.getByText('Owner Home')).toBeTruthy();
  });
  it('tenant opens tenant route -> PASS', () => {
    mockAuth({ id: 'u2' }, 'tenant');
    render(<App at="/tenant" allow={['tenant']} />);
    expect(screen.getByText('Tenant Home')).toBeTruthy();
  });
  it('tenant opens owner route -> redirect to tenant home', () => {
    mockAuth({ id: 'u2' }, 'tenant');
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<RoleGuard allow={['owner']}><div>Owner Home</div></RoleGuard>} />
          <Route path="/tenant" element={<div>Tenant Home</div>} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText('Tenant Home')).toBeTruthy();
  });
  it('invalid/missing role -> fail closed to login', () => {
    mockAuth({ id: 'u3' }, 'admin');
    render(<App at="/test" allow={['owner', 'tenant']} />);
    expect(screen.getByText('Login Page')).toBeTruthy();
  });
  it('null profile -> fail closed to login', () => {
    mockAuth({ id: 'u4' }, undefined);
    render(<App at="/test" allow={['tenant']} />);
    expect(screen.getByText('Login Page')).toBeTruthy();
  });
});

describe('nav separation (D8)', () => {
  it('owner nav has 7 items incl. Laporan + Laporan Keuangan', () => {
    const labels = OWNER_NAV.map((i) => i.label);
    expect(labels).toEqual(['Dashboard', 'Kamar', 'Penghuni', 'Pembayaran', 'Laporan', 'Laporan Keuangan', 'Pengaturan']);
  });
  it('tenant nav has 6 items, no owner-only entries', () => {
    const labels = TENANT_NAV.map((i) => i.label);
    expect(labels).toEqual(['Dashboard', 'Kamar Saya', 'Pembayaran', 'Laporan Saya', 'Riwayat', 'Profil']);
    expect(labels).not.toContain('Penghuni');
    expect(labels).not.toContain('Laporan Keuangan');
  });
});
