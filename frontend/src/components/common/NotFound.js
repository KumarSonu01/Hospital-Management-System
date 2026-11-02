import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Hospital, ArrowLeft, Home } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function NotFound() {
  const navigate = useNavigate();
  const { role, isAuthenticated } = useAuth();

  const handleReturn = () => {
    if (!isAuthenticated) {
      navigate('/');
    } else if (role === 'admin') {
      navigate('/admin');
    } else if (role === 'doctor') {
      navigate('/doctor');
    } else if (['nurse', 'pharmacist', 'receptionist'].includes(role)) {
      navigate('/staff');
    } else {
      navigate('/patient');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-8 animate-fade-in">
        <div className="w-16 h-16 bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Hospital className="w-8 h-8" />
        </div>
        <span className="text-xs uppercase font-bold tracking-wider text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950 px-3 py-1 rounded-full">
          404 Not Found
        </span>
        <h1 className="text-2xl font-bold mt-4 text-slate-900 dark:text-white">Page Not Found</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          The clinical module or page you requested does not exist or has been relocated within the hospital records.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
          <button
            onClick={handleReturn}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium shadow-sm transition-colors"
          >
            <Home className="w-4 h-4" />
            Return to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
