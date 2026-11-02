import React, { useState, useEffect } from 'react';
import {
  Bed,
  Pill,
  CreditCard,
  Plus,
  RefreshCw,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { API_BASE_URL } from '../config';

export default function StaffDashboard() {
  const { user, token } = useAuth();
  const { success, error: toastError } = useToast();

  const [activeTab, setActiveTab] = useState('beds'); // 'beds', 'pharmacy', 'billing'
  const [beds, setBeds] = useState([]);
  const [patients, setPatients] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Admission Modal
  const [selectedBed, setSelectedBed] = useState(null);
  const [admitPatientId, setAdmitPatientId] = useState('');
  const [admitModal, setAdmitModal] = useState(false);

  // Add Medicine Modal
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

  // New Invoice Modal
  const [newInvoiceModal, setNewInvoiceModal] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({
    patientId: '',
    items: [{ description: 'General Nursing & Bed Charge', unitPrice: 75, quantity: 1 }],
    tax: 0,
    discount: 0
  });

  useEffect(() => {
    fetchStaffData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchStaffData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };

      const [bedsRes, invRes, invsRes, patsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/wards`, { headers }).catch(() => null),
        fetch(`${API_BASE_URL}/api/pharmacy`, { headers }).catch(() => null),
        fetch(`${API_BASE_URL}/api/billing`, { headers }).catch(() => null),
        fetch(`${API_BASE_URL}/api/admin/patient-overview`, { headers }).catch(() => null)
      ]);

      if (bedsRes && bedsRes.ok) {
        const d = await bedsRes.json();
        setBeds(d.beds || []);
      }
      if (invRes && invRes.ok) {
        const d = await invRes.json();
        setInventory(d.items || []);
      }
      if (invsRes && invsRes.ok) {
        const d = await invsRes.json();
        setInvoices(d.invoices || []);
      }
      if (patsRes && patsRes.ok) {
        const d = await patsRes.json();
        setPatients(d.patientOverview || []);
      }
    } catch {
      toastError('Error connecting to staff operations.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdmit = async (e) => {
    e.preventDefault();
    if (!selectedBed || !admitPatientId) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/wards/${selectedBed._id}/admit`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ patientId: admitPatientId })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        success(`Patient admitted to Bed ${selectedBed.bedNumber}`, 'Admission Recorded');
        setAdmitModal(false);
        fetchStaffData();
      } else {
        toastError(data.error || 'Failed to admit patient.');
      }
    } catch {
      toastError('Network error during admission.');
    }
  };

  const handleDischarge = async (bed) => {
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
        success(`Bed ${bed.bedNumber} cleared for sanitation. Patient discharged.`, 'Discharge Successful');
        fetchStaffData();
      } else {
        toastError(data.error || 'Failed to discharge patient.');
      }
    } catch {
      toastError('Network error discharging patient.');
    }
  };

  const handleMarkBedSanitized = async (bed) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/wards/${bed._id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'available' })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        success(`Bed ${bed.bedNumber} is sanitized and marked available.`, 'Bed Ready');
        fetchStaffData();
      } else {
        toastError(data.error || 'Failed to update bed status.');
      }
    } catch {
      toastError('Network error updating bed status.');
    }
  };

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
        success(`Added "${data.item.itemName}" (${data.item.sku}) to pharmacy inventory.`, 'Medication Added');
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
        fetchStaffData();
      } else {
        toastError(data.error || 'Failed to add medication.');
      }
    } catch {
      toastError('Network error adding medication.');
    }
  };

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    if (!invoiceForm.patientId) {
      toastError('Please select a patient.');
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/billing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(invoiceForm)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        success(`Invoice ${data.invoice?.invoiceNumber} generated!`, 'Invoice Issued');
        setNewInvoiceModal(false);
        fetchStaffData();
      } else {
        toastError(data.error || 'Failed to generate invoice.');
      }
    } catch {
      toastError('Error issuing invoice.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans pb-16">
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-6 px-4 sm:px-6 lg:px-8 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                Clinical Staff Desk ({user?.role?.toUpperCase()})
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 dark:text-white mt-1">
              Operations & Admissions Desk
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Manage patient admissions, pharmacy inventory dispensing, and service invoices.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setNewInvoiceModal(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Issue Invoice</span>
            </button>
            <button
              onClick={fetchStaffData}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Tab Strip */}
        <div className="max-w-7xl mx-auto mt-6 flex overflow-x-auto gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
          {[
            { id: 'beds', label: `Ward & Bed Tracking (${beds.length})`, icon: Bed },
            { id: 'pharmacy', label: `Pharmacy Stock (${inventory.length})`, icon: Pill },
            { id: 'billing', label: `Billing Desk (${invoices.length})`, icon: CreditCard }
          ].map((tab) => {
            const IconComp = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
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
        {/* ================= TAB 1: BEDS MANAGEMENT ================= */}
        {activeTab === 'beds' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-4">
            <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">Inpatient Ward Bed Controls</h3>
            <p className="text-xs text-slate-500 mb-4">Admit incoming patients, assign bed locations, or discharge for sanitation.</p>

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
                        b.status === 'occupied' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {b.status}
                    </span>
                  </div>
                  <p className="text-xs font-semibold uppercase text-slate-500 mt-2">
                    {b.wardType} Ward · Floor {b.floor}
                  </p>
                  <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 min-h-[32px]">
                    {b.currentPatientId
                      ? `Patient: ${b.currentPatientId.firstName} ${b.currentPatientId.lastName}`
                      : 'Vacant & Clean'}
                  </p>

                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
                    {b.status === 'available' ? (
                      <button
                        onClick={() => {
                          setSelectedBed(b);
                          setAdmitModal(true);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs"
                      >
                        Admit Patient
                      </button>
                    ) : b.status === 'occupied' ? (
                      <button
                        onClick={() => handleDischarge(b)}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs"
                      >
                        Discharge
                      </button>
                    ) : (
                      <button
                        onClick={() => handleMarkBedSanitized(b)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
                      >
                        Mark Ready
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= TAB 2: PHARMACY INVENTORY ================= */}
        {activeTab === 'pharmacy' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">Pharmacy Dispensary Inventory</h3>
                <p className="text-xs text-slate-500">Live pharmaceutical formulary & stock reserves</p>
              </div>
              <button
                onClick={() => setShowAddMedicineModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-xs font-semibold text-white shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add New Medicine</span>
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800 text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 text-xs uppercase font-semibold">
                  <tr>
                    <th className="px-6 py-3.5">Medication</th>
                    <th className="px-6 py-3.5">SKU</th>
                    <th className="px-6 py-3.5">Category</th>
                    <th className="px-6 py-3.5">Stock</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {inventory.map((item) => (
                    <tr key={item._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">{item.itemName}</td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-500">{item.sku}</td>
                      <td className="px-6 py-4 text-xs capitalize text-slate-600">{item.category}</td>
                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{item.stockQuantity} {item.unit}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${item.stockQuantity <= item.reorderThreshold ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                          {item.stockQuantity <= item.reorderThreshold ? 'LOW STOCK' : 'IN STOCK'}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-xs text-slate-900 dark:text-white">${item.unitPrice?.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= TAB 3: BILLING INVOICES ================= */}
        {activeTab === 'billing' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-4">
            <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">Accounts & Invoices Desk</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800 text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 text-xs uppercase font-semibold">
                  <tr>
                    <th className="px-6 py-3.5">Invoice #</th>
                    <th className="px-6 py-3.5">Patient</th>
                    <th className="px-6 py-3.5">Total</th>
                    <th className="px-6 py-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {invoices.map((inv) => (
                    <tr key={inv._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="px-6 py-4 font-mono font-medium text-slate-900 dark:text-white">{inv.invoiceNumber}</td>
                      <td className="px-6 py-4 font-semibold">{inv.patientId?.firstName} {inv.patientId?.lastName}</td>
                      <td className="px-6 py-4 font-bold">${inv.total?.toFixed(2)}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${inv.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                          {inv.status?.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ADMISSION MODAL */}
      {admitModal && selectedBed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-sm w-full p-6">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Admit Patient to Bed {selectedBed.bedNumber}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Ward: {selectedBed.wardType.toUpperCase()} · Floor {selectedBed.floor}
            </p>

            <form onSubmit={handleAdmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Select Patient
                </label>
                <select
                  value={admitPatientId}
                  onChange={(e) => setAdmitPatientId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-sm bg-white dark:bg-slate-800"
                  required
                >
                  <option value="">Choose Patient</option>
                  {patients.map((p, idx) => (
                    <option key={idx} value={p._id}>
                      {p.name} ({p.phoneNumber || p.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAdmitModal(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs"
                >
                  Confirm Admission
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NEW INVOICE MODAL */}
      {newInvoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-md w-full p-6">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Issue Hospital Invoice</h3>
            <form onSubmit={handleCreateInvoice} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">Select Patient *</label>
                <select
                  value={invoiceForm.patientId}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, patientId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border text-sm bg-white dark:bg-slate-800"
                  required
                >
                  <option value="">Choose Patient</option>
                  {patients.map((p, idx) => (
                    <option key={idx} value={p._id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">Service Description *</label>
                <input
                  type="text"
                  value={invoiceForm.items[0].description}
                  onChange={(e) => {
                    const items = [...invoiceForm.items];
                    items[0].description = e.target.value;
                    setInvoiceForm({ ...invoiceForm, items });
                  }}
                  className="w-full px-3 py-2 rounded-xl border text-sm bg-white dark:bg-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">Charge Amount ($) *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={invoiceForm.items[0].unitPrice}
                  onChange={(e) => {
                    const items = [...invoiceForm.items];
                    items[0].unitPrice = Number(e.target.value);
                    setInvoiceForm({ ...invoiceForm, items });
                  }}
                  className="w-full px-3 py-2 rounded-xl border text-sm bg-white dark:bg-slate-800"
                  required
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setNewInvoiceModal(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs"
                >
                  Generate Invoice
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
    </div>
  );
}
