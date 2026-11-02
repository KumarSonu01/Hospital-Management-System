import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-sm font-medium text-slate-600 dark:text-slate-400">Verifying security session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    // If authenticated user tries to access a route of a different role, redirect to their home dashboard
    if (role === 'doctor') return <Navigate to="/doctor" replace />;
    if (role === 'admin') return <Navigate to="/admin" replace />;
    if (role === 'pharmacist' || role === 'receptionist' || role === 'nurse') return <Navigate to="/staff" replace />;
    return <Navigate to="/patient" replace />;
  }

  return children;
}
