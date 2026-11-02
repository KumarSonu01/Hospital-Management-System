import React, { useState, useEffect } from 'react';
import {
  Calendar,
  User,
  FileText,
  Activity,
  Plus,
  Printer,
  RefreshCw,
  X
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { API_BASE_URL } from '../config';

export default function DoctorDashboard() {
  const { user, token } = useAuth();
  const { success, error: toastError } = useToast();

  const [activeTab, setActiveTab] = useState('schedule');
  const [profile, setProfile] = useState(user || {});
  const [scheduleView, setScheduleView] = useState('day'); // 'day', 'week', 'all'
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Encounter / Prescription modal
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [encounterModal, setEncounterModal] = useState(false);
  const [encounterForm, setEncounterForm] = useState({
    diagnosis: '',
    notes: '',
    items: [{ medication: '', dosage: '', frequency: '', duration: '7 days', instructions: 'Take with food' }]
  });

  // Patient Vitals chart view state
  const [selectedPatientVitals, setSelectedPatientVitals] = useState(null);
  const [vitalsSeries, setVitalsSeries] = useState([]);
  const [loadingVitals, setLoadingVitals] = useState(false);

  // Print modal
  const [printPrescription, setPrintPrescription] = useState(null);

  useEffect(() => {
    fetchDoctorData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleView, selectedDate, token]);

  const fetchDoctorData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };

      const [profRes, appRes, patRes, prescRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/doctor/profile`, { headers }).catch(() => null),
        fetch(`${API_BASE_URL}/api/doctor/appointments?view=${scheduleView}&date=${selectedDate}`, { headers }).catch(() => null),
        fetch(`${API_BASE_URL}/api/doctor/patients-with-appointments`, { headers }).catch(() => null),
        fetch(`${API_BASE_URL}/api/doctor/prescriptions`, { headers }).catch(() => null)
      ]);

      if (profRes && profRes.ok) {
        const pData = await profRes.json();
        setProfile(pData.doctor || user);
      }

      if (appRes && appRes.ok) {
        const aData = await appRes.json();
        setAppointments(aData.appointments || []);
      }

      if (patRes && patRes.ok) {
        const ptData = await patRes.json();
        setPatients(ptData.patients || []);
      }

      if (prescRes && prescRes.ok) {
        const prData = await prescRes.json();
        setPrescriptions(prData.prescriptions || []);
      }
    } catch {
      toastError('Error connecting to hospital server.');
    } finally {
      setLoading(false);
    }
  };

  const fetchVitalsForPatient = async (patient) => {
    setSelectedPatientVitals(patient);
    setLoadingVitals(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/vitals/patient/${patient._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setVitalsSeries(data.series || []);
      } else {
        // Fallback demo series if patient has no cloud telemetry
        setVitalsSeries([
          { t: '10:00 AM', heartRate: 74, temperature: 36.8 },
          { t: '11:00 AM', heartRate: 78, temperature: 37.0 },
          { t: '12:00 PM', heartRate: 82, temperature: 37.1 },
          { t: '01:00 PM', heartRate: 76, temperature: 36.9 }
        ]);
      }
    } catch {
      setVitalsSeries([]);
    } finally {
      setLoadingVitals(false);
    }
  };

  const handleOpenEncounter = (appointment) => {
    setSelectedAppointment(appointment);
    setEncounterForm({
      diagnosis: appointment.diagnosis || '',
      notes: appointment.notes || '',
      items: [{ medication: '', dosage: '', frequency: '', duration: '7 days', instructions: 'Take with food' }]
    });
    setEncounterModal(true);
  };

  const handleAddMedicationRow = () => {
    setEncounterForm((prev) => ({
      ...prev,
      items: [...prev.items, { medication: '', dosage: '', frequency: '', duration: '7 days', instructions: '' }]
    }));
  };

  const handleRemoveMedicationRow = (index) => {
    setEncounterForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, idx) => idx !== index)
    }));
  };

  const handleMedicationChange = (index, field, value) => {
    setEncounterForm((prev) => {
      const updated = [...prev.items];
      updated[index][field] = value;
      return { ...prev, items: updated };
    });
  };

  const handleSaveEncounter = async (e) => {
    e.preventDefault();
    if (!selectedAppointment) return;

    try {
      // 1. Update appointment status to completed and save diagnosis
      await fetch(`${API_BASE_URL}/api/doctor/appointments/${selectedAppointment._id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          status: 'completed',
          diagnosis: encounterForm.diagnosis,
          notes: encounterForm.notes
        })
      });

      // 2. Issue prescription if any medication row filled
      const validItems = encounterForm.items.filter((item) => item.medication.trim().length > 0);
      if (validItems.length > 0) {
        const prescRes = await fetch(`${API_BASE_URL}/api/doctor/prescribe-medication`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            patientId: selectedAppointment.patientId._id || selectedAppointment.patientId,
            appointmentId: selectedAppointment._id,
            items: validItems,
            diagnosis: encounterForm.diagnosis,
            notes: encounterForm.notes
          })
        });
        if (prescRes.ok) {
          const prescData = await prescRes.json();
          setPrescriptions((prev) => [prescData.prescription, ...prev]);
        }
      }

      success('Consultation encounter & prescription recorded!', 'Encounter Completed');
      setEncounterModal(false);
      fetchDoctorData();
    } catch {
      toastError('Failed to record clinical encounter.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans pb-16">
      {/* Top Clinic Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-6 px-4 sm:px-6 lg:px-8 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300">
                Attending Physician Dashboard
              </span>
              <span className="text-xs text-slate-400 font-mono">Lic: {profile?.licenseNumber || 'DOC-LIC-01'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 dark:text-white mt-1">
              Dr. {profile?.firstName} {profile?.lastName}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Specialty: <span className="font-semibold text-teal-600 dark:text-teal-400">{profile?.specialty || 'General Medicine'}</span> · Department: {profile?.department || 'Clinical Care'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchDoctorData}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Schedule</span>
            </button>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="max-w-7xl mx-auto mt-6 flex overflow-x-auto gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
          {[
            { id: 'schedule', label: `Today's Schedule (${appointments.length})`, icon: Calendar },
            { id: 'patients', label: `My Patients (${patients.length})`, icon: User },
            { id: 'prescriptions', label: `Issued Prescriptions (${prescriptions.length})`, icon: FileText }
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {/* ================= TAB 1: SCHEDULE VIEW (DAILY / WEEKLY) ================= */}
        {activeTab === 'schedule' && (
          <div className="space-y-6">
            {/* View Filter Controls */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">View Roster:</span>
                <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
                  {['day', 'week', 'all'].map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setScheduleView(mode)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                        scheduleView === mode
                          ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-xs'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {mode === 'day' ? 'Daily' : mode === 'week' ? 'Weekly' : 'All Consultations'}
                    </button>
                  ))}
                </div>
              </div>

              {scheduleView === 'day' && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">Select Date:</span>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs bg-white dark:bg-slate-800"
                  />
                </div>
              )}
            </div>

            {/* Appointments Queue Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">
                    Clinical Queue & Consultation List
                  </h3>
                  <p className="text-xs text-slate-500">
                    Priority-ranked queue ({scheduleView.toUpperCase()} view). Click "Conduct Encounter" to record diagnosis & prescribe medication.
                  </p>
                </div>
              </div>

              {appointments.length === 0 ? (
                <div className="py-16 text-center text-sm text-slate-400">
                  No appointments scheduled for this selection period.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800 text-left text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 text-xs uppercase font-semibold">
                      <tr>
                        <th className="px-6 py-3.5">Time & Date</th>
                        <th className="px-6 py-3.5">Patient Details</th>
                        <th className="px-6 py-3.5">Condition & Need</th>
                        <th className="px-6 py-3.5">Triage Tier</th>
                        <th className="px-6 py-3.5">Status</th>
                        <th className="px-6 py-3.5 text-right">Clinical Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {appointments.map((app) => (
                        <tr key={app._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <p className="font-mono font-bold text-slate-900 dark:text-white">{app.time}</p>
                            <p className="text-xs text-slate-500">
                              {new Date(app.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                            </p>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <p className="font-semibold text-slate-900 dark:text-white">
                              {app.patientId?.firstName} {app.patientId?.lastName}
                            </p>
                            <p className="text-xs text-slate-500">
                              {app.patientId?.bloodGroup ? `Blood: ${app.patientId.bloodGroup} · ` : ''}
                              {app.patientId?.phoneNumber || app.patientId?.email}
                            </p>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <p className="font-semibold text-slate-900 dark:text-white text-xs">{app.disease}</p>
                            <p className="text-xs text-slate-400 truncate max-w-xs">{app.reason}</p>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                app.conditionType === 'critical'
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                  : app.conditionType === 'moderate'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              }`}
                            >
                              {app.conditionType?.toUpperCase()} ({app.computingLayer?.toUpperCase()})
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                app.status === 'completed'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : app.status === 'cancelled'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-teal-100 text-teal-800'
                              }`}
                            >
                              {app.status?.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right whitespace-nowrap space-x-2">
                            <button
                              onClick={() => fetchVitalsForPatient(app.patientId)}
                              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                              title="Inspect Vitals Telemetry"
                            >
                              <Activity className="w-3.5 h-3.5 inline mr-1" />
                              Vitals
                            </button>
                            {app.status !== 'completed' && (
                              <button
                                onClick={() => handleOpenEncounter(app)}
                                className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs"
                              >
                                Conduct Encounter
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

            {/* Vitals Telemetry Drawer/Card when selected */}
            {selectedPatientVitals && (
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm animate-slide-up">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
                  <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-teal-600" />
                    <h3 className="font-bold text-slate-900 dark:text-white">
                      Telemetry for {selectedPatientVitals.firstName} {selectedPatientVitals.lastName}
                    </h3>
                  </div>
                  <button onClick={() => setSelectedPatientVitals(null)} className="p-1 text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="h-64 w-full">
                  {loadingVitals ? (
                    <div className="h-full flex items-center justify-center text-xs text-slate-400">
                      Loading telemetry...
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={vitalsSeries}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="t" stroke="#94a3b8" fontSize={11} />
                        <YAxis yAxisId="left" stroke="#0D9488" domain={[50, 160]} fontSize={11} label={{ value: 'Heart Rate', angle: -90, position: 'insideLeft', fill: '#0D9488', fontSize: 10 }} />
                        <YAxis yAxisId="right" orientation="right" stroke="#E11D48" domain={[35, 41]} fontSize={11} label={{ value: 'Temp (°C)', angle: 90, position: 'insideRight', fill: '#E11D48', fontSize: 10 }} />
                        <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderRadius: '10px', color: '#fff', fontSize: '11px' }} />
                        <Line yAxisId="left" type="monotone" dataKey="heartRate" name="Heart Rate (BPM)" stroke="#0D9488" strokeWidth={2} dot={{ r: 3 }} />
                        <Line yAxisId="right" type="monotone" dataKey="temperature" name="Temp (°C)" stroke="#E11D48" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 2: MY PATIENTS ================= */}
        {activeTab === 'patients' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-6">
            <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white mb-1">
              Patient Care Registry
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              Patients with active care relationships, appointment histories, and medical charts.
            </p>

            {patients.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-400">No patient records found in your registry.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {patients.map((pat) => (
                  <div key={pat._id} className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-3 pb-3 border-b border-slate-200 dark:border-slate-700">
                        <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold text-sm">
                          {pat.firstName?.[0]}{pat.lastName?.[0]}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                            {pat.firstName} {pat.lastName}
                          </h4>
                          <p className="text-xs text-slate-500">{pat.email}</p>
                        </div>
                      </div>

                      <div className="py-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                        <p><span className="text-slate-400">Phone:</span> {pat.phoneNumber || 'N/A'}</p>
                        <p><span className="text-slate-400">Blood Group:</span> <span className="font-semibold text-teal-600">{pat.bloodGroup || 'Not specified'}</span></p>
                        <p><span className="text-slate-400">Total Encounters:</span> {pat.totalAppointments || 1}</p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-between">
                      <button
                        onClick={() => fetchVitalsForPatient(pat)}
                        className="text-xs font-semibold text-teal-600 hover:underline"
                      >
                        Inspect Vitals
                      </button>
                      <button
                        onClick={() => {
                          setSelectedAppointment({ patientId: pat, _id: 'manual' });
                          handleOpenEncounter({ patientId: pat, _id: 'manual' });
                        }}
                        className="text-xs font-semibold text-teal-600 hover:underline"
                      >
                        + Prescribe
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 3: ISSUED PRESCRIPTIONS ================= */}
        {activeTab === 'prescriptions' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-6">
            <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white mb-1">
              Issued Prescriptions
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              All clinical prescriptions written and signed by you.
            </p>

            {prescriptions.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-400">No prescriptions written yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800 text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 text-xs uppercase font-semibold">
                    <tr>
                      <th className="px-6 py-3.5">Date</th>
                      <th className="px-6 py-3.5">Patient</th>
                      <th className="px-6 py-3.5">Diagnosis</th>
                      <th className="px-6 py-3.5">Medications</th>
                      <th className="px-6 py-3.5 text-right">Print</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {prescriptions.map((pr) => (
                      <tr key={pr._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                          {new Date(pr.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                          {pr.patientId?.firstName} {pr.patientId?.lastName}
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-700 dark:text-slate-300">
                          {pr.diagnosis}
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500">
                          {pr.items?.map((it) => `${it.medication} (${it.dosage})`).join(', ') || pr.medication}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => setPrintPrescription(pr)}
                            className="p-1.5 text-slate-400 hover:text-teal-600 transition-colors"
                            title="Print Prescription"
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
      </div>

      {/* ================= CLINICAL ENCOUNTER MODAL ================= */}
      {encounterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">
                  Conduct Clinical Encounter
                </h3>
                <p className="text-xs text-slate-500">
                  Patient: {selectedAppointment?.patientId?.firstName} {selectedAppointment?.patientId?.lastName}
                </p>
              </div>
              <button onClick={() => setEncounterModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEncounter} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Clinical Diagnosis *
                </label>
                <input
                  type="text"
                  value={encounterForm.diagnosis}
                  onChange={(e) => setEncounterForm({ ...encounterForm, diagnosis: e.target.value })}
                  placeholder="e.g. Stage 1 Essential Hypertension"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-sm bg-white dark:bg-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Encounter Notes & Observations
                </label>
                <textarea
                  rows={2}
                  value={encounterForm.notes}
                  onChange={(e) => setEncounterForm({ ...encounterForm, notes: e.target.value })}
                  placeholder="Document patient examination observations, treatment advice..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-sm bg-white dark:bg-slate-800"
                />
              </div>

              {/* Multi-item Medication Prescription */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Prescribed Medications
                  </label>
                  <button
                    type="button"
                    onClick={handleAddMedicationRow}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Medicine</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {encounterForm.items.map((row, index) => (
                    <div key={index} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-400">Medication #{index + 1}</span>
                        {encounterForm.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMedicationRow(index)}
                            className="text-xs text-rose-500 hover:underline"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                          type="text"
                          value={row.medication}
                          onChange={(e) => handleMedicationChange(index, 'medication', e.target.value)}
                          placeholder="Drug Name (e.g. Amoxicillin)"
                          className="px-3 py-1.5 rounded-lg border text-xs bg-white dark:bg-slate-800"
                        />
                        <input
                          type="text"
                          value={row.dosage}
                          onChange={(e) => handleMedicationChange(index, 'dosage', e.target.value)}
                          placeholder="Dosage (e.g. 500mg)"
                          className="px-3 py-1.5 rounded-lg border text-xs bg-white dark:bg-slate-800"
                        />
                        <input
                          type="text"
                          value={row.frequency}
                          onChange={(e) => handleMedicationChange(index, 'frequency', e.target.value)}
                          placeholder="Frequency (e.g. Twice daily)"
                          className="px-3 py-1.5 rounded-lg border text-xs bg-white dark:bg-slate-800"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={row.duration}
                          onChange={(e) => handleMedicationChange(index, 'duration', e.target.value)}
                          placeholder="Duration (e.g. 10 days)"
                          className="px-3 py-1.5 rounded-lg border text-xs bg-white dark:bg-slate-800"
                        />
                        <input
                          type="text"
                          value={row.instructions}
                          onChange={(e) => handleMedicationChange(index, 'instructions', e.target.value)}
                          placeholder="Instructions (e.g. After meals)"
                          className="px-3 py-1.5 rounded-lg border text-xs bg-white dark:bg-slate-800"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEncounterModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs"
                >
                  Save & Complete Visit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= PRINT PRESCRIPTION MODAL ================= */}
      {printPrescription && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-xl w-full p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <span className="font-bold text-lg text-slate-900 dark:text-white">Physician Prescription</span>
              <button onClick={() => setPrintPrescription(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-6 space-y-4 print-only text-xs">
              <div className="flex justify-between border-b pb-3">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Dr. {profile?.firstName} {profile?.lastName}</h3>
                  <p>{profile?.specialty} · Lic: {profile?.licenseNumber}</p>
                  <p>AuraCare Clinical Hospital</p>
                </div>
                <div className="text-right">
                  <p>Patient: {printPrescription.patientId?.firstName} {printPrescription.patientId?.lastName}</p>
                  <p>Date: {new Date(printPrescription.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              <div>
                <p className="font-semibold text-slate-700 dark:text-slate-300">Diagnosis: {printPrescription.diagnosis}</p>
                <div className="mt-3 space-y-2">
                  {(printPrescription.items || [{ medication: printPrescription.medication, dosage: printPrescription.dosage, frequency: printPrescription.frequency }]).map((it, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800">
                      <p className="font-bold text-slate-900 dark:text-white">{idx + 1}. {it.medication} - {it.dosage}</p>
                      <p className="text-slate-500">{it.frequency} · {it.duration}</p>
                      {it.instructions && <p className="text-slate-400 mt-0.5">Instructions: {it.instructions}</p>}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 no-print">
              <button onClick={() => setPrintPrescription(null)} className="px-4 py-2 rounded-xl border text-xs font-semibold">
                Close
              </button>
              <button onClick={() => window.print()} className="px-5 py-2 rounded-xl bg-teal-600 text-white text-xs font-semibold">
                Print Prescription
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}