import React, { useState, useEffect } from 'react';
import {
  Shield,
  Users,
  Stethoscope,
  Bed,
  Pill,
  CreditCard,
  ClipboardList,
  Plus,
  RefreshCw,
  Download,
  AlertTriangle,
  X,
  Lock,
  Key,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { API_BASE_URL } from '../config';

export default function AdminDashboard() {
  const { user, token, updateUser } = useAuth();
  const { success, error: toastError, info } = useToast();

  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({});
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [beds, setBeds] = useState([]);
  const [wardStats, setWardStats] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [lowStockAlerts, setLowStockAlerts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAddDoctorModal, setShowAddDoctorModal] = useState(false);
  const [doctorForm, setDoctorForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    specialty: 'Cardiology',
    licenseNumber: '',
    phoneNumber: '',
    department: 'Cardiovascular Care',
    password: ''
  });

  const [showRestockModal, setShowRestockModal] = useState(false);
  const [restockItem, setRestockItem] = useState(null);
  const [restockQty, setRestockQty] = useState(50);

  // Admit Patient to Bed Modal
  const [showAdmitModal, setShowAdmitModal] = useState(false);
  const [selectedBedForAdmission, setSelectedBedForAdmission] = useState(null);
  const [admitPatientId, setAdmitPatientId] = useState('');

  // Add New Medicine Modal
  const [showAddMedicineModal, setShowAddMedicineModal] = useState(false);
  const [medicineForm, setMedicineForm] = useState({
    itemName: '',
    category: 'antibiotics',
    stockQuantity: 100,
    unitPrice: 15.0,
    reorderThreshold: 25,
    unit: 'tablets',
    sku: '',
    manufacturer: '',
    expiryDate: ''
  });

  // Admin Security Forms
  const [updateAdminForm, setUpdateAdminForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phoneNumber: user?.phoneNumber || '',
    newPassword: '',
    securityCode: ''
  });

  const [createAdminForm, setCreateAdminForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    password: '',
    securityCode: ''
  });

  useEffect(() => {
    if (user) {
      setUpdateAdminForm((prev) => ({
        ...prev,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phoneNumber: user.phoneNumber || ''
      }));
    }
  }, [user]);

  useEffect(() => {
    fetchAdminData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };

      const [
        statsRes,
        docsRes,
        patsRes,
        bedsRes,
        wardStatsRes,
        invRes,
        alertsRes,
        invsRes,
        logsRes
      ] = await Promise.all([
        fetch(`${API_BASE_URL}/api/admin/stats`, { headers }).catch(() => null),
        fetch(`${API_BASE_URL}/api/admin/doctors`, { headers }).catch(() => null),
        fetch(`${API_BASE_URL}/api/admin/patient-overview`, { headers }).catch(() => null),
        fetch(`${API_BASE_URL}/api/wards`, { headers }).catch(() => null),
        fetch(`${API_BASE_URL}/api/wards/stats`, { headers }).catch(() => null),
        fetch(`${API_BASE_URL}/api/pharmacy`, { headers }).catch(() => null),
        fetch(`${API_BASE_URL}/api/pharmacy/alerts/low-stock`, { headers }).catch(() => null),
        fetch(`${API_BASE_URL}/api/billing`, { headers }).catch(() => null),
        fetch(`${API_BASE_URL}/api/admin/audit-logs`, { headers }).catch(() => null)
      ]);

      if (statsRes && statsRes.ok) {
        const d = await statsRes.json();
        setStats(d.stats || {});
      }
      if (docsRes && docsRes.ok) {
        const d = await docsRes.json();
        setDoctors(d.doctors || []);
      }
      if (patsRes && patsRes.ok) {
        const d = await patsRes.json();
        setPatients(d.patientOverview || []);
      }
      if (bedsRes && bedsRes.ok) {
        const d = await bedsRes.json();
        setBeds(d.beds || []);
      }
      if (wardStatsRes && wardStatsRes.ok) {
        const d = await wardStatsRes.json();
        setWardStats(d);
      }
      if (invRes && invRes.ok) {
        const d = await invRes.json();
        setInventory(d.items || []);
      }
      if (alertsRes && alertsRes.ok) {
        const d = await alertsRes.json();
        setLowStockAlerts(d.alerts || []);
      }
      if (invsRes && invsRes.ok) {
        const d = await invsRes.json();
        setInvoices(d.invoices || []);
      }
      if (logsRes && logsRes.ok) {
        const d = await logsRes.json();
        setAuditLogs(d.logs || []);
      }
    } catch (e) {
      toastError('Error connecting to administrative operations.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddDoctor = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/add-doctor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(doctorForm)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        success('New doctor registered successfully!', 'Doctor Appointed');
        setShowAddDoctorModal(false);
        setDoctorForm({
          firstName: '',
          lastName: '',
          email: '',
          specialty: 'Cardiology',
          licenseNumber: '',
          phoneNumber: '',
          department: 'Cardiovascular Care',
          password: ''
        });
        fetchAdminData();
      } else {
        toastError(data.error || 'Failed to add doctor.');
      }
    } catch {
      toastError('Network error while registering doctor.');
    }
  };

  const handleRestock = async (e) => {
    e.preventDefault();
    if (!restockItem) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/pharmacy/${restockItem._id}/stock`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ changeQuantity: Number(restockQty) })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        success(`Stock increased for ${restockItem.itemName}`, 'Inventory Restocked');
        setShowRestockModal(false);
        fetchAdminData();
      } else {
        toastError(data.error || 'Failed to restock item.');
      }
    } catch {
      toastError('Error updating inventory stock.');
    }
  };

  // Export any table array to CSV
  const exportToCsv = (filename, data) => {
    if (!data || data.length === 0) {
      info('No rows available to export.');
      return;
    }
    const headers = Object.keys(data[0]).filter((k) => typeof data[0][k] !== 'object');
    const rows = data.map((row) =>
      headers.map((h) => JSON.stringify(row[h] || '')).join(',')
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    success(`Exported ${data.length} records to CSV.`, 'Export Ready');
  };

  // ================= BED DISCHARGE & ADMISSION HANDLERS =================
  const handleDischargeBed = async (bed) => {
    if (!window.confirm(`Discharge patient from Bed ${bed.bedNumber}? Bed will be scheduled for sanitation.`)) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/wards/${bed._id}/discharge`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ toStatus: 'cleaning' })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        success(`Patient discharged from Bed ${bed.bedNumber}. Bed marked for sanitation.`, 'Discharge Successful');
        fetchAdminData();
      } else {
        toastError(data.error || 'Failed to discharge patient.');
      }
    } catch {
      toastError('Network error while discharging patient.');
    }
  };

  const handleUpdateBedStatus = async (bed, newStatus) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/wards/${bed._id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        success(`Bed ${bed.bedNumber} status updated to ${newStatus}.`, 'Bed Updated');
        fetchAdminData();
      } else {
        toastError(data.error || 'Failed to update bed status.');
      }
    } catch {
      toastError('Network error while updating bed status.');
    }
  };

  const handleAdmitBed = async (e) => {
    e.preventDefault();
    if (!admitPatientId || !selectedBedForAdmission) {
      toastError('Please select a patient to admit.');
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/wards/${selectedBedForAdmission._id}/admit`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ patientId: admitPatientId })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        success(`Patient assigned to Bed ${selectedBedForAdmission.bedNumber}.`, 'Admission Recorded');
        setShowAdmitModal(false);
        setSelectedBedForAdmission(null);
        setAdmitPatientId('');
        fetchAdminData();
      } else {
        toastError(data.error || 'Failed to admit patient.');
      }
    } catch {
      toastError('Network error while admitting patient.');
    }
  };

  // ================= ADD NEW MEDICINE / STOCK ITEM =================
  const handleCreateMedicine = async (e) => {
    e.preventDefault();
    if (!medicineForm.itemName || medicineForm.unitPrice === '') {
      toastError('Item name and unit price are required.');
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/pharmacy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(medicineForm)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        success(`Added "${data.item.itemName}" (${data.item.sku}) to formulary.`, 'Medication Added');
        setShowAddMedicineModal(false);
        setMedicineForm({
          itemName: '',
          category: 'antibiotics',
          stockQuantity: 100,
          unitPrice: 15.0,
          reorderThreshold: 25,
          unit: 'tablets',
          sku: '',
          manufacturer: '',
          expiryDate: ''
        });
        fetchAdminData();
      } else {
        toastError(data.error || 'Failed to add medication.');
      }
    } catch {
      toastError('Network error adding medication.');
    }
  };

  // ================= ADMIN SECURITY & PROFILE HANDLERS =================
  const handleUpdateAdminProfile = async (e) => {
    e.preventDefault();
    if (!updateAdminForm.securityCode) {
      toastError('Organization Security Code is required to update administrator credentials.');
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/update-profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(updateAdminForm)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        success(data.message, 'Admin Credentials Updated');
        if (data.user) {
          updateUser(data.user);
        }
        setUpdateAdminForm((prev) => ({ ...prev, newPassword: '', securityCode: '' }));
      } else {
        toastError(data.error || 'Failed to update credentials.');
      }
    } catch {
      toastError('Network error while updating admin credentials.');
    }
  };

  const handleCreateNewAdmin = async (e) => {
    e.preventDefault();
    if (!createAdminForm.securityCode) {
      toastError('Organization Security Code is required to provision an administrator.');
      return;
    }
    if (!createAdminForm.firstName || !createAdminForm.lastName || !createAdminForm.email || !createAdminForm.password) {
      toastError('First name, last name, email, and password are required.');
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/create-admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(createAdminForm)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        success(data.message, 'Administrator Provisioned');
        setCreateAdminForm({
          firstName: '',
          lastName: '',
          email: '',
          phoneNumber: '',
          password: '',
          securityCode: ''
        });
        fetchAdminData();
      } else {
        toastError(data.error || 'Failed to create administrator.');
      }
    } catch {
      toastError('Network error while creating administrator.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans pb-16">
      {/* Top Admin Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-6 px-4 sm:px-6 lg:px-8 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                Hospital Administration Center
              </span>
              <span className="text-xs text-slate-400">Security Clearance: Level 5</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 dark:text-white mt-1">
              Operations & Management Ledger
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Supervise clinical personnel, patient registries, wards occupancy, pharmacy stockpiles, and financial statements.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddDoctorModal(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Appoint Doctor</span>
            </button>
            <button
              onClick={fetchAdminData}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Refresh Operations"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Tab Strip */}
        <div className="max-w-7xl mx-auto mt-6 flex overflow-x-auto gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
          {[
            { id: 'overview', label: 'Overview', icon: Shield },
            { id: 'doctors', label: `Doctors (${doctors.length})`, icon: Stethoscope },
            { id: 'patients', label: `Patients (${patients.length})`, icon: Users },
            { id: 'wards', label: `Wards & Beds (${beds.length})`, icon: Bed },
            { id: 'pharmacy', label: `Pharmacy (${inventory.length})`, icon: Pill },
            { id: 'billing', label: `Billing (${invoices.length})`, icon: CreditCard },
            { id: 'audit', label: `Audit Trail (${auditLogs.length})`, icon: ClipboardList },
            { id: 'admin-security', label: 'Admin Security', icon: Lock }
          ].map((tab) => {
            const IconComp = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
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
        {/* ================= TAB 1: OVERVIEW METRICS ================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Low-stock Warning Bar */}
            {lowStockAlerts.length > 0 && (
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  <span className="text-xs sm:text-sm text-amber-900 dark:text-amber-200 font-medium">
                    Critical Inventory Warning: <strong className="font-bold">{lowStockAlerts.length} pharmaceuticals</strong> are below the safety reorder threshold.
                  </span>
                </div>
                <button
                  onClick={() => setActiveTab('pharmacy')}
                  className="px-3 py-1.5 rounded-xl bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 shadow-xs"
                >
                  Inspect Stock
                </button>
              </div>
            )}

            {/* Metric Tiles */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active Medical Staff</p>
                <p className="text-3xl font-display font-bold text-slate-900 dark:text-white mt-1">{stats.totalDoctors || doctors.length}</p>
                <span className="text-[11px] text-teal-600 mt-1 inline-block">Specialists & ER physicians</span>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Registered Patients</p>
                <p className="text-3xl font-display font-bold text-slate-900 dark:text-white mt-1">{stats.totalPatients || patients.length}</p>
                <span className="text-[11px] text-teal-600 mt-1 inline-block">Active hospital charts</span>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Bed Occupancy</p>
                <p className="text-3xl font-display font-bold text-slate-900 dark:text-white mt-1">
                  {stats.occupiedBeds || 4} <span className="text-sm font-normal text-slate-400">/ {stats.totalBeds || 13}</span>
                </p>
                <span className="text-[11px] text-emerald-600 mt-1 inline-block">{stats.availableBeds || 9} available</span>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Revenue</p>
                <p className="text-3xl font-display font-bold text-slate-900 dark:text-white mt-1">
                  ${stats.totalRevenue ? stats.totalRevenue.toFixed(2) : '246.00'}
                </p>
                <span className="text-[11px] text-amber-600 mt-1 inline-block">{stats.pendingInvoices || 1} pending collection</span>
              </div>
            </div>

            {/* Quick Overviews Split */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Doctor Patient Volume */}
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">Physician Caseload Roster</h3>
                  <button onClick={() => setActiveTab('doctors')} className="text-xs font-semibold text-teal-600 hover:underline">
                    Manage Staff
                  </button>
                </div>
                <div className="space-y-3">
                  {doctors.slice(0, 4).map((doc) => (
                    <div key={doc._id} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          Dr. {doc.firstName} {doc.lastName}
                        </p>
                        <p className="text-xs text-slate-500">{doc.specialty} · {doc.department}</p>
                      </div>
                      <span className="text-xs px-2.5 py-1 rounded-full bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-semibold">
                        {doc.licenseNumber}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ward Occupancy Breakdown */}
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">Ward Capacity & Utilization</h3>
                  <button onClick={() => setActiveTab('wards')} className="text-xs font-semibold text-teal-600 hover:underline">
                    Manage Beds
                  </button>
                </div>
                <div className="space-y-3">
                  {(wardStats?.wardBreakdown || [
                    { _id: 'general', total: 5, occupied: 2, available: 2 },
                    { _id: 'icu', total: 3, occupied: 1, available: 2 },
                    { _id: 'emergency', total: 3, occupied: 1, available: 2 },
                    { _id: 'private', total: 2, occupied: 0, available: 2 }
                  ]).map((w) => {
                    const pct = w.total > 0 ? Math.round((w.occupied / w.total) * 100) : 0;
                    return (
                      <div key={w._id} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                            {w._id} Ward
                          </span>
                          <span className="font-semibold text-slate-600 dark:text-slate-400">
                            {w.occupied} / {w.total} beds ({pct}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              pct > 80 ? 'bg-rose-500' : pct > 50 ? 'bg-amber-500' : 'bg-teal-500'
                            }`}
                            style={{ width: `${pct}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: DOCTOR DIRECTORY ================= */}
        {activeTab === 'doctors' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">Hospital Medical Staff</h3>
                <p className="text-xs text-slate-500">Board-certified physicians, clinical department heads, and specialists.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => exportToCsv('hospital-doctors', doctors)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>CSV</span>
                </button>
                <button
                  onClick={() => setShowAddDoctorModal(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Appoint Doctor</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800 text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 text-xs uppercase font-semibold">
                  <tr>
                    <th className="px-6 py-3.5">Doctor</th>
                    <th className="px-6 py-3.5">Specialty</th>
                    <th className="px-6 py-3.5">Department</th>
                    <th className="px-6 py-3.5">License #</th>
                    <th className="px-6 py-3.5">Contact Phone</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {doctors.map((doc) => (
                    <tr key={doc._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                        Dr. {doc.firstName} {doc.lastName}
                        <span className="block text-xs font-normal text-slate-400">{doc.email}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300">
                          {doc.specialty}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {doc.department || 'General Medicine'}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-500 whitespace-nowrap">
                        {doc.licenseNumber}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                        {doc.phoneNumber || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= TAB 3: PATIENT REGISTRY ================= */}
        {activeTab === 'patients' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">Registered Patient Directory</h3>
                <p className="text-xs text-slate-500">Electronic patient charts, encounter frequency, and contact records.</p>
              </div>
              <button
                onClick={() => exportToCsv('hospital-patients', patients)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800 text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 text-xs uppercase font-semibold">
                  <tr>
                    <th className="px-6 py-3.5">Patient Name</th>
                    <th className="px-6 py-3.5">Registered Email</th>
                    <th className="px-6 py-3.5">Phone Number</th>
                    <th className="px-6 py-3.5">Blood Group</th>
                    <th className="px-6 py-3.5">Total Visits</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {patients.map((p, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                        {p.name}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                        {p.email}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {p.phoneNumber || 'Not listed'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-semibold text-teal-600 dark:text-teal-400 text-xs">
                          {p.bloodGroup || 'O+'}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {p.appointments || 1}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= TAB 4: WARDS & BEDS ================= */}
        {activeTab === 'wards' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">Ward Bed Allocations</h3>
                <p className="text-xs text-slate-500">Real-time occupancy monitoring and patient admission status.</p>
              </div>
              <button
                onClick={() => exportToCsv('hospital-beds', beds)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {beds.map((b) => (
                <div
                  key={b._id}
                  className={`p-4 rounded-2xl border transition-all ${
                    b.status === 'occupied'
                      ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800'
                      : b.status === 'cleaning'
                      ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800'
                      : 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">{b.bedNumber}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        b.status === 'occupied'
                          ? 'bg-rose-100 text-rose-800'
                          : b.status === 'cleaning'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {b.status}
                    </span>
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mt-2">
                    {b.wardType} Ward · Floor {b.floor}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 min-h-[32px]">
                    {b.currentPatientId
                      ? `Occupied by: ${b.currentPatientId.firstName} ${b.currentPatientId.lastName}`
                      : 'Bed Vacant & Ready'}
                  </p>
                  
                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-400 font-mono">${b.dailyRate}/day</span>
                    {b.status === 'occupied' ? (
                      <button
                        onClick={() => handleDischargeBed(b)}
                        className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-semibold transition-colors shadow-xs"
                      >
                        Discharge Patient
                      </button>
                    ) : b.status === 'cleaning' ? (
                      <button
                        onClick={() => handleUpdateBedStatus(b, 'available')}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold transition-colors shadow-xs"
                      >
                        Mark Ready
                      </button>
                    ) : (
                      <button
                        onClick={() => { setSelectedBedForAdmission(b); setShowAdmitModal(true); }}
                        className="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-semibold transition-colors shadow-xs"
                      >
                        Admit Patient
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= TAB 5: PHARMACY INVENTORY ================= */}
        {activeTab === 'pharmacy' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">Pharmacy Stock & Supply</h3>
                <p className="text-xs text-slate-500">Live pharmaceutical inventory with automatic low-stock alerts.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAddMedicineModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-xs font-semibold text-white shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add New Medicine</span>
                </button>
                <button
                  onClick={() => exportToCsv('pharmacy-inventory', inventory)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800 text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 text-xs uppercase font-semibold">
                  <tr>
                    <th className="px-6 py-3.5">Pharmaceutical Item</th>
                    <th className="px-6 py-3.5">SKU</th>
                    <th className="px-6 py-3.5">Category</th>
                    <th className="px-6 py-3.5">Current Stock</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Unit Price</th>
                    <th className="px-6 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {inventory.map((item) => (
                    <tr key={item._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                        {item.itemName}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-500 whitespace-nowrap">{item.sku}</td>
                      <td className="px-6 py-4 text-xs capitalize text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {item.category}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {item.stockQuantity} {item.unit}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            item.status === 'out_of_stock'
                              ? 'bg-rose-100 text-rose-800'
                              : item.status === 'low_stock'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {item.status?.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                        ${item.unitPrice?.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => {
                            setRestockItem(item);
                            setShowRestockModal(true);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 text-xs font-semibold hover:bg-teal-100"
                        >
                          + Restock
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= TAB 6: BILLING INVOICES ================= */}
        {activeTab === 'billing' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">Hospital Billing Registry</h3>
                <p className="text-xs text-slate-500">Itemized invoices, insurance settlements, and payment tracking.</p>
              </div>
              <button
                onClick={() => exportToCsv('hospital-billing', invoices)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800 text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 text-xs uppercase font-semibold">
                  <tr>
                    <th className="px-6 py-3.5">Invoice #</th>
                    <th className="px-6 py-3.5">Patient</th>
                    <th className="px-6 py-3.5">Date</th>
                    <th className="px-6 py-3.5">Subtotal</th>
                    <th className="px-6 py-3.5">Total</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Payment Method</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {invoices.map((inv) => (
                    <tr key={inv._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="px-6 py-4 font-mono font-medium text-slate-900 dark:text-white">{inv.invoiceNumber}</td>
                      <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">
                        {inv.patientId?.firstName} {inv.patientId?.lastName}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">{new Date(inv.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-xs text-slate-600 dark:text-slate-300">${inv.subtotal?.toFixed(2)}</td>
                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">${inv.total?.toFixed(2)}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            inv.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {inv.status?.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 uppercase font-mono">{inv.paymentMethod}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= TAB 7: AUDIT LOG ================= */}
        {activeTab === 'audit' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">Compliance & Activity Audit Log</h3>
                <p className="text-xs text-slate-500">Immutable chronological record of logins, medical record mutations, and financial transactions.</p>
              </div>
              <button
                onClick={() => exportToCsv('hospital-audit-logs', auditLogs)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800 text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 text-xs uppercase font-semibold">
                  <tr>
                    <th className="px-6 py-3.5">Timestamp</th>
                    <th className="px-6 py-3.5">User</th>
                    <th className="px-6 py-3.5">Action</th>
                    <th className="px-6 py-3.5">Resource</th>
                    <th className="px-6 py-3.5">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {auditLogs.map((log) => (
                    <tr key={log._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="px-6 py-4 font-mono text-xs text-slate-400 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-semibold text-slate-900 dark:text-white text-xs">{log.userName}</span>
                        <span className="block text-[10px] uppercase text-slate-400">{log.userRole}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-semibold text-slate-800 dark:text-slate-200">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {log.resourceType}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 max-w-md truncate">
                        {log.details}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= TAB 8: ADMIN SECURITY & CREDENTIALS ================= */}
        {activeTab === 'admin-security' && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Administrative Clearance Vault</span>
                </div>
                <h3 className="text-xl font-display font-bold text-slate-900 dark:text-white mt-1">
                  Administrator Credentials & Staff Provisioning
                </h3>
                <p className="text-xs text-slate-500">
                  Modify active administrator profile or provision new system administrators. All changes require verified Organizational Security Clearance.
                </p>
              </div>

              <div className="px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs">
                <span className="text-slate-400 block font-medium">Logged in Administrator:</span>
                <span className="font-bold text-slate-900 dark:text-white">{user?.firstName} {user?.lastName} ({user?.email})</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Card 1: Update Admin Profile */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950 text-teal-600 flex items-center justify-center">
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-base text-slate-900 dark:text-white">Update My Admin Profile</h4>
                      <p className="text-xs text-slate-400">Update contact info or set a new password</p>
                    </div>
                  </div>

                  <form onSubmit={handleUpdateAdminProfile} className="mt-5 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">First Name</label>
                        <input
                          type="text"
                          value={updateAdminForm.firstName}
                          onChange={(e) => setUpdateAdminForm({ ...updateAdminForm, firstName: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">Last Name</label>
                        <input
                          type="text"
                          value={updateAdminForm.lastName}
                          onChange={(e) => setUpdateAdminForm({ ...updateAdminForm, lastName: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">Email Address</label>
                        <input
                          type="email"
                          value={updateAdminForm.email}
                          onChange={(e) => setUpdateAdminForm({ ...updateAdminForm, email: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">Phone Number</label>
                        <input
                          type="tel"
                          value={updateAdminForm.phoneNumber}
                          onChange={(e) => setUpdateAdminForm({ ...updateAdminForm, phoneNumber: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                        New Password (optional)
                      </label>
                      <input
                        type="password"
                        value={updateAdminForm.newPassword}
                        onChange={(e) => setUpdateAdminForm({ ...updateAdminForm, newPassword: e.target.value })}
                        placeholder="Leave blank to keep existing password"
                        className="w-full px-3 py-2 rounded-xl border text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                      />
                    </div>

                    <div className="p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-2">
                      <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 text-xs font-bold">
                        <Lock className="w-3.5 h-3.5" />
                        <span>Security Verification Required</span>
                      </div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">
                        Organization Security Code *
                      </label>
                      <input
                        type="password"
                        value={updateAdminForm.securityCode}
                        onChange={(e) => setUpdateAdminForm({ ...updateAdminForm, securityCode: e.target.value })}
                        placeholder="Enter organization security code"
                        className="w-full px-3 py-2 rounded-xl border text-sm bg-white dark:bg-slate-800 border-amber-300 dark:border-amber-700"
                        required
                      />
                      <p className="text-[11px] text-slate-500">Provided by hospital organization officers</p>
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-colors"
                      >
                        Save Profile & Credentials
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Card 2: Provision New Administrator */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950 text-purple-600 flex items-center justify-center">
                      <Key className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-base text-slate-900 dark:text-white">Provision New Administrator</h4>
                      <p className="text-xs text-slate-400">Grant full hospital system administration privileges</p>
                    </div>
                  </div>

                  <form onSubmit={handleCreateNewAdmin} className="mt-5 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">First Name *</label>
                        <input
                          type="text"
                          value={createAdminForm.firstName}
                          onChange={(e) => setCreateAdminForm({ ...createAdminForm, firstName: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">Last Name *</label>
                        <input
                          type="text"
                          value={createAdminForm.lastName}
                          onChange={(e) => setCreateAdminForm({ ...createAdminForm, lastName: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">Email Address *</label>
                        <input
                          type="email"
                          value={createAdminForm.email}
                          onChange={(e) => setCreateAdminForm({ ...createAdminForm, email: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">Phone Number</label>
                        <input
                          type="tel"
                          value={createAdminForm.phoneNumber}
                          onChange={(e) => setCreateAdminForm({ ...createAdminForm, phoneNumber: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                        Initial Admin Password *
                      </label>
                      <input
                        type="password"
                        value={createAdminForm.password}
                        onChange={(e) => setCreateAdminForm({ ...createAdminForm, password: e.target.value })}
                        placeholder="Min 6 characters"
                        className="w-full px-3 py-2 rounded-xl border text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                        required
                      />
                    </div>

                    <div className="p-3.5 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 space-y-2">
                      <div className="flex items-center gap-2 text-purple-800 dark:text-purple-300 text-xs font-bold">
                        <Lock className="w-3.5 h-3.5" />
                        <span>Security Clearance Authorization</span>
                      </div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">
                        Organization Security Code *
                      </label>
                      <input
                        type="password"
                        value={createAdminForm.securityCode}
                        onChange={(e) => setCreateAdminForm({ ...createAdminForm, securityCode: e.target.value })}
                        placeholder="Enter organization security code"
                        className="w-full px-3 py-2 rounded-xl border text-sm bg-white dark:bg-slate-800 border-purple-300 dark:border-purple-700"
                        required
                      />
                      <p className="text-[11px] text-slate-500">Only authorized hospital directors may issue security clearances.</p>
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs transition-colors"
                      >
                        Create Administrator Account
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ================= MODAL: ADD DOCTOR ================= */}
      {showAddDoctorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Appoint New Medical Specialist</h3>
              <button onClick={() => setShowAddDoctorModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddDoctor} className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">First Name *</label>
                  <input
                    type="text"
                    value={doctorForm.firstName}
                    onChange={(e) => setDoctorForm({ ...doctorForm, firstName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border text-sm bg-white dark:bg-slate-800"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">Last Name *</label>
                  <input
                    type="text"
                    value={doctorForm.lastName}
                    onChange={(e) => setDoctorForm({ ...doctorForm, lastName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border text-sm bg-white dark:bg-slate-800"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">Email *</label>
                <input
                  type="email"
                  value={doctorForm.email}
                  onChange={(e) => setDoctorForm({ ...doctorForm, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border text-sm bg-white dark:bg-slate-800"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">Specialty *</label>
                  <select
                    value={doctorForm.specialty}
                    onChange={(e) => setDoctorForm({ ...doctorForm, specialty: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border text-sm bg-white dark:bg-slate-800"
                  >
                    <option value="Cardiology">Cardiology</option>
                    <option value="Neurology">Neurology</option>
                    <option value="Internal Medicine">Internal Medicine</option>
                    <option value="Emergency Medicine">Emergency Medicine</option>
                    <option value="Pediatrics">Pediatrics</option>
                    <option value="Orthopedics">Orthopedics</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">License Number *</label>
                  <input
                    type="text"
                    value={doctorForm.licenseNumber}
                    onChange={(e) => setDoctorForm({ ...doctorForm, licenseNumber: e.target.value })}
                    placeholder="DOC-001"
                    className="w-full px-3 py-2 rounded-xl border text-sm bg-white dark:bg-slate-800"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">Phone</label>
                  <input
                    type="tel"
                    value={doctorForm.phoneNumber}
                    onChange={(e) => setDoctorForm({ ...doctorForm, phoneNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border text-sm bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">Password *</label>
                  <input
                    type="password"
                    value={doctorForm.password}
                    onChange={(e) => setDoctorForm({ ...doctorForm, password: e.target.value })}
                    placeholder="Min 6 chars"
                    className="w-full px-3 py-2 rounded-xl border text-sm bg-white dark:bg-slate-800"
                    required
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddDoctorModal(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs"
                >
                  Confirm Appointment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: RESTOCK INVENTORY ================= */}
      {showRestockModal && restockItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-sm w-full p-6">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Restock {restockItem.itemName}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Current stock: {restockItem.stockQuantity} {restockItem.unit}. SKU: {restockItem.sku}.
            </p>

            <form onSubmit={handleRestock} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Quantity to Add ({restockItem.unit})
                </label>
                <input
                  type="number"
                  min="1"
                  value={restockQty}
                  onChange={(e) => setRestockQty(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-sm bg-white dark:bg-slate-800"
                  required
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRestockModal(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 shadow-xs"
                >
                  Confirm Restock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD NEW MEDICINE ================= */}
      {showAddMedicineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">Register New Medicinal Item</h3>
                <p className="text-xs text-slate-500">Add a new pharmaceutical product, dosage, or medical supply to formulary.</p>
              </div>
              <button onClick={() => setShowAddMedicineModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMedicine} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Item / Medicine Name *
                </label>
                <input
                  type="text"
                  value={medicineForm.itemName}
                  onChange={(e) => setMedicineForm({ ...medicineForm, itemName: e.target.value })}
                  placeholder="e.g. Ciprofloxacin 500mg, Normal Saline 500ml"
                  className="w-full px-3 py-2 rounded-xl border text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Therapeutic Category
                  </label>
                  <select
                    value={medicineForm.category}
                    onChange={(e) => setMedicineForm({ ...medicineForm, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  >
                    <option value="antibiotics">Antibiotics</option>
                    <option value="analgesics">Analgesics & Pain</option>
                    <option value="cardiovascular">Cardiovascular</option>
                    <option value="diabetes">Diabetes & Endocrine</option>
                    <option value="respiratory">Respiratory</option>
                    <option value="emergency">Emergency / Critical</option>
                    <option value="supplies">Surgical & Medical Supplies</option>
                    <option value="vaccines">Vaccines & Biologicals</option>
                    <option value="other">Other Formulary</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Dispensing Unit
                  </label>
                  <select
                    value={medicineForm.unit}
                    onChange={(e) => setMedicineForm({ ...medicineForm, unit: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  >
                    <option value="tablets">Tablets</option>
                    <option value="capsules">Capsules</option>
                    <option value="vials">Vials (IV/IM)</option>
                    <option value="ampoules">Ampoules</option>
                    <option value="bottles">Bottles / Syrup</option>
                    <option value="boxes">Boxes / Packs</option>
                    <option value="strips">Strips</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Initial Stock *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={medicineForm.stockQuantity}
                    onChange={(e) => setMedicineForm({ ...medicineForm, stockQuantity: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Unit Price ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={medicineForm.unitPrice}
                    onChange={(e) => setMedicineForm({ ...medicineForm, unitPrice: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Reorder Alert
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={medicineForm.reorderThreshold}
                    onChange={(e) => setMedicineForm({ ...medicineForm, reorderThreshold: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    SKU / Barcode (optional)
                  </label>
                  <input
                    type="text"
                    value={medicineForm.sku}
                    onChange={(e) => setMedicineForm({ ...medicineForm, sku: e.target.value })}
                    placeholder="Auto-generated if blank"
                    className="w-full px-3 py-2 rounded-xl border text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Manufacturer
                  </label>
                  <input
                    type="text"
                    value={medicineForm.manufacturer}
                    onChange={(e) => setMedicineForm({ ...medicineForm, manufacturer: e.target.value })}
                    placeholder="e.g. Pfizer, Novartis, Generic"
                    className="w-full px-3 py-2 rounded-xl border text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Expiry Date (optional)
                </label>
                <input
                  type="date"
                  value={medicineForm.expiryDate}
                  onChange={(e) => setMedicineForm({ ...medicineForm, expiryDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddMedicineModal(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 shadow-xs"
                >
                  Save & Add to Formulary
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADMIT PATIENT TO BED ================= */}
      {showAdmitModal && selectedBedForAdmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Admit Patient to Bed {selectedBedForAdmission.bedNumber}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedBedForAdmission.wardType.toUpperCase()} Ward · Floor {selectedBedForAdmission.floor}
                </p>
              </div>
              <button onClick={() => setShowAdmitModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdmitBed} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Select Registered Patient *
                </label>
                <select
                  value={admitPatientId}
                  onChange={(e) => setAdmitPatientId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  required
                >
                  <option value="">-- Choose Patient --</option>
                  {patients.map((p) => (
                    <option key={p._id || p.email} value={p._id || p.email}>
                      {p.name || `${p.firstName} ${p.lastName}`} ({p.bloodGroup || 'O+'}) - {p.email}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdmitModal(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 shadow-xs"
                >
                  Confirm Bed Admission
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}