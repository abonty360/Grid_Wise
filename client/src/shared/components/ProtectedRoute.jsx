import { Navigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/useAuthStore';
import { PATHS } from '../../router/routes';

export function ProtectedRoute({ children, adminOnly = false }) {
  const location = useLocation();
  const { isAuthenticated, isAdmin } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to={PATHS.LOGIN} state={{ from: location }} replace />;
  }

  if (adminOnly && !isAdmin()) {
    toast.error('Admin authorization required.');
    return <Navigate to={PATHS.DASHBOARD} replace />;
  }

  return children;
}

export function PublicOnlyRoute({ children }) {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) {
    return <Navigate to={PATHS.DASHBOARD} replace />;
  }

  return children;
}
