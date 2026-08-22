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
