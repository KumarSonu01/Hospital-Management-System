import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar,
  Clock,
  FileText,
  User,
  Users,
  ChevronDown,
  Home,
  UserCircle,
  Hospital,
  Stethoscope,
  Activity,
  Bell
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

import { API_BASE_URL as API } from '../config';

function layerBadge(layer) {
  if (layer === 'edge') return { text: 'Edge', className: 'bg-red-100 text-red-800' };
  if (layer === 'fog') return { text: 'Fog', className: 'bg-amber-100 text-amber-900' };
  return { text: 'Cloud', className: 'bg-slate-100 text-slate-800' };
}

const Button = ({ children, variant = 'primary', className = '', ...props }) => (
  <button
    className={`inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
      variant === 'primary'
        ? 'text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
        : variant === 'outline'
        ? 'text-blue-600 border-blue-600 hover:bg-blue-50 focus:ring-blue-500'
        : 'text-blue-600 border-blue-600 hover:bg-blue-50 focus:ring-blue-500'
    } ${className}`}
    {...props}
  >
    {children}
  </button>
);

const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-lg shadow-md ${className}`}>
    {children}
  </div>
);

const CardHeader = ({ children, icon: Icon }) => (
  <div className="px-4 py-5 border-b border-gray-200 sm:px-6 flex items-center justify-between">
    {children}
    {Icon && <Icon className="h-5 w-5 text-blue-600 ml-2" />}
  </div>
);

const CardTitle = ({ children }) => (
  <h3 className="text-lg leading-6 font-medium text-gray-900">{children}</h3>
);

const CardContent = ({ children }) => (
  <div className="px-4 py-5 sm:p-6">{children}</div>
);

const CardFooter = ({ children }) => (
  <div className="px-4 py-4 sm:px-6">{children}</div>
);

const Input = ({ ...props }) => (
  <input
    className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md px-1 h-6"
    {...props}
  />
);

const Label = ({ children, htmlFor }) => (
  <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700">
    {children}
  </label>
);

const Select = ({ children, ...props }) => (
  <select
    className="mt-1 block w-full pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
    {...props}
  >
    {children}
  </select>
);

export default function DoctorDashboard() {
  const [showAppointments, setShowAppointments] = useState(false);
  const [showPatients, setShowPatients] = useState(false);
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [isEditing, setIsEditing] = useState(false);
  const [doctorInfo, setDoctorInfo] = useState(null);
  const [editedInfo, setEditedInfo] = useState(null);
  const [patients, setPatients] = useState([]);
  const [appointmentData, setAppointmentData] = useState({
    patientId: '',
    date: '',
    time: '',
    reason: '',
    prescriptionId: '',
    medication: '',
    dosage: '',
    frequency: ''
  });
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedAction, setSelectedAction] = useState('');
  const [existingPrescriptions, setExistingPrescriptions] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [vitalsPatientId, setVitalsPatientId] = useState('');
  const [vitalsSeries, setVitalsSeries] = useState([]);
  const vitalsPatientRef = useRef('');
  const navigate = useNavigate();

  useEffect(() => {
    vitalsPatientRef.current = vitalsPatientId;
  }, [vitalsPatientId]);

  useEffect(() => {
    fetchDoctorProfile();
    fetchPatientsWithAppointments();
    fetchAppointments();
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const response = await fetch(`${API}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchVitalsForPatient = async (patientId) => {
    if (!patientId) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/api/vitals/patient/${patientId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        const series = (data.series || []).map((row, i) => ({
          ...row,
          label: i
        }));
        setVitalsSeries(series);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    let payload;
    try {
      payload = JSON.parse(atob(token.split('.')[1]));
    } catch {
      return;
    }
    const socket = io(API, { transports: ['websocket', 'polling'] });
    socket.emit('join', payload.id);
    socket.on('notification', (n) => {
      setNotifications((prev) => [n, ...prev].slice(0, 50));
    });
    socket.on('vitals:update', () => {
      const id = vitalsPatientRef.current;
      if (id) {
        fetchVitalsForPatient(id);
      }
    });
    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    if (appointmentData.patientId) {
      fetchExistingPrescriptions(appointmentData.patientId);
    }
  }, [appointmentData.patientId]);

  const fetchExistingPrescriptions = async (patientId) => {
    if (!patientId) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/api/doctor/prescriptions/${patientId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const prescriptions = await response.json();
        setExistingPrescriptions(prescriptions);
      } else {
        console.error('Failed to fetch existing prescriptions');
        setExistingPrescriptions([]);
      }
    } catch (error) {
      console.error('Error fetching existing prescriptions:', error);
      setExistingPrescriptions([]);
    }
  };

  const fetchDoctorProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }
      const response = await fetch(`${API}/api/doctor/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setDoctorInfo(data);
        setEditedInfo(data);
      } else {
        console.error('Failed to fetch doctor profile');
      }
    } catch (error) {
      console.error('Error fetching doctor profile:', error);
    }
  };

  const fetchPatientsWithAppointments = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }
      const response = await fetch(`${API}/api/doctor/patients-with-appointments`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        console.log('Patients with appointments:', data); // Add this line for debugging
        setPatients(data);
      } else {
        console.error('Failed to fetch patients with appointments');
      }
    } catch (error) {
      console.error('Error fetching patients with appointments:', error);
    }
  };

  const fetchAppointments = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }
      const response = await fetch(`${API}/api/doctor/appointments`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        const sortKey = (a) => {
          const d = new Date(a.date).getTime();
          if (a.time === 'ASAP' || !a.time) return d;
          const combined = new Date(`${new Date(a.date).toDateString()} ${a.time}`);
          const t = combined.getTime();
          return Number.isNaN(t) ? d : t;
        };
        const sortedAppointments = [...data].sort((a, b) => sortKey(a) - sortKey(b));
        setAppointments(sortedAppointments);
      } else {
        console.error('Failed to fetch appointments');
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
    }
  };

  const renderDashboard = () => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader icon={Calendar}>
            <CardTitle className="text-sm font-medium">Today's Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {appointments.length}
            </div>
            {appointments.length > 0 ? (
              <p className="text-xs text-gray-500">
                Next:{' '}
                {appointments[0].patientId?.firstName ?? 'Patient'}{' '}
                {appointments[0].patientId?.lastName ?? ''} at {appointments[0].time}
              </p>
            ) : (
              <p className="text-xs text-gray-500">
                No appointments today
              </p>
            )}
          </CardContent>
          <CardFooter className="p-2">
            <Button 
              variant="ghost" 
              className="w-full text-sm text-gray-500 hover:text-gray-900 transition-colors"
              onClick={() => setShowAppointments(!showAppointments)}
            >
              {showAppointments ? "Hide" : "View"} Today's Appointments
              <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${showAppointments ? "rotate-180" : ""}`} />
            </Button>
          </CardFooter>
          {showAppointments && (
            <div className="px-4 pb-4">
              {appointments.length > 0 ? (
                appointments.map((appointment, index) => {
                  const b = layerBadge(appointment.computingLayer || 'cloud');
                  return (
                  <div key={index} className="flex justify-between items-center py-2 border-t gap-2">
                    <div>
                      <p className="text-sm font-medium">
                        {appointment.patientId?.firstName ?? 'Unknown'}{' '}
                        {appointment.patientId?.lastName ?? 'patient'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(appointment.disease || '—')} · {(appointment.conditionType || 'normal')}
                      </p>
                      <p className="text-xs text-gray-500">
                        {appointment.reason}
                      </p>
                      <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded ${b.className}`}>{b.text}</span>
                    </div>
                    <p className="text-sm">{appointment.time}</p>
                  </div>
                  );
                })
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">
                  No appointments scheduled for today
                </p>
              )}
            </div>
          )}
        </Card>
        <Card>
          <CardHeader icon={Users}>
            <CardTitle className="text-sm font-medium">Patients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{patients.length}</div>
            <p className="text-xs text-gray-500">Total patients under care</p>
          </CardContent>
          <CardFooter className="p-2">
            <Button 
              variant="ghost" 
              className="w-full text-sm text-gray-500 hover:text-gray-900 transition-colors"
              onClick={() => setShowPatients(!showPatients)}
            >
              {showPatients ? "Hide" : "View All"} Patients
              <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${showPatients ? "rotate-180" : ""}`} />
            </Button>
          </CardFooter>
          {showPatients && (
            <div className="px-4 pb-4">
              {patients.map((patient, index) => (
                <div key={index} className="py-2 border-t">
                  <p className="text-sm font-medium">
                    {patient.firstName} {patient.lastName}
                  </p>
                  <p className="text-xs text-gray-500">
                    Last visit: {patient.lastVisit ? new Date(patient.lastVisit).toLocaleDateString('en-GB') : 'N/A'} | Next: {patient.nextAppointment ? new Date(patient.nextAppointment).toLocaleDateString('en-GB') : 'N/A'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span>Completed appointment with John Doe</span>
              </li>
              <li className="flex items-center space-x-2">
                <FileText className="h-4 w-4 text-blue-600" />
                <span>Updated medical records for Alice Johnson</span>
              </li>
              <li className="flex items-center space-x-2">
                <User className="h-4 w-4 text-blue-600" />
                <span>New patient registered: David Lee</span>
              </li>
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-blue-600" />
                <span>Staff meeting - Tomorrow, 9:00 AM</span>
              </li>
              <li className="flex items-center space-x-2">
                <Stethoscope className="h-4 w-4 text-blue-600" />
                <span>Cardiology conference - 20th May</span>
              </li>
              <li className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span>On-call duty - 22nd May</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  );

  const renderProfile = () => {
    const handleInputChange = (e) => {
      const { name, value } = e.target;
      setEditedInfo(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API}/api/doctor/profile`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(editedInfo)
        });
        if (response.ok) {
          const updatedProfile = await response.json();
          setDoctorInfo(updatedProfile);
          setIsEditing(false);
        } else {
          const errorData = await response.json();
          alert(`Failed to update doctor profile: ${errorData.error}`);
        }
      } catch (error) {
        alert('Error updating doctor profile. Please try again.');
      }
    };

    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Doctor Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  value={isEditing ? editedInfo.firstName : doctorInfo?.firstName}
                  onChange={handleInputChange}
                  readOnly={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  value={isEditing ? editedInfo.lastName : doctorInfo?.lastName}
                  onChange={handleInputChange}
                  readOnly={!isEditing}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={isEditing ? editedInfo.email : doctorInfo?.email}
                onChange={handleInputChange}
                readOnly={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="specialty">Specialty</Label>
              <Input
                id="specialty"
                name="specialty"
                value={isEditing ? editedInfo.specialty : doctorInfo?.specialty}
                onChange={handleInputChange}
                readOnly={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="licenseNumber">License Number</Label>
              <Input
                id="licenseNumber"
                name="licenseNumber"
                value={isEditing ? editedInfo.licenseNumber : doctorInfo?.licenseNumber}
                onChange={handleInputChange}
                readOnly={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input
                id="phoneNumber"
                name="phoneNumber"
                value={isEditing ? editedInfo.phoneNumber : doctorInfo?.phoneNumber}
                onChange={handleInputChange}
                readOnly={!isEditing}
              />
            </div>
          </form>
        </CardContent>
        <CardFooter>
          {isEditing ? (
            <>
              <Button onClick={handleSave} className="mr-2">Save</Button>
              <Button onClick={() => setIsEditing(false)} variant="outline">Cancel</Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)} className="ml-auto">Edit Profile</Button>
          )}
        </CardFooter>
      </Card>
    );
  };

  const renderPatientManagement = () => {
    const handleInputChange = (e) => {
      const { name, value } = e.target;
      setAppointmentData(prev => ({ ...prev, [name]: value }));

      if (name === 'action') {
        setSelectedAction(value);
      }

      if (name === 'patientId') {
        fetchExistingPrescriptions(value);
      }

      if (name === 'date' || name === 'patientId') {
        fetchAvailableSlots(appointmentData.patientId, value);
      }
    };

    const fetchAvailableSlots = async (patientId, date) => {
      if (!patientId || !date) return;
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API}/api/doctor/available-slots?patientId=${patientId}&date=${date}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const slots = await response.json();
          setAvailableSlots(slots);
        } else {
          console.error('Failed to fetch available slots');
          setAvailableSlots([]);
        }
      } catch (error) {
        console.error('Error fetching available slots:', error);
        setAvailableSlots([]);
      }
    };

    const handleEditPrescription = (prescription) => {
      setAppointmentData({
        ...appointmentData,
        prescriptionId: prescription._id,
        medication: prescription.medication || '',
        dosage: prescription.dosage || '',
        frequency: prescription.frequency || ''
      });
      setSelectedAction('prescribe-medication');
    };

    const handleDeletePrescription = async (prescriptionId) => {
      if (window.confirm('Are you sure you want to delete this prescription?')) {
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(`${API}/api/doctor/prescriptions/${prescriptionId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (response.ok) {
            alert('Prescription deleted successfully');
            fetchExistingPrescriptions(appointmentData.patientId);
          } else {
            const errorData = await response.json();
            alert(`Failed to delete prescription: ${errorData.error}`);
            console.error('Error details:', errorData.details);
          }
        } catch (error) {
          alert('Error deleting prescription. Please try again.');
          console.error('Error deleting prescription:', error);
        }
      }
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      if (selectedAction === 'prescribe-medication') {
        try {
          const token = localStorage.getItem('token');
          const url = appointmentData.prescriptionId
            ? `${API}/api/doctor/prescriptions/${appointmentData.prescriptionId}`
            : `${API}/api/doctor/prescribe-medication`;
          const method = appointmentData.prescriptionId ? 'PUT' : 'POST';
          const response = await fetch(url, {
            method,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              patientId: appointmentData.patientId,
              medication: appointmentData.medication,
              dosage: appointmentData.dosage,
              frequency: appointmentData.frequency
            })
          });
          if (response.ok) {
            const result = await response.json();
            alert(appointmentData.prescriptionId ? 'Medication updated successfully' : 'Medication prescribed successfully');
            setAppointmentData({
              ...appointmentData,
              prescriptionId: '',
              medication: '',
              dosage: '',
              frequency: ''
            });
            fetchExistingPrescriptions(appointmentData.patientId);
            setSelectedAction('');
          } else {
            const errorData = await response.json();
            alert(`Failed to ${appointmentData.prescriptionId ? 'update' : 'prescribe'} medication: ${errorData.error}`);
          }
        } catch (error) {
          alert(`Error ${appointmentData.prescriptionId ? 'updating' : 'prescribing'} medication. Please try again.`);
        }
      } else if (selectedAction === 'schedule-appointment') {
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(`${API}/api/doctor/schedule-appointment`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              patientId: appointmentData.patientId,
              date: appointmentData.date,
              time: appointmentData.time,
              reason: appointmentData.reason
            })
          });
          if (response.ok) {
            alert('Appointment scheduled successfully');
            setAppointmentData({
              patientId: '',
              date: '',
              time: '',
              reason: '',
              prescriptionId: '',
              medication: '',
              dosage: '',
              frequency: ''
            });
            setSelectedAction('');
          } else {
            const errorData = await response.json();
            alert(`Failed to schedule appointment: ${errorData.error}`);
          }
        } catch (error) {
          alert('Error scheduling appointment. Please try again.');
        }
      }
    };

    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Patient Management</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="patient">Select Patient</Label>
              <Select id="patient" name="patientId" value={appointmentData.patientId} onChange={handleInputChange}>
                <option value="">Choose a patient</option>
                {patients.map((patient) => (
                  <option key={patient._id} value={patient._id}>
                    {patient.firstName} {patient.lastName}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="action">Action</Label>
              <Select id="action" name="action" value={selectedAction} onChange={handleInputChange}>
                <option value="">Choose an action</option>
                <option value="schedule-appointment">Schedule Appointment</option>
                <option value="prescribe-medication">Prescribe Medication</option>
              </Select>
            </div>
            {selectedAction === 'schedule-appointment' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="date">Appointment Date</Label>
                  <Input id="date" name="date" type="date" value={appointmentData.date} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Preferred Time</Label>
                  <Select id="time" name="time" value={appointmentData.time} onChange={handleInputChange} disabled={availableSlots.length === 0}>
                    <option value="">Choose a time slot</option>
                    {availableSlots.map((slot) => (
                      <option key={slot} value={slot}>{slot}</option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reason">Reason for Visit</Label>
                  <Input id="reason" name="reason" value={appointmentData.reason} onChange={handleInputChange} placeholder="Brief description of your concern" />
                </div>
              </>
            )}
            {selectedAction === 'prescribe-medication' && (
              <>
                {existingPrescriptions.length > 0 && (
                  <div className="space-y-2 mb-4">
                    <Label>Existing Prescriptions</Label>
                    {existingPrescriptions.map((prescription) => (
                      <div key={prescription._id} className="flex items-center justify-between bg-gray-100 p-2 rounded">
                        <span>{prescription.medication} - {prescription.dosage} - {prescription.frequency}</span>
                        <div>
                          <Button type="button" onClick={() => handleEditPrescription(prescription)} variant="outline" size="sm" className="mr-2">Edit</Button>
                          <Button onClick={() => handleDeletePrescription(prescription._id)} variant="outline" size="sm">Delete</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="medication">Medication</Label>
                  <Input id="medication" name="medication" value={appointmentData.medication || ''} onChange={handleInputChange} placeholder="Medication name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dosage">Dosage</Label>
                  <Input id="dosage" name="dosage" value={appointmentData.dosage || ''} onChange={handleInputChange} placeholder="Dosage" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="frequency">Frequency</Label>
                  <Input id="frequency" name="frequency" value={appointmentData.frequency || ''} onChange={handleInputChange} placeholder="Frequency" />
                </div>
              </>
            )}
            <Button type="submit" className="ml-auto">
              {selectedAction === 'prescribe-medication' ? (appointmentData.prescriptionId ? 'Update Prescription' : 'Prescribe Medication') : 'Schedule Appointment'}
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  };

  const renderLiveVitals = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-1">
        <CardHeader icon={Bell}>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 max-h-72 overflow-y-auto">
            {notifications.length === 0 && (
              <li className="text-sm text-gray-500">No notifications yet.</li>
            )}
            {notifications.map((n) => (
              <li
                key={n._id || n.title + (n.createdAt || '')}
                className={`text-sm p-2 rounded ${
                  n.type === 'emergency' ? 'bg-red-50 border border-red-200' : 'bg-gray-50'
                }`}
              >
                <p className="font-medium">{n.title}</p>
                <p className="text-gray-600">{n.message}</p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <Card className="lg:col-span-2">
        <CardHeader icon={Activity}>
          <CardTitle>Patient vitals (edge → fog → cloud)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 mb-4">
            <Label>Patient</Label>
            <Select
              value={vitalsPatientId}
              onChange={(e) => {
                const id = e.target.value;
                setVitalsPatientId(id);
                fetchVitalsForPatient(id);
              }}
            >
              <option value="">Select a patient you have seen</option>
              {patients.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.firstName} {p.lastName}
                </option>
              ))}
            </Select>
          </div>
          {vitalsSeries.length > 0 ? (
            <div className="space-y-6">
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={vitalsSeries}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis domain={['dataMin - 5', 'dataMax + 5']} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="heartRate" name="Heart rate (bpm)" stroke="#2563eb" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={vitalsSeries}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis domain={['dataMin - 0.5', 'dataMax + 0.5']} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="temperature" name="Temperature (°C)" stroke="#dc2626" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              No vitals stored for this patient. Start the edge simulator pointed at this patient&apos;s ID (see project
              README).
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-blue-600">
      <header className="bg-white p-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Hospital className="h-6 w-6 text-blue-600" />
          <span className="font-bold text-xl">Hospital Management System</span>
          <span className="text-xs font-semibold uppercase text-blue-800 bg-blue-100 px-2 py-1 rounded">Doctor</span>
        </div>
        <div className="flex items-center gap-3">
          {notifications.filter((n) => !n.read).length > 0 && (
            <span className="text-sm text-gray-700">
              {notifications.filter((n) => !n.read).length} unread
            </span>
          )}
          <Button variant="outline" onClick={() => navigate('/')}>Sign Out</Button>
        </div>
      </header>
      <nav className="bg-blue-700 text-white p-4">
        <ul className="flex space-x-4 justify-center">
          <li>
            <Button
              variant={activeTab === 'Dashboard' ? "outline" : "ghost"}
              className={`hover:bg-white hover:text-blue-600 ${activeTab === 'Dashboard' ? 'bg-white text-blue-600' : 'text-white'}`}
              onClick={() => setActiveTab('Dashboard')}
            >
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </li>
          <li>
            <Button
              variant={activeTab === 'Live Vitals' ? 'outline' : 'ghost'}
              className={`hover:bg-white hover:text-blue-600 ${activeTab === 'Live Vitals' ? 'bg-white text-blue-600' : 'text-white'}`}
              onClick={() => setActiveTab('Live Vitals')}
            >
              <Activity className="w-4 h-4 mr-2" />
              Live Vitals
            </Button>
          </li>
          <li>
            <Button
              variant={activeTab === 'Profile' ? "outline" : "ghost"}
              className={`hover:bg-white hover:text-blue-600 ${activeTab === 'Profile' ? 'bg-white text-blue-600' : 'text-white'}`}
              onClick={() => setActiveTab('Profile')}
            >
              <UserCircle className="w-4 h-4 mr-2" />
              Profile
            </Button>
          </li>
          <li>
            <Button
              variant={activeTab === 'Patient Management' ? "outline" : "ghost"}
              className={`hover:bg-white hover:text-blue-600 ${activeTab === 'Patient Management' ? 'bg-white text-blue-600' : 'text-white'}`}
              onClick={() => setActiveTab('Patient Management')}
            >
              <Users className="w-4 h-4 mr-2" />
              Patient Management
            </Button>
          </li>
        </ul>
      </nav>
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-white mb-8">Welcome, Dr. {doctorInfo?.firstName} {doctorInfo?.lastName}</h1>
        {activeTab === 'Dashboard' && renderDashboard()}
        {activeTab === 'Live Vitals' && renderLiveVitals()}
        {activeTab === 'Profile' && renderProfile()}
        {activeTab === 'Patient Management' && renderPatientManagement()}
      </main>
    </div>
  );
}