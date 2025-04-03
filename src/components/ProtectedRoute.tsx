import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isAdmin } = useAuth();

  // Check if user is authenticated AND is an admin
  if (!isAuthenticated || !isAdmin) {
    // Redirect them to the login page, but save the current location they were
    // trying to go to when they were redirected. This allows us to send them
    // along to that page after they login, which is a nicer user experience
    // than dropping them off on the home page.
    // Using replace to avoid adding the login route to history
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>; // Render the children if authenticated and admin
} 