import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Hospital, Eye, EyeOff, UserPlus, Shield, User, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { API_BASE_URL } from '../config';

export default function SignUp() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { success, error: toastError } = useToast();

  const [formData, setFormData] = useState({
    role: 'patient',
    securityCode: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phoneNumber: '',
    dateOfBirth: '',
    gender: '',
    bloodGroup: '',
    address: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Please provide a valid email format';
    }
    if (formData.role === 'admin' && !formData.securityCode.trim()) {
      newErrors.securityCode = 'Organization security code is required for administrator clearance';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Must be at least 6 characters';
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);

    try {
      const payload = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        role: formData.role,
        phoneNumber: formData.phoneNumber.trim(),
        dateOfBirth: formData.dateOfBirth || undefined,
        gender: formData.gender,
        bloodGroup: formData.bloodGroup,
        address: formData.address.trim()
      };

      if (formData.role === 'admin') {
        payload.securityCode = formData.securityCode.trim();
      }

      const response = await fetch(`${API_BASE_URL}/api/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        if (formData.role === 'admin') {
          success('Administrator account provisioned successfully! Logging you in...', 'Admin Clearance Granted');
          login(data.token, data.user);
          navigate('/admin');
        } else {
          success('Patient account registered successfully! Logging you in...', 'Welcome to AuraCare');
          login(data.token, data.user);
          navigate('/patient');
        }
      } else {
        toastError(data.error || 'Failed to create account');
        setErrors({ submit: data.error });
      }
    } catch {
      toastError('Network error connecting to hospital registry.');
      setErrors({ submit: 'Network connection failure' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg text-center">
        <Link to="/" className="inline-flex items-center gap-2 mb-4 group">
          <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-500/20 group-hover:scale-105 transition-transform">
            <Hospital className="w-6 h-6" />
          </div>
          <span className="font-display font-bold text-2xl text-slate-900 dark:text-white">
            Aura<span className="text-teal-600">Care</span>
          </span>
        </Link>
        <h2 className="text-2xl font-display font-bold text-slate-900 dark:text-white tracking-tight">
          {formData.role === 'admin' ? 'Administrator Provisioning' : 'Patient Registration'}
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          {formData.role === 'admin'
            ? 'Authorized registration for hospital administrators and department heads.'
            : 'Create your digital patient chart for hospital consultations, scheduling, and records.'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg px-4 sm:px-0">
        <div className="bg-white dark:bg-slate-900 py-8 px-6 sm:px-8 shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl">
          {/* Account Clearance Switcher */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-5">
            <button
              type="button"
              onClick={() => {
                setFormData((prev) => ({ ...prev, role: 'patient' }));
                setErrors((prev) => ({ ...prev, securityCode: undefined }));
              }}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                formData.role === 'patient'
                  ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Patient Account</span>
            </button>
            <button
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, role: 'admin' }))}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                formData.role === 'admin'
                  ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Administrator</span>
            </button>
          </div>

          {formData.role === 'admin' && (
            <div className="p-4 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60 mb-5 animate-fade-in">
              <div className="flex items-center gap-2 text-teal-800 dark:text-teal-300 font-semibold text-xs mb-1.5">
                <KeyRound className="w-4 h-4 text-teal-600" />
                <span>Organization Security Code Required</span>
              </div>
              <p className="text-[11px] text-teal-700/80 dark:text-teal-400/80 mb-2.5">
                Provisioning hospital administrative rights requires institutional clearance. Enter the security code provided by hospital governance.
              </p>
              <input
                name="securityCode"
                type="password"
                value={formData.securityCode}
                onChange={handleChange}
                placeholder="Enter Organization Security Code"
                className={`w-full px-3 py-2 rounded-lg border text-sm font-mono text-slate-900 dark:text-white bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/50 ${
                  errors.securityCode ? 'border-rose-400' : 'border-teal-300 dark:border-teal-700'
                }`}
                required={formData.role === 'admin'}
              />
              {errors.securityCode && <p className="text-xs text-rose-500 mt-1">{errors.securityCode}</p>}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  First Name *
                </label>
                <input
                  name="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="John"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/50 ${
                    errors.firstName ? 'border-rose-400' : 'border-slate-300 dark:border-slate-700'
                  }`}
                  required
                />
                {errors.firstName && <p className="text-xs text-rose-500 mt-1">{errors.firstName}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Last Name *
                </label>
                <input
                  name="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Doe"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/50 ${
                    errors.lastName ? 'border-rose-400' : 'border-slate-300 dark:border-slate-700'
                  }`}
                  required
                />
                {errors.lastName && <p className="text-xs text-rose-500 mt-1">{errors.lastName}</p>}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Email Address *
              </label>
              <input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="patient@email.com"
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/50 ${
                  errors.email ? 'border-rose-400' : 'border-slate-300 dark:border-slate-700'
                }`}
                required
              />
              {errors.email && <p className="text-xs text-rose-500 mt-1">{errors.email}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Phone Number
                </label>
                <input
                  name="phoneNumber"
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  placeholder="+1-555-0100"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Date of Birth
                </label>
                <input
                  name="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Gender
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Blood Group
                </label>
                <select
                  name="bloodGroup"
                  value={formData.bloodGroup}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                >
                  <option value="">Select Blood Group</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Residential Address
              </label>
              <input
                name="address"
                type="text"
                value={formData.address}
                onChange={handleChange}
                placeholder="Street address, City, Postal Code"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Password *
                </label>
                <div className="relative">
                  <input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Min. 6 chars"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/50 ${
                      errors.password ? 'border-rose-400' : 'border-slate-300 dark:border-slate-700'
                    }`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-rose-500 mt-1">{errors.password}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Confirm Password *
                </label>
                <input
                  name="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Re-type password"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/50 ${
                    errors.confirmPassword ? 'border-rose-400' : 'border-slate-300 dark:border-slate-700'
                  }`}
                  required
                />
                {errors.confirmPassword && (
                  <p className="text-xs text-rose-500 mt-1">{errors.confirmPassword}</p>
                )}
              </div>
            </div>

            {errors.submit && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
                {errors.submit}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 shadow-sm transition-all disabled:opacity-50 mt-4"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>{formData.role === 'admin' ? 'Verifying Clearance & Provisioning...' : 'Creating Patient Chart...'}</span>
                </>
              ) : formData.role === 'admin' ? (
                <>
                  <Shield className="w-4 h-4" />
                  <span>Provision Administrator Account</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Register Patient Account</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
            <span>Already have an account? </span>
            <Link to="/login" className="font-semibold text-teal-600 hover:underline">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}