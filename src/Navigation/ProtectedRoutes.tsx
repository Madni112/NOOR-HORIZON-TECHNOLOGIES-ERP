import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../Context/Auth';

interface ProtectedRouteProps {
  allowedRoles: string[];
  userRole: string;
  element: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  allowedRoles,
  userRole,
  element,
}) => {
  const { isAuthenticated, tenantId } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to={tenantId ? `/tenant=${tenantId}/signin` : '/'} replace />;
  }

  if (!allowedRoles.includes(userRole)) {
    return <Navigate to={tenantId ? `/tenant=${tenantId}/signin` : '/'} replace />;
  }

  return <>{element}</>;
};

export default ProtectedRoute;
