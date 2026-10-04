import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * Legacy profile completion redirect
 */
export const CompleteProfilePage: React.FC = () => {
  return <Navigate to="/dashboard" replace />;
};
