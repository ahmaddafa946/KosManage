import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { getHomePath, isValidRole } from '@/lib/roles';
import type { UserRole } from '@/types/database';
import { Skeleton } from '@/components/ui/skeleton';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="w-full max-w-md space-y-3 p-6">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// Role-based route guard. Role comes from the trusted profile row
// (AuthContext -> profiles), never user_metadata or pathname.
// allow: roles permitted on this route branch.
// - unauthenticated -> /login
// - role missing/invalid -> fail closed to /login (no owner access)
// - wrong role -> deterministic redirect to own home (no loops:
//   home is always allowed for that role)
export function RoleGuard({ allow, children }: { allow: UserRole[]; children: ReactNode }) {
  const { user, profile, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="w-full max-w-md space-y-3 p-6">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  const role = profile?.role;
  if (!isValidRole(role)) return <Navigate to="/login" replace />;
  if (!allow.includes(role)) return <Navigate to={getHomePath(role)} replace />;
  return <>{children}</>;
}
