import { Routes, Route, Navigate } from 'react-router-dom';
import OwnerShell from './layouts/OwnerShell';
import TenantShell from './layouts/TenantShell';
import { ProtectedRoute, RoleGuard } from './features/auth/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import RoomsPage from './pages/RoomsPage';
import TenantsPage from './pages/TenantsPage';
import PaymentsPage from './pages/PaymentsPage';
import ReportsPage from './pages/ReportsPage';
import FinancialReportsPage from './pages/FinancialReportsPage';
import SettingsPage from './pages/SettingsPage';
import TenantDashboardPage from './pages/tenant/TenantDashboardPage';
import TenantRoomPage from './pages/tenant/TenantRoomPage';
import TenantPaymentsPage from './pages/tenant/TenantPaymentsPage';
import TenantReportsPage from './pages/tenant/TenantReportsPage';
import TenantHistoryPage from './pages/tenant/TenantHistoryPage';
import TenantProfilePage from './pages/tenant/TenantProfilePage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <RoleGuard allow={['owner']}>
              <OwnerShell />
            </RoleGuard>
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="rooms" element={<RoomsPage />} />
        <Route path="tenants" element={<TenantsPage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="financial-reports" element={<FinancialReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route
        path="/tenant"
        element={
          <ProtectedRoute>
            <RoleGuard allow={['tenant']}>
              <TenantShell />
            </RoleGuard>
          </ProtectedRoute>
        }
      >
        <Route index element={<TenantDashboardPage />} />
        <Route path="room" element={<TenantRoomPage />} />
        <Route path="payments" element={<TenantPaymentsPage />} />
        <Route path="reports" element={<TenantReportsPage />} />
        <Route path="history" element={<TenantHistoryPage />} />
        <Route path="profile" element={<TenantProfilePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
