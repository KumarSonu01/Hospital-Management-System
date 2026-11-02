import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Hospital, Shield, User, Stethoscope, Briefcase, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { API_BASE_URL } from '../config';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { success, error: toastError } = useToast();

  const [selectedRole, setSelectedRole] = useState('patient');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const roles = [
    { id: 'patient', label: 'Patient', icon: User },
    { id: 'doctor', label: 'Doctor', icon: Stethoscope },
    { id: 'admin', label: 'Admin', icon: Shield },
    { id: 'staff', label: 'Staff', icon: Briefcase }
  ];

  const demoAccounts = {
    patient: { email: 'john.doe@email.com', pass: 'Patient@123', label: 'Demo Patient' },
    doctor: { email: 'sarah.mitchell@hospital.com', pass: 'Doctor@123', label: 'Dr. Mitchell (Cardiology)' },
    admin: { email: 'admin@hospital.com', pass: 'Admin@123', label: 'Hospital Admin' },
    staff: { email: 'pharmacist@hospital.com', pass: 'Staff@123', label: 'Staff Pharmacist' }
  };

  const fillDemo = (r) => {
    setSelectedRole(r);
    const demo = demoAccounts[r];
    if (demo) {
      setEmail(demo.email);
      setPassword(demo.pass);
      setFieldErrors({});
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({});

    const errors = {};
    if (!email) errors.email = 'Email address is required';
    if (!password) errors.password = 'Password is required';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
          role: selectedRole === 'staff' ? undefined : selectedRole
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        login(data.token, data.user);
        success(`Welcome back, ${data.user.firstName}!`, 'Login Successful');

        const from = location.state?.from?.pathname;
        if (from) {
          navigate(from, { replace: true });
        } else if (data.role === 'admin') {
          navigate('/admin');
        } else if (data.role === 'doctor') {
          navigate('/doctor');
        } else if (['pharmacist', 'receptionist', 'nurse'].includes(data.role)) {
          navigate('/staff');
        } else {
          navigate('/patient');
        }
      } else {
        toastError(data.error || 'Authentication failed. Please verify credentials.');
        setFieldErrors({ submit: data.error || 'Invalid email or password' });
      }
    } catch (err) {
      toastError('Unable to connect to hospital server. Please try again.');
      setFieldErrors({ submit: 'Network connection error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center gap-2 mb-4 group">
          <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-500/20 group-hover:scale-105 transition-transform">
            <Hospital className="w-6 h-6" />
          </div>
          <span className="font-display font-bold text-2xl text-slate-900 dark:text-white">
            Aura<span className="text-teal-600">Care</span>
          </span>
        </Link>
        <h2 className="text-2xl font-display font-bold text-slate-900 dark:text-white tracking-tight">
          Clinical Portal Sign In
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Select your role to access hospital operations and medical records.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white dark:bg-slate-900 py-8 px-6 sm:px-8 shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl">
          {/* Role selector tabs */}
          <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-6">
            {roles.map((r) => {
              const IconComp = r.icon;
              const isActive = selectedRole === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedRole(r.id)}
                  className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <IconComp className="w-4 h-4 mb-1" />
                  <span>{r.label}</span>
                </button>
              );
            })}
          </div>

          {/* Quick Demo Pre-fill Bar */}
          <div className="mb-6 p-3 rounded-xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200/60 dark:border-teal-800/60">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-teal-900 dark:text-teal-300">Quick Demo Fill:</span>
              <button
                type="button"
                onClick={() => fillDemo(selectedRole)}
                className="font-medium text-teal-700 dark:text-teal-400 underline hover:text-teal-900"
              >
                Fill {demoAccounts[selectedRole]?.label}
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="doctor@hospital.com"
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-colors ${
                  fieldErrors.email ? 'border-rose-400 focus:border-rose-500' : 'border-slate-300 dark:border-slate-700'
                }`}
                autoComplete="email"
              />
              {fieldErrors.email && (
                <p className="mt-1 text-xs text-rose-500 font-medium">{fieldErrors.email}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Password
                </label>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-colors pr-10 ${
                    fieldErrors.password ? 'border-rose-400 focus:border-rose-500' : 'border-slate-300 dark:border-slate-700'
                  }`}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="mt-1 text-xs text-rose-500 font-medium">{fieldErrors.password}</p>
              )}
            </div>

            {fieldErrors.submit && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
                {fieldErrors.submit}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 shadow-sm transition-all disabled:opacity-50 mt-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In as {roles.find((r) => r.id === selectedRole)?.label}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
            <span>New patient seeking care? </span>
            <Link to="/signup" className="font-semibold text-teal-600 hover:underline">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}