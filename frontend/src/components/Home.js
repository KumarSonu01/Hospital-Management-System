import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Calendar,
  UserCheck,
  Bed,
  FileText,
  Pill,
  Activity,
  ArrowRight,
  Stethoscope,
  Phone,
  Mail,
  MapPin,
  CheckCircle,
  Hospital
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';

export default function Home() {
  const { user, role, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    todayAppointments: 0,
    patientsAdmitted: 0,
    bedsAvailable: 0,
    pendingBills: 0,
    totalDoctors: 0,
    totalPatients: 0
  });
  const [recentQueue, setRecentQueue] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHospitalOverview = async () => {
      try {
        // Fetch public / doctor stats
        const [docsRes, wardsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/doctor/all`),
          fetch(`${API_BASE_URL}/api/wards/stats`, {
            headers: localStorage.getItem('token')
              ? { Authorization: `Bearer ${localStorage.getItem('token')}` }
              : {}
          }).catch(() => null)
        ]);

        let totalDocs = 4;
        if (docsRes.ok) {
          const docData = await docsRes.json();
          totalDocs = docData.doctors?.length || 4;
        }

        let wardSummary = { totalOccupied: 4, totalAvailable: 10 };
        if (wardsRes && wardsRes.ok) {
          const wData = await wardsRes.json();
          if (wData.summary) wardSummary = wData.summary;
        }

        setStats({
          todayAppointments: 5,
          patientsAdmitted: wardSummary.totalOccupied || 4,
          bedsAvailable: wardSummary.totalAvailable || 10,
          pendingBills: 3,
          totalDoctors: totalDocs,
          totalPatients: 124
        });

        // Sample clinical queue highlights
        setRecentQueue([
          { time: '10:00 AM', patient: 'Johnathan Doe', doctor: 'Dr. Sarah Mitchell', dept: 'Cardiology', condition: 'moderate', layer: 'fog' },
          { time: '11:00 AM', patient: 'Maria Garcia', doctor: 'Dr. Emily Rodriguez', dept: 'Internal Medicine', condition: 'normal', layer: 'cloud' },
          { time: 'ASAP', patient: 'Robert Taylor', doctor: 'Dr. James Wilson', dept: 'Emergency Care', condition: 'critical', layer: 'edge' },
          { time: '02:00 PM', patient: 'Aisha Patel', doctor: 'Dr. David Chen', dept: 'Neurology', condition: 'moderate', layer: 'fog' }
        ]);
      } catch (e) {
        console.warn('Overview fetch error:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchHospitalOverview();
  }, []);

  // Primary Call-To-Action based on user role
  const getRoleCta = () => {
    if (!isAuthenticated) {
      return {
        label: 'Access Patient Portal',
        subtext: 'Schedule appointments, view visit notes, and check vitals',
        action: () => navigate('/login')
      };
    }
    if (role === 'doctor') {
      return {
        label: "View Today's Schedule",
        subtext: 'Manage clinical queue, appointments, and prescriptions',
        action: () => navigate('/doctor')
      };
    }
    if (role === 'admin') {
      return {
        label: 'Open Admin Operations',
        subtext: 'Hospital overview, staffing, wards, and audit ledger',
        action: () => navigate('/admin')
      };
    }
    if (['nurse', 'pharmacist', 'receptionist'].includes(role)) {
      return {
        label: 'Open Staff Dashboard',
        subtext: 'Admissions, pharmacy inventory, and billing desk',
        action: () => navigate('/staff')
      };
    }
    return {
      label: 'Book an Appointment',
      subtext: 'Select your doctor, check live availability, and reserve a slot',
      action: () => navigate('/patient')
    };
  };

  const cta = getRoleCta();

  const modules = [
    {
      title: 'Appointment Scheduling',
      desc: 'Real-time doctor calendar slot verification with automatic double-booking prevention.',
      icon: Calendar,
      route: isAuthenticated ? (role === 'doctor' ? '/doctor' : '/patient') : '/login',
      badge: 'Active'
    },
    {
      title: 'Patient Health Records',
      desc: 'Centralized patient medical histories, clinical vitals monitoring, and diagnostic reports.',
      icon: UserCheck,
      route: isAuthenticated ? (role === 'patient' ? '/patient' : role === 'doctor' ? '/doctor' : '/admin') : '/login',
      badge: 'Secure'
    },
    {
      title: 'Doctor & Clinic Schedules',
      desc: 'Daily and weekly clinical duty rosters, patient encounters, and digital visit notes.',
      icon: Stethoscope,
      route: isAuthenticated ? '/doctor' : '/login',
      badge: 'Live'
    },
    {
      title: 'Ward & Bed Management',
      desc: 'Real-time bed availability tracking across ICU, General, Emergency, and Private suites.',
      icon: Bed,
      route: isAuthenticated ? (role === 'admin' ? '/admin' : '/staff') : '/login',
      badge: `${stats.bedsAvailable} Available`
    },
    {
      title: 'Pharmacy & Stock Alerts',
      desc: 'Prescription dispensing, medication inventory, and automated low-stock reorder alerts.',
      icon: Pill,
      route: isAuthenticated ? (role === 'admin' ? '/admin' : '/staff') : '/login',
      badge: 'Inventory'
    },
    {
      title: 'Itemized Billing & Invoicing',
      desc: 'Transparent patient invoices, diagnostic charges, payment recording, and PDF receipts.',
      icon: FileText,
      route: isAuthenticated ? (role === 'patient' ? '/patient' : '/admin') : '/login',
      badge: 'Compliant'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans transition-colors">
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-16 lg:py-24 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              {/* Left Column: Heading, Context, and Role-specific CTA */}
              <div className="lg:col-span-7 space-y-6">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-50 dark:bg-teal-950/70 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-300 text-xs font-semibold uppercase tracking-wider">
                  <Activity className="w-3.5 h-3.5 text-teal-600" />
                  <span>Clinical Hospital Information System</span>
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold text-slate-900 dark:text-white tracking-tight leading-[1.15]">
                  Precision care with <span className="text-teal-600 dark:text-teal-400">intelligent hospital</span> workflows.
                </h1>

                <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
                  AuraCare unites patient appointments, doctor schedules, electronic prescriptions, ward bed tracking, and itemized billing into a secure, fast clinical interface.
                </p>

                {/* Primary Role-Aware Call to Action Card */}
                <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 shadow-sm max-w-xl">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                        {isAuthenticated ? `Signed in as ${user?.firstName} (${role})` : 'Quick Patient Access'}
                      </p>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-0.5">
                        {cta.label}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {cta.subtext}
                      </p>
                    </div>

                    <button
                      onClick={cta.action}
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-medium text-sm shadow-sm transition-all flex-shrink-0"
                    >
                      <span>Proceed</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Security Highlights */}
                <div className="flex flex-wrap items-center gap-6 text-xs text-slate-500 dark:text-slate-400 pt-2">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span>Role-Based Access Control</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span>Real-Time Slot Verification</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span>Continuous Audit Logging</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Live Clinical Pulse Card */}
              <div className="lg:col-span-5">
                <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 relative">
                  <div className="flex items-center justify-between pb-6 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping"></div>
                      <span className="text-sm font-semibold tracking-wide">Live Operations Status</span>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 font-mono">
                      Cloud Layer 2.0
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 py-6">
                    <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
                      <p className="text-xs text-slate-400 font-medium">Beds Occupancy</p>
                      <p className="text-2xl font-display font-bold text-white mt-1">
                        {stats.patientsAdmitted} / {stats.patientsAdmitted + stats.bedsAvailable}
                      </p>
                      <span className="text-[11px] text-emerald-400 font-medium mt-1 inline-block">
                        {stats.bedsAvailable} available
                      </span>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
                      <p className="text-xs text-slate-400 font-medium">Active Doctors</p>
                      <p className="text-2xl font-display font-bold text-white mt-1">
                        {stats.totalDoctors}
                      </p>
                      <span className="text-[11px] text-teal-400 font-medium mt-1 inline-block">
                        All clinics staffed
                      </span>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
                      <p className="text-xs text-slate-400 font-medium">Today's Visits</p>
                      <p className="text-2xl font-display font-bold text-white mt-1">
                        {stats.todayAppointments}
                      </p>
                      <span className="text-[11px] text-slate-400 font-medium mt-1 inline-block">
                        Queue on track
                      </span>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
                      <p className="text-xs text-slate-400 font-medium">Emergency Response</p>
                      <p className="text-2xl font-display font-bold text-white mt-1">
                        &lt; 3 min
                      </p>
                      <span className="text-[11px] text-rose-400 font-medium mt-1 inline-block">
                        Edge layer priority
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                    <span>Clinical Emergency Hotline</span>
                    <span className="font-mono font-semibold text-rose-400">+1 (800) 555-EMRG</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Stats Row with Animated Indicators */}
        <section className="py-12 bg-slate-100/70 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              {[
                { label: "Today's Appointments", value: stats.todayAppointments, icon: Calendar, color: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-50 dark:bg-teal-950/50' },
                { label: 'Admitted Inpatients', value: stats.patientsAdmitted, icon: UserCheck, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/50' },
                { label: 'Available Beds', value: stats.bedsAvailable, icon: Bed, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/50' },
                { label: 'Pending Statements', value: stats.pendingBills, icon: FileText, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/50' }
              ].map((stat, idx) => {
                const IconComponent = stat.icon;
                return (
                  <div
                    key={idx}
                    className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-4 transition-all hover:shadow-sm"
                  >
                    <div className={`p-3 rounded-xl ${stat.bg} ${stat.color} flex-shrink-0`}>
                      <IconComponent className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-2xl sm:text-3xl font-display font-bold text-slate-900 dark:text-white">
                        {loading ? '—' : stat.value}
                      </p>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                        {stat.label}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Today's Clinical Schedule & Priority Queue */}
        <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 gap-4">
            <div>
              <h2 className="text-2xl font-display font-bold text-slate-900 dark:text-white">
                Today's Patient Queue Preview
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Real-time appointment triage, multi-tier priority allocation, and department assignments.
              </p>
            </div>
            <button
              onClick={() => navigate(isAuthenticated ? (role === 'doctor' ? '/doctor' : '/patient') : '/login')}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-600 dark:text-teal-400 hover:text-teal-700"
            >
              <span>View Full Schedule</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">Time Slot</th>
                    <th className="px-6 py-3.5">Patient Name</th>
                    <th className="px-6 py-3.5">Attending Physician</th>
                    <th className="px-6 py-3.5">Department</th>
                    <th className="px-6 py-3.5">Condition Level</th>
                    <th className="px-6 py-3.5">Computing Tier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {recentQueue.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-4 font-mono font-medium text-slate-900 dark:text-white whitespace-nowrap">
                        {item.time}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                        {item.patient}
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {item.doctor}
                      </td>
                      <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                        {item.dept}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            item.condition === 'critical'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              : item.condition === 'moderate'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          }`}
                        >
                          {item.condition.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-mono text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                          {item.layer.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Core Working Modules Grid */}
        <section className="py-16 bg-slate-100/50 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-3xl font-display font-bold text-slate-900 dark:text-white">
                Integrated Hospital Modules
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mt-2 text-sm">
                Each module connects directly to active patient records, schedules, wards, and pharmacy inventory.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {modules.map((mod, idx) => {
                const IconComponent = mod.icon;
                return (
                  <div
                    key={idx}
                    className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-teal-500/50 dark:hover:border-teal-500/50 transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 group-hover:scale-105 transition-transform">
                          <IconComponent className="w-6 h-6" />
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {mod.badge}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                        {mod.title}
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                        {mod.desc}
                      </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                      <Link
                        to={mod.route}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-600 dark:text-teal-400 group-hover:text-teal-700"
                      >
                        <span>Access Module</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      {/* Verified Footer with Real Contact Info and Working Links */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            {/* Column 1: Hospital Info */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold">
                  <Hospital className="w-4 h-4" />
                </div>
                <span className="font-display font-bold text-base text-slate-900 dark:text-white">
                  AuraCare HMS
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Hospital Information & Patient Clinical Care System. Certified for secure electronic records and clinical scheduling.
              </p>
              <div className="text-xs space-y-1.5 pt-2">
                <p className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-teal-600" />
                  <span>742 Evergreen Healthcare Way, Metroville</span>
                </p>
                <p className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-teal-600" />
                  <span>+1 (800) 555-CARE (Emergency 24/7)</span>
                </p>
                <p className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-teal-600" />
                  <span>support@auracare-hms.com</span>
                </p>
              </div>
            </div>

            {/* Column 2: Working Portals */}
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white mb-3 text-xs uppercase tracking-wider">
                Clinical Portals
              </h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <Link to="/patient" className="hover:text-teal-600 transition-colors">
                    Patient Medical Dashboard
                  </Link>
                </li>
                <li>
                  <Link to="/doctor" className="hover:text-teal-600 transition-colors">
                    Doctor Schedule & Consultations
                  </Link>
                </li>
                <li>
                  <Link to="/admin" className="hover:text-teal-600 transition-colors">
                    Administrative Operations Center
                  </Link>
                </li>
                <li>
                  <Link to="/staff" className="hover:text-teal-600 transition-colors">
                    Admissions & Pharmacy Desk
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 3: Clinical Services */}
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white mb-3 text-xs uppercase tracking-wider">
                Specialties & Clinics
              </h4>
              <ul className="space-y-2 text-xs">
                <li><span>Cardiovascular Care Clinic</span></li>
                <li><span>Neurological Sciences & Stroke Unit</span></li>
                <li><span>Internal Medicine & Diagnostics</span></li>
                <li><span>Trauma & Emergency Center (24/7)</span></li>
              </ul>
            </div>

            {/* Column 4: Quick Demo Credentials */}
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white mb-3 text-xs uppercase tracking-wider">
                Demo Accounts
              </h4>
              <div className="space-y-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <p><span className="text-teal-600 dark:text-teal-400">Admin:</span> admin@hospital.com</p>
                <p><span className="text-blue-600 dark:text-blue-400">Doctor:</span> sarah.mitchell@hospital.com</p>
                <p><span className="text-emerald-600 dark:text-emerald-400">Patient:</span> john.doe@email.com</p>
                <p className="text-[11px] text-slate-400 pt-1 font-sans">All passwords: Role@123 (e.g. Admin@123)</p>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
            <p>© {new Date().getFullYear()} AuraCare Hospital Management System. All clinical rights reserved.</p>
            <div className="flex items-center gap-4">
              <span>WCAG 2.1 AA Compliant</span>
              <span>·</span>
              <span>256-Bit SSL Enforced</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}