import { Navigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireBuilder?: boolean;
}

export function ProtectedRoute({ children, requireBuilder = false }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!user) {
    // Redirect to auth page if not logged in
    return <Navigate to="/auth" replace />;
  }

  if (requireBuilder && user.role !== 'builder') {
    // Redirect to auth page if builder account is required
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}
