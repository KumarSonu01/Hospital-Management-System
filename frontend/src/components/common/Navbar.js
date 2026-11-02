import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Hospital,
  Search,
  Bell,
  Moon,
  Sun,
  LogOut,
  Menu,
  X,
  Shield,
  Stethoscope,
  HeartPulse,
  Briefcase
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { API_BASE_URL } from '../../config';

export default function Navbar({ onOpenSearch, onToggleMobileMenu, isMobileMenuOpen }) {
  const { user, role, logout, isAuthenticated } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchNotifs = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/api/notifications`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const list = await res.json();
          const items = Array.isArray(list) ? list : [];
          setNotifications(items);
          setUnreadCount(items.filter((n) => !n.read).length);
        }
      } catch (err) {
        // Silently catch background notifs error
      }
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const handleMarkAsRead = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_BASE_URL}/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (e) {
      console.error(e);
    }
  };

  const getRoleBadge = (r) => {
    switch (r) {
      case 'admin':
        return { label: 'Admin', icon: Shield, bg: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' };
      case 'doctor':
        return { label: 'Doctor', icon: Stethoscope, bg: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300' };
      case 'pharmacist':
      case 'receptionist':
      case 'nurse':
        return { label: r.charAt(0).toUpperCase() + r.slice(1), icon: Briefcase, bg: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' };
      default:
        return { label: 'Patient', icon: HeartPulse, bg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' };
    }
  };

  const badge = getRoleBadge(role);
  const BadgeIcon = badge.icon;

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Brand logo & Mobile Menu Trigger */}
          <div className="flex items-center gap-3">
            {isAuthenticated && onToggleMobileMenu && (
              <button
                onClick={onToggleMobileMenu}
                className="md:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Toggle navigation drawer"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            )}

            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-500/20 group-hover:scale-105 transition-transform">
                <Hospital className="w-5 h-5" />
              </div>
              <div>
                <span className="font-display font-bold text-lg text-slate-900 dark:text-white leading-none">
                  Aura<span className="text-teal-600 dark:text-teal-400">Care</span>
                </span>
                <span className="block text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                  Clinical HMS
                </span>
              </div>
            </Link>
          </div>

          {/* Middle: Global Search trigger */}
          {isAuthenticated && (
            <div className="hidden sm:flex flex-1 max-w-md mx-6">
              <button
                onClick={onOpenSearch}
                className="w-full flex items-center justify-between px-3.5 py-2 text-sm text-slate-400 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200/70 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl transition-all shadow-xs"
              >
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-slate-400" />
                  <span>Search records, doctors, beds...</span>
                </div>
                <kbd className="px-2 py-0.5 text-[11px] font-semibold text-slate-400 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded shadow-xs">
                  Ctrl K
                </kbd>
              </button>
            </div>
          )}

          {/* Right: Actions (Theme, Notifs, User Profile) */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            {isAuthenticated ? (
              <>
                {/* Search icon on small mobile */}
                <button
                  onClick={onOpenSearch}
                  className="sm:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  aria-label="Open global search"
                >
                  <Search className="w-4 h-4" />
                </button>

                {/* Notifications Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="relative p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    aria-label="Notifications"
                  >
                    <Bell className="w-4 h-4" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900"></span>
                    )}
                  </button>

                  {showNotifications && (
                    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden z-50 animate-slide-up">
                      <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">Clinical Notifications</span>
                        <span className="text-xs text-slate-500">{unreadCount} unread</span>
                      </div>
                      <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                        {notifications.length === 0 ? (
                          <div className="p-6 text-center text-xs text-slate-400">No recent notifications.</div>
                        ) : (
                          notifications.slice(0, 10).map((n) => (
                            <div
                              key={n._id}
                              onClick={() => !n.read && handleMarkAsRead(n._id)}
                              className={`p-3 text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors ${
                                !n.read ? 'bg-teal-50/50 dark:bg-teal-950/20' : ''
                              }`}
                            >
                              <div className="flex items-center justify-between font-medium text-slate-900 dark:text-white">
                                <span>{n.title}</span>
                                <span className="text-[10px] text-slate-400">{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                              <p className="mt-1 text-slate-600 dark:text-slate-300 leading-snug">{n.message}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Role and User Profile */}
                <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
                  <div className="hidden sm:block text-right">
                    <p className="text-xs font-semibold text-slate-900 dark:text-white leading-tight">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mt-0.5 ${badge.bg}`}>
                      <BadgeIcon className="w-2.5 h-2.5" />
                      {badge.label}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      logout();
                      navigate('/');
                    }}
                    className="p-2 rounded-xl text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3.5 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="px-4 py-1.5 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs transition-colors"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
