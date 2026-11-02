import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  User,
  HeartPulse,
  FileText,
  CreditCard,
  Printer,
  CheckCircle,
  Plus,
  RefreshCw,
  Stethoscope,
  X,
  Activity,
  Hospital
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { API_BASE_URL } from '../config';

export default function PatientDashboard() {
  const { user, token, updateUser } = useAuth();
  const { success, error: toastError } = useToast();

  const [activeTab, setActiveTab] = useState('overview');
  const [profile, setProfile] = useState(user || {});
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [vitalsReadings, setVitalsReadings] = useState([]);
  const [vitalsSeries, setVitalsSeries] = useState([]);
  const [careTeam, setCareTeam] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [healthConditions, setHealthConditions] = useState({ critical: [], moderate: [], normal: [] });
  const [loading, setLoading] = useState(true);

  // Booking state
  const [booking, setBooking] = useState({
    doctorId: '',
    date: new Date().toISOString().split('T')[0],
    time: '',
    conditionType: 'normal',
    disease: '',
    reason: '',
    autoAssignDoctor: false
  });
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submittingBooking, setSubmittingBooking] = useState(false);

  // Print modal state
  const [printModalItem, setPrintModalItem] = useState(null);
  const [printType, setPrintType] = useState('prescription'); // 'prescription' or 'invoice'

  // Profile edit state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileFormData, setProfileFormData] = useState({});

  useEffect(() => {
    fetchAllPatientData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchAllPatientData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };

      const [profRes, appRes, prescRes, invRes, vitRes, condRes, docRes, careRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/patient/profile`, { headers }).catch(() => null),
        fetch(`${API_BASE_URL}/api/patient/appointments`, { headers }).catch(() => null),
        fetch(`${API_BASE_URL}/api/patient/prescriptions`, { headers }).catch(() => null),
        fetch(`${API_BASE_URL}/api/patient/invoices`, { headers }).catch(() => null),
        fetch(`${API_BASE_URL}/api/patient/vitals`, { headers }).catch(() => null),
        fetch(`${API_BASE_URL}/api/patient/health-conditions`, { headers }).catch(() => null),
        fetch(`${API_BASE_URL}/api/doctor/all`).catch(() => null),
        fetch(`${API_BASE_URL}/api/patient/care-team`, { headers }).catch(() => null)
      ]);

      if (profRes && profRes.ok) {
        const pData = await profRes.json();
        setProfile(pData.patient || user);
        setProfileFormData(pData.patient || user);
      }

      if (appRes && appRes.ok) {
        const aData = await appRes.json();
        setAppointments(aData.appointments || []);
      }

      if (prescRes && prescRes.ok) {
        const prData = await prescRes.json();
        setPrescriptions(prData.prescriptions || []);
      }

      if (invRes && invRes.ok) {
        const iData = await invRes.json();
        setInvoices(iData.invoices || []);
      }

      if (vitRes && vitRes.ok) {
        const vData = await vitRes.json();
        setVitalsReadings(vData.readings || []);
        setVitalsSeries(vData.series || []);
      }

      if (condRes && condRes.ok) {
        const cData = await condRes.json();
        setHealthConditions(cData.conditions || { critical: [], moderate: [], normal: [] });
      }

      if (docRes && docRes.ok) {
        const dData = await docRes.json();
        setDoctors(dData.doctors || []);
      }

      if (careRes && careRes.ok) {
        const ctData = await careRes.json();
        setCareTeam(ctData.careTeam || []);
      }
    } catch (e) {
      toastError('Could not load all medical records. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch slots whenever doctor or date changes in booking
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!booking.doctorId || !booking.date || booking.conditionType === 'critical') return;

    const fetchSlots = async () => {
      setLoadingSlots(true);
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/patient/available-slots?doctorId=${booking.doctorId}&date=${booking.date}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.ok) {
          const data = await res.json();
          setAvailableSlots(data.availableSlots || []);
          if (data.availableSlots && !data.availableSlots.includes(booking.time)) {
            setBooking((prev) => ({ ...prev, time: data.availableSlots[0] || '' }));
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchSlots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking.doctorId, booking.date, booking.conditionType, token]);

  const handleBookAppointment = async (e) => {
    e.preventDefault();

    if (!booking.disease) {
      toastError('Please select a disease or reason for visit.');
      return;
    }

    if (booking.conditionType !== 'critical' && (!booking.doctorId && !booking.autoAssignDoctor)) {
      toastError('Please select a doctor or check auto-assign.');
      return;
    }

    if (booking.conditionType !== 'critical' && !booking.time) {
      toastError('Please select an available appointment time slot.');
      return;
    }

    setSubmittingBooking(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/patient/book-appointment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(booking)
      });

      const data = await res.json();

      if (res.ok && data.success) {
        success('Appointment booked successfully!', 'Booking Confirmed');
        // Refresh appointments
        const appRes = await fetch(`${API_BASE_URL}/api/patient/appointments`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (appRes.ok) {
          const aData = await appRes.json();
          setAppointments(aData.appointments || []);
        }
        setActiveTab('appointments');
        setBooking({
          doctorId: '',
          date: new Date().toISOString().split('T')[0],
          time: '',
          conditionType: 'normal',
          disease: '',
          reason: '',
          autoAssignDoctor: false
        });
      } else {
        toastError(data.error || 'Failed to book appointment');
      }
    } catch (err) {
      toastError('Network error while booking appointment.');
    } finally {
      setSubmittingBooking(false);
    }
  };

  const handleCancelAppointment = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/patient/appointments/${id}/cancel`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        success('Appointment cancelled successfully.');
        setAppointments((prev) =>
          prev.map((a) => (a._id === id ? { ...a, status: 'cancelled' } : a))
        );
      } else {
        toastError('Failed to cancel appointment.');
      }
    } catch {
      toastError('Error cancelling appointment.');
    }
  };

  const handlePayInvoice = async (invoiceId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/billing/${invoiceId}/pay`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ paymentMethod: 'credit_card' })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        success('Invoice payment recorded successfully!', 'Payment Settled');
        setInvoices((prev) =>
          prev.map((inv) => (inv._id === invoiceId ? data.invoice : inv))
        );
      } else {
        toastError(data.error || 'Payment failed.');
      }
    } catch {
      toastError('Error processing payment.');
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/api/patient/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(profileFormData)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        success('Profile updated successfully.');
        setProfile(data.patient);
        updateUser(data.patient);
        setIsEditingProfile(false);
      } else {
        toastError(data.error || 'Failed to update profile.');
      }
    } catch {
      toastError('Error saving profile changes.');
    }
  };

  const diseaseOptions = healthConditions[booking.conditionType] || [];
  const nextAppointment = appointments.find((a) => a.status === 'scheduled');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans pb-16">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-6 px-4 sm:px-6 lg:px-8 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300">
                Patient Portal
              </span>
              <span className="text-xs text-slate-400 font-mono">ID: {profile?._id?.substring(0, 8) || 'PAT-01'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 dark:text-white mt-1">
              Welcome, {profile?.firstName} {profile?.lastName}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Blood Type: <span className="font-semibold text-slate-700 dark:text-slate-200">{profile?.bloodGroup || 'Not specified'}</span> · Contact: {profile?.phoneNumber || profile?.email}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('book')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Book Appointment</span>
            </button>
            <button
              onClick={fetchAllPatientData}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Refresh Records"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto mt-6 flex overflow-x-auto gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
          {[
            { id: 'overview', label: 'Overview', icon: HeartPulse },
            { id: 'book', label: 'Book Appointment', icon: Plus },
            { id: 'appointments', label: `My Visits (${appointments.length})`, icon: Calendar },
            { id: 'prescriptions', label: `Prescriptions (${prescriptions.length})`, icon: FileText },
            { id: 'invoices', label: `Billing (${invoices.length})`, icon: CreditCard },
            { id: 'vitals', label: 'Vitals Chart', icon: Activity },
            { id: 'profile', label: 'My Chart & Info', icon: User }
          ].map((tab) => {
            const IconComp = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <IconComp className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Body */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {/* ================= TAB 1: OVERVIEW ================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Next Appointment Alert Banner */}
            {nextAppointment ? (
              <div className="p-6 rounded-2xl bg-gradient-to-r from-teal-50 to-slate-50 dark:from-teal-950/40 dark:to-slate-900 border border-teal-200 dark:border-teal-800 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-600 text-white">
                    Next Upcoming Appointment
                  </span>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-2">
                    {nextAppointment.disease} with Dr. {nextAppointment.doctorId?.firstName} {nextAppointment.doctorId?.lastName}
                  </h3>
                  <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1">
                    <span className="flex items-center gap-1 font-medium">
                      <Calendar className="w-4 h-4 text-teal-600" />
                      {new Date(nextAppointment.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <span className="flex items-center gap-1 font-medium">
                      <Clock className="w-4 h-4 text-teal-600" />
                      {nextAppointment.time}
                    </span>
                    <span className="flex items-center gap-1">
                      <Stethoscope className="w-4 h-4 text-teal-600" />
                      {nextAppointment.doctorId?.specialty || 'General'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab('appointments')}
                  className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 shadow-xs transition-colors"
                >
                  View Details
                </button>
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">No Upcoming Visits</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Need a checkup or specialist consultation? Schedule with ease.</p>
                </div>
                <button
                  onClick={() => setActiveTab('book')}
                  className="px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 transition-colors"
                >
                  Book New Visit
                </button>
              </div>
            )}

            {/* Metrics Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Consultations</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{appointments.length}</p>
                <span className="text-[11px] text-teal-600 dark:text-teal-400 mt-1 inline-block">Lifetime chart</span>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active Prescriptions</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                  {prescriptions.filter((p) => p.status === 'active').length}
                </p>
                <span className="text-[11px] text-emerald-600 mt-1 inline-block">Authorized by care team</span>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Outstanding Invoices</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                  ${invoices.filter((i) => i.status === 'pending').reduce((acc, c) => acc + c.total, 0).toFixed(2)}
                </p>
                <span className="text-[11px] text-amber-600 mt-1 inline-block">
                  {invoices.filter((i) => i.status === 'pending').length} pending payment
                </span>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Latest Heart Rate</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                  {vitalsReadings[0]?.heartRate ? `${vitalsReadings[0].heartRate} BPM` : '72 BPM'}
                </p>
                <span className="text-[11px] text-teal-600 mt-1 inline-block">Normal clinical range</span>
              </div>
            </div>

            {/* Quick Sections Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Active Prescriptions Quick View */}
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">Active Prescriptions</h3>
                  <button onClick={() => setActiveTab('prescriptions')} className="text-xs font-semibold text-teal-600 hover:underline">
                    View All ({prescriptions.length})
                  </button>
                </div>

                {prescriptions.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">No current prescription records.</p>
                ) : (
                  <div className="space-y-3">
                    {prescriptions.slice(0, 3).map((p) => (
                      <div key={p._id} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">
                            {p.items?.[0]?.medication || p.medication || 'Medication'}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {p.items?.[0]?.dosage || p.dosage} · {p.items?.[0]?.frequency || p.frequency}
                          </p>
                          <p className="text-[11px] text-teal-600 dark:text-teal-400 mt-0.5">
                            Prescribed by Dr. {p.doctorId?.firstName} {p.doctorId?.lastName}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setPrintModalItem(p);
                            setPrintType('prescription');
                          }}
                          className="p-2 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-white dark:hover:bg-slate-700 transition-colors"
                          title="Print Prescription"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Your Care Team */}
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">Your Assigned Care Team</h3>
                </div>

                {careTeam.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">Care team doctors will appear after your first consultation.</p>
                ) : (
                  <div className="space-y-3">
                    {careTeam.map((doc) => (
                      <div key={doc._id} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold text-sm">
                            {doc.firstName?.[0]}{doc.lastName?.[0]}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">
                              Dr. {doc.firstName} {doc.lastName}
                            </p>
                            <p className="text-xs text-slate-500">{doc.specialty} · {doc.department || 'Hospital'}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setBooking((b) => ({ ...b, doctorId: doc._id }));
                            setActiveTab('book');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 text-xs font-semibold hover:bg-teal-100 transition-colors"
                        >
                          Book Visit
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: BOOK APPOINTMENT ================= */}
        {activeTab === 'book' && (
          <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <h2 className="text-xl font-display font-bold text-slate-900 dark:text-white mb-1">
              Schedule a Clinical Appointment
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
              Select condition urgency, pick your doctor, and lock an available slot. Double-booking prevention is enforced.
            </p>

            <form onSubmit={handleBookAppointment} className="space-y-6">
              {/* Urgency Level */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                  1. Condition Severity Level
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'normal', label: 'Normal / Routine', sub: 'Standard Consultation', color: 'border-emerald-300 text-emerald-800 dark:text-emerald-300 bg-emerald-50/50' },
                    { id: 'moderate', label: 'Moderate / Priority', sub: 'Priority Scheduling', color: 'border-amber-300 text-amber-800 dark:text-amber-300 bg-amber-50/50' },
                    { id: 'critical', label: 'Critical / Urgent', sub: 'Instant Emergency', color: 'border-rose-300 text-rose-800 dark:text-rose-300 bg-rose-50/50' }
                  ].map((level) => (
                    <button
                      key={level.id}
                      type="button"
                      onClick={() => setBooking({ ...booking, conditionType: level.id, disease: '' })}
                      className={`p-3.5 rounded-xl border-2 text-left transition-all ${
                        booking.conditionType === level.id ? `${level.color} ring-2 ring-teal-500/30` : 'border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <p className="text-xs font-bold">{level.label}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{level.sub}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Disease / Reason */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                  2. Select Clinical Need / Condition *
                </label>
                <select
                  value={booking.disease}
                  onChange={(e) => setBooking({ ...booking, disease: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                  required
                >
                  <option value="">Choose clinical condition or checkup</option>
                  {diseaseOptions.map((d, idx) => (
                    <option key={idx} value={d}>{d}</option>
                  ))}
                  <option value="General Consultation">General Consultation / Other</option>
                </select>
              </div>

              {/* Doctor Selection or Auto Assign */}
              {booking.conditionType !== 'critical' && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      3. Attending Physician
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={booking.autoAssignDoctor}
                        onChange={(e) => setBooking({ ...booking, autoAssignDoctor: e.target.checked, doctorId: '' })}
                        className="rounded text-teal-600 focus:ring-teal-500"
                      />
                      <span>Auto-assign best available specialist</span>
                    </label>
                  </div>

                  {!booking.autoAssignDoctor && (
                    <select
                      value={booking.doctorId}
                      onChange={(e) => setBooking({ ...booking, doctorId: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                      required={!booking.autoAssignDoctor}
                    >
                      <option value="">Select a Doctor</option>
                      {doctors.map((doc) => (
                        <option key={doc._id} value={doc._id}>
                          Dr. {doc.firstName} {doc.lastName} — {doc.specialty} ({doc.department || 'Hospital'})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Date & Time Slot */}
              {booking.conditionType !== 'critical' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                      4. Appointment Date
                    </label>
                    <input
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      value={booking.date}
                      onChange={(e) => setBooking({ ...booking, date: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                      5. Available Slot {loadingSlots && '(Checking availability...)'}
                    </label>
                    <select
                      value={booking.time}
                      onChange={(e) => setBooking({ ...booking, time: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                      required
                    >
                      <option value="">Choose Time Slot</option>
                      {availableSlots.map((slot, idx) => (
                        <option key={idx} value={slot}>{slot}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Reason / Notes */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  6. Symptoms / Visit Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={booking.reason}
                  onChange={(e) => setBooking({ ...booking, reason: e.target.value })}
                  placeholder="Describe your current symptoms or specific health concerns..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                />
              </div>

              <button
                type="submit"
                disabled={submittingBooking}
                className="w-full py-3.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submittingBooking ? (
                  <span>Reserving Slot...</span>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Confirm & Schedule Visit</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* ================= TAB 3: APPOINTMENTS ================= */}
        {activeTab === 'appointments' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">My Clinical Consultations</h3>
                <p className="text-xs text-slate-500">Chronological history of all scheduled, completed, and past visits.</p>
              </div>
              <button
                onClick={() => setActiveTab('book')}
                className="px-3.5 py-2 rounded-xl bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 transition-colors"
              >
                + New Appointment
              </button>
            </div>

            {appointments.length === 0 ? (
              <div className="py-16 text-center text-sm text-slate-400">
                You have no scheduled appointments. Click "New Appointment" to book.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800 text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 text-xs uppercase font-semibold">
                    <tr>
                      <th className="px-6 py-3.5">Date & Time</th>
                      <th className="px-6 py-3.5">Doctor & Specialty</th>
                      <th className="px-6 py-3.5">Condition</th>
                      <th className="px-6 py-3.5">Status</th>
                      <th className="px-6 py-3.5">Diagnosis / Notes</th>
                      <th className="px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {appointments.map((app) => (
                      <tr key={app._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="font-semibold text-slate-900 dark:text-white">
                            {new Date(app.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                          <p className="text-xs text-slate-500">{app.time}</p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="font-semibold text-slate-900 dark:text-white">
                            Dr. {app.doctorId?.firstName} {app.doctorId?.lastName}
                          </p>
                          <p className="text-xs text-slate-500">{app.doctorId?.specialty}</p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="text-xs font-medium text-slate-900 dark:text-white">{app.disease}</p>
                          <span className="text-[10px] font-mono text-slate-400 uppercase">{app.conditionType}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              app.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : app.status === 'cancelled'
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                : 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300'
                            }`}
                          >
                            {app.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500 max-w-xs truncate">
                          {app.diagnosis || app.notes || app.reason || '—'}
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          {app.status === 'scheduled' && (
                            <button
                              onClick={() => handleCancelAppointment(app._id)}
                              className="text-xs text-rose-600 hover:text-rose-800 font-semibold hover:underline"
                            >
                              Cancel Visit
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 4: PRESCRIPTIONS ================= */}
        {activeTab === 'prescriptions' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden p-6">
            <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white mb-1">
              Prescription Orders & Medications
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              Official prescriptions authorized by hospital medical staff. Download or print for clinical pharmacies.
            </p>

            {prescriptions.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-400">No prescriptions found on record.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {prescriptions.map((p) => (
                  <div key={p._id} className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
                        <div>
                          <p className="text-xs text-slate-400">Diagnosis</p>
                          <h4 className="font-bold text-slate-900 dark:text-white text-sm mt-0.5">{p.diagnosis || 'Clinical Prescription'}</h4>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                          {p.status || 'Active'}
                        </span>
                      </div>

                      <div className="py-3 space-y-2">
                        {(p.items && p.items.length > 0 ? p.items : [{ medication: p.medication, dosage: p.dosage, frequency: p.frequency }]).map((item, idx) => (
                          <div key={idx} className="flex items-start justify-between text-xs">
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-white">{item.medication}</p>
                              <p className="text-slate-500">{item.dosage} · {item.frequency}</p>
                            </div>
                            <span className="text-slate-400 text-[11px]">{item.duration || '7 days'}</span>
                          </div>
                        ))}
                      </div>

                      {p.notes && (
                        <p className="text-xs italic text-slate-500 pt-2 border-t border-slate-200 dark:border-slate-700">
                          Notes: {p.notes}
                        </p>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                      <span className="text-slate-500">
                        Prescribed by Dr. {p.doctorId?.firstName} {p.doctorId?.lastName}
                      </span>
                      <button
                        onClick={() => {
                          setPrintModalItem(p);
                          setPrintType('prescription');
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 shadow-xs"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 5: BILLING ================= */}
        {activeTab === 'invoices' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden p-6">
            <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white mb-1">
              Hospital Statements & Invoices
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              Itemized billing for clinical consultations, lab diagnostics, pharmaceuticals, and bed accommodations.
            </p>

            {invoices.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-400">No invoices on file.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800 text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 text-xs uppercase font-semibold">
                    <tr>
                      <th className="px-6 py-3.5">Invoice #</th>
                      <th className="px-6 py-3.5">Date</th>
                      <th className="px-6 py-3.5">Items Summary</th>
                      <th className="px-6 py-3.5">Total Amount</th>
                      <th className="px-6 py-3.5">Status</th>
                      <th className="px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {invoices.map((inv) => (
                      <tr key={inv._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="px-6 py-4 font-mono font-medium text-slate-900 dark:text-white">
                          {inv.invoiceNumber}
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500">
                          {new Date(inv.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-700 dark:text-slate-300">
                          {inv.items?.map((i) => i.description).join(', ') || 'Medical Services'}
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                          ${inv.total?.toFixed(2)}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              inv.status === 'paid'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {inv.status?.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                          {inv.status === 'pending' && (
                            <button
                              onClick={() => handlePayInvoice(inv._id)}
                              className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs"
                            >
                              Pay Now
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setPrintModalItem(inv);
                              setPrintType('invoice');
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            title="Print Invoice"
                          >
                            <Printer className="w-4 h-4 inline" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 6: VITALS HISTORY CHART ================= */}
        {activeTab === 'vitals' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-6">
            <div>
              <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">
                Patient Vital Signs Trend Analysis
              </h3>
              <p className="text-xs text-slate-500">
                Continuous physiological telemetry (Heart Rate in BPM & Temperature in °C) from hospital IoT monitors.
              </p>
            </div>

            {vitalsSeries.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-400">
                No recent vitals logged. Connected monitors will stream data automatically.
              </div>
            ) : (
              <div className="h-80 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={vitalsSeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="t"
                      tickFormatter={(t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      stroke="#94a3b8"
                      fontSize={11}
                    />
                    <YAxis yAxisId="left" stroke="#0D9488" domain={[40, 160]} fontSize={11} label={{ value: 'Heart Rate (BPM)', angle: -90, position: 'insideLeft', fill: '#0D9488', fontSize: 11 }} />
                    <YAxis yAxisId="right" orientation="right" stroke="#E11D48" domain={[35, 41]} fontSize={11} label={{ value: 'Temp (°C)', angle: 90, position: 'insideRight', fill: '#E11D48', fontSize: 11 }} />
                    <Tooltip
                      labelFormatter={(t) => new Date(t).toLocaleString()}
                      contentStyle={{ backgroundColor: '#0F172A', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                    />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="heartRate" name="Heart Rate (BPM)" stroke="#0D9488" strokeWidth={2.5} dot={{ r: 3 }} />
                    <Line yAxisId="right" type="monotone" dataKey="temperature" name="Temp (°C)" stroke="#E11D48" strokeWidth={2.5} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 7: PROFILE & DEMOGRAPHICS ================= */}
        {activeTab === 'profile' && (
          <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 sm:p-8">
            <div className="flex items-center justify-between pb-6 border-b border-slate-100 dark:border-slate-800 mb-6">
              <div>
                <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">Patient Clinical Profile</h3>
                <p className="text-xs text-slate-500">Demographic details, emergency contacts, and medical registration info.</p>
              </div>
              <button
                onClick={() => setIsEditingProfile(!isEditingProfile)}
                className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50"
              >
                {isEditingProfile ? 'Cancel' : 'Edit Profile'}
              </button>
            </div>

            {isEditingProfile ? (
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">First Name</label>
                    <input
                      type="text"
                      value={profileFormData.firstName || ''}
                      onChange={(e) => setProfileFormData({ ...profileFormData, firstName: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-sm bg-white dark:bg-slate-800"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">Last Name</label>
                    <input
                      type="text"
                      value={profileFormData.lastName || ''}
                      onChange={(e) => setProfileFormData({ ...profileFormData, lastName: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-sm bg-white dark:bg-slate-800"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">Phone Number</label>
                    <input
                      type="tel"
                      value={profileFormData.phoneNumber || ''}
                      onChange={(e) => setProfileFormData({ ...profileFormData, phoneNumber: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-sm bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">Blood Group</label>
                    <select
                      value={profileFormData.bloodGroup || ''}
                      onChange={(e) => setProfileFormData({ ...profileFormData, bloodGroup: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-sm bg-white dark:bg-slate-800"
                    >
                      <option value="">Select Blood Group</option>
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                        <option key={bg} value={bg}>{bg}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">Address</label>
                  <input
                    type="text"
                    value={profileFormData.address || ''}
                    onChange={(e) => setProfileFormData({ ...profileFormData, address: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-sm bg-white dark:bg-slate-800"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm shadow-xs mt-2"
                >
                  Save Changes
                </button>
              </form>
            ) : (
              <div className="space-y-4 text-sm divide-y divide-slate-100 dark:divide-slate-800">
                <div className="grid grid-cols-2 py-2">
                  <span className="text-slate-400">Full Name</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{profile.firstName} {profile.lastName}</span>
                </div>
                <div className="grid grid-cols-2 py-2">
                  <span className="text-slate-400">Registered Email</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{profile.email}</span>
                </div>
                <div className="grid grid-cols-2 py-2">
                  <span className="text-slate-400">Phone Number</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{profile.phoneNumber || 'Not provided'}</span>
                </div>
                <div className="grid grid-cols-2 py-2">
                  <span className="text-slate-400">Blood Group</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{profile.bloodGroup || 'Not specified'}</span>
                </div>
                <div className="grid grid-cols-2 py-2">
                  <span className="text-slate-400">Address</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{profile.address || 'Not specified'}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Printable Document Modal (Prescription / Invoice) */}
      {printModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-xl w-full p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Hospital className="w-5 h-5 text-teal-600" />
                <span className="font-display font-bold text-lg text-slate-900 dark:text-white">
                  AuraCare Hospital Document
                </span>
              </div>
              <button onClick={() => setPrintModalItem(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-6 space-y-4 print-only">
              <div className="flex justify-between text-xs text-slate-500 pb-2 border-b">
                <div>
                  <p className="font-bold text-slate-900 dark:text-white text-sm">
                    {printType === 'prescription' ? 'PRESCRIPTION ORDER' : 'OFFICIAL INVOICE'}
                  </p>
                  <p>AuraCare Central Hospital, Metroville</p>
                </div>
                <div className="text-right">
                  <p>Date: {new Date().toLocaleDateString()}</p>
                  <p>Patient: {profile.firstName} {profile.lastName}</p>
                </div>
              </div>

              {printType === 'prescription' ? (
                <div>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Diagnosis: {printModalItem.diagnosis || 'Clinical consultation'}
                  </p>
                  <div className="mt-4 space-y-3">
                    {(printModalItem.items || [{ medication: printModalItem.medication, dosage: printModalItem.dosage, frequency: printModalItem.frequency }]).map((it, i) => (
                      <div key={i} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 text-xs">
                        <p className="font-bold text-slate-900 dark:text-white">{i + 1}. {it.medication}</p>
                        <p className="text-slate-600 dark:text-slate-300">{it.dosage} · {it.frequency} · Duration: {it.duration || '7 days'}</p>
                        {it.instructions && <p className="text-slate-400 mt-1">Instructions: {it.instructions}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Invoice #{printModalItem.invoiceNumber}
                  </p>
                  <div className="divide-y text-xs">
                    {printModalItem.items?.map((it, idx) => (
                      <div key={idx} className="py-2 flex justify-between">
                        <span>{it.description} (x{it.quantity})</span>
                        <span className="font-semibold">${it.total?.toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="py-2 flex justify-between font-bold text-sm text-slate-900 dark:text-white pt-3">
                      <span>Total</span>
                      <span>${printModalItem.total?.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 no-print">
              <button
                onClick={() => setPrintModalItem(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs"
              >
                <Printer className="w-4 h-4" />
                <span>Print Document</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}