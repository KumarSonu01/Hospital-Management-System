import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/common/Navbar';
import GlobalSearchModal from './components/common/GlobalSearchModal';
import ProtectedRoute from './components/common/ProtectedRoute';
import NotFound from './components/common/NotFound';
import Home from './components/Home';
import Login from './components/Login';
import SignUp from './components/SignUp';
import PatientDashboard from './components/Patient';
import DoctorDashboard from './components/Doctors';
import AdminDashboard from './components/Admins';
import StaffDashboard from './components/Staff';

function AppContent() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const navigate = useNavigate();
  const { role } = useAuth();

  const handleSelectSearchResult = (item) => {
    if (item.type === 'patient') {
      if (role === 'doctor') navigate('/doctor');
      else if (role === 'admin') navigate('/admin');
      else navigate('/patient');
    } else if (item.type === 'doctor') {
      if (role === 'patient') navigate('/patient');
      else navigate('/doctor');
    } else if (item.type === 'medication') {
      if (role === 'admin') navigate('/admin');
      else navigate('/staff');
    } else if (item.type === 'bed') {
      if (role === 'admin') navigate('/admin');
      else navigate('/staff');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors">
      <Navbar onOpenSearch={() => setIsSearchOpen(true)} />

      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />

          {/* Protected Clinical Portals */}
          <Route
            path="/patient"
            element={
              <ProtectedRoute allowedRoles={['patient', 'admin']}>
                <PatientDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor"
            element={
              <ProtectedRoute allowedRoles={['doctor', 'admin']}>
                <DoctorDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff"
            element={
              <ProtectedRoute allowedRoles={['pharmacist', 'receptionist', 'nurse', 'admin']}>
                <StaffDashboard />
              </ProtectedRoute>
            }
          />

          {/* 404 Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      {/* Global Spotlight Search Modal */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectResult={handleSelectSearchResult}
      />
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <AppContent />
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}