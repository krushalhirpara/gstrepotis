import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

interface ProtectedRouteProps {
  children?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const token = localStorage.getItem('gst_token');
  const user = localStorage.getItem('gst_user');

  const isAuthenticated = Boolean(token || user);

  if (!isAuthenticated) {
    return <Navigate to="/sign-in" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

interface PublicOnlyRouteProps {
  children?: React.ReactNode;
}

export const PublicOnlyRoute: React.FC<PublicOnlyRouteProps> = ({ children }) => {
  const token = localStorage.getItem('gst_token');
  const user = localStorage.getItem('gst_user');

  const isAuthenticated = Boolean(token || user);

  if (isAuthenticated) {
    return <Navigate to="/welcome" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export const AdminProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const token = localStorage.getItem('gst_token');
  const userRaw = localStorage.getItem('gst_user');
  const isAdminAuthenticated = localStorage.getItem('gst_admin_authenticated') === 'true';

  const user = userRaw ? JSON.parse(userRaw) : null;
  const isAuthorized = Boolean(token && user && user.is_admin === 1 && isAdminAuthenticated);

  if (!isAuthorized) {
    return <Navigate to="/ceoadmin" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};
