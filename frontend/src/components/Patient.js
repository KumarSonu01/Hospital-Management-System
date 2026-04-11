import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Clock, FileText, User, Users, ChevronDown, Home, UserCircle, Calendar as CalendarIcon, Hospital, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';

import { API_BASE_URL as API } from '../config';

function layerBadge(layer) {
  if (layer === 'edge') return { text: 'Edge · Instant', className: 'bg-red-100 text-red-800' };
  if (layer === 'fog') return { text: 'Fog · Priority', className: 'bg-amber-100 text-amber-900' };
  return { text: 'Cloud · Standard', className: 'bg-slate-100 text-slate-800' };
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

export default function PatientDashboard() {
  const [showAppointments, setShowAppointments] = useState(false);
  const [showPrescriptions, setShowPrescriptions] = useState(false);
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [isEditing, setIsEditing] = useState(false);
  const [patientInfo, setPatientInfo] = useState(null);
  const [editedInfo, setEditedInfo] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [appointmentData, setAppointmentData] = useState({
    doctorId: '',
    date: '',
    time: '',
    reason: '',
    conditionType: 'normal',
    disease: '',
    autoAssignDoctor: false
  });
  const [healthConditions, setHealthConditions] = useState({
    critical: [],
    moderate: [],
    normal: []
  });
  const [notifications, setNotifications] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [careTeam, setCareTeam] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const navigate = useNavigate();

  const diseaseOptions = useMemo(() => {
    const k = appointmentData.conditionType || 'normal';
    return healthConditions[k] || [];
  }, [appointmentData.conditionType, healthConditions]);

  useEffect(() => {
    fetchPatientProfile();
    fetchDoctors();
    fetchAppointments();
    fetchCareTeam();
    fetchPrescriptions();
    fetchHealthConditions();
    fetchNotifications();
  }, []);

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
    return () => socket.disconnect();
  }, []);

  const fetchHealthConditions = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const response = await fetch(`${API}/api/patient/health-conditions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setHealthConditions(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

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

  const fetchPatientProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }
      const response = await fetch(`${API}/api/patient/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setPatientInfo(data);
        setEditedInfo(data);
      } else {
        console.error('Failed to fetch patient profile');
      }
    } catch (error) {
      console.error('Error fetching patient profile:', error);
    }
  };

  const fetchDoctors = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }
      const response = await fetch(`${API}/api/doctor/all`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setDoctors(data);
      } else {
        console.error('Failed to fetch doctors');
      }
    } catch (error) {
      console.error('Error fetching doctors:', error);
    }
  };

  const fetchAvailableSlots = async (doctorId, date) => {
    if (!doctorId || !date) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/api/patient/available-slots?doctorId=${doctorId}&date=${date}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const slots = await response.json();
        setAvailableSlots(slots);
      } else {
        console.error('Failed to fetch available slots');
      }
    } catch (error) {
      console.error('Error fetching available slots:', error);
    }
  };

  const fetchAppointments = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }
      const response = await fetch(`${API}/api/patient/appointments`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched appointments:', data); // Add this line for debugging
        setAppointments(data);
      } else {
        console.error('Failed to fetch appointments');
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
    }
  };

  const fetchCareTeam = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }
      const response = await fetch(`${API}/api/patient/care-team`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setCareTeam(data);
      } else {
        console.error('Failed to fetch care team');
      }
    } catch (error) {
      console.error('Error fetching care team:', error);
    }
  };

  const fetchPrescriptions = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }
      const response = await fetch(`${API}/api/patient/prescriptions`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setPrescriptions(data);
      } else {
        console.error('Failed to fetch prescriptions');
      }
    } catch (error) {
      console.error('Error fetching prescriptions:', error);
    }
  };

  const renderDashboard = () => (
    <>
      {notifications.filter((n) => n.type === 'emergency' && !n.read).length > 0 && (
        <div className="mb-6 rounded-lg border border-red-300 bg-red-50 p-4 text-red-900 flex items-start gap-3">
          <AlertTriangle className="h-6 w-6 shrink-0" />
          <div>
            <p className="font-semibold">Critical alert</p>
            <p className="text-sm">
              {notifications.find((n) => n.type === 'emergency')?.message ||
                'You have unread emergency notifications.'}
            </p>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader icon={Calendar}>
            <CardTitle className="text-sm font-medium">Upcoming appointments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {appointments.length}
            </div>
            {appointments.length > 0 ? (
              <p className="text-xs text-gray-500">
                Next: Dr. {appointments[0].doctorId?.firstName ?? ''} {appointments[0].doctorId?.lastName ?? ''}{' '}
                on {new Date(appointments[0].date).toLocaleDateString()} at {appointments[0].time}
              </p>
            ) : (
              <p className="text-xs text-gray-500">
                No scheduled appointments yet
              </p>
            )}
          </CardContent>
          <CardFooter className="p-2">
            <Button 
              variant="ghost" 
              className="w-full text-sm text-gray-500 hover:text-gray-900 transition-colors"
              onClick={() => setShowAppointments(!showAppointments)}
            >
              {showAppointments ? "Hide" : "View"} appointments
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
                        Dr. {appointment.doctorId?.firstName ?? '—'} {appointment.doctorId?.lastName ?? ''}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(appointment.date).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(appointment.disease || '—')} · {(appointment.conditionType || 'normal')}
                      </p>
                      <p className="text-xs text-gray-500">
                        {appointment.reason}
                      </p>
                      <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded ${b.className}`}>
                        {b.text}
                      </span>
                    </div>
                    <p className="text-sm">{appointment.time}</p>
                  </div>
                  );
                })
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">
                  No upcoming appointments — book one in Appointment Booking
                </p>
              )}
            </div>
          )}
        </Card>
        <Card>
          <CardHeader icon={FileText}>
            <CardTitle className="text-sm font-medium">Prescriptions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{prescriptions.length}</div>
            <p className="text-xs text-gray-500">Active prescriptions</p>
          </CardContent>
          <CardFooter className="p-2">
            <Button 
              variant="ghost" 
              className="w-full text-sm text-gray-500 hover:text-gray-900 transition-colors"
              onClick={() => setShowPrescriptions(!showPrescriptions)}
            >
              {showPrescriptions ? "Hide" : "View All"} Prescriptions
              <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${showPrescriptions ? "rotate-180" : ""}`} />
            </Button>
          </CardFooter>
          {showPrescriptions && (
            <div className="px-4 pb-4">
              {prescriptions.map((prescription, index) => (
                <div key={index} className="py-2 border-t">
                  <p className="text-sm font-medium">{prescription.medication}</p>
                  <p className="text-xs text-gray-500">
                    {prescription.dosage} - {prescription.frequency}
                  </p>
                  <p className="text-xs text-gray-500">
                    Prescribed by: Dr. {prescription.doctorId.firstName} {prescription.doctorId.lastName}
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
                <span>Blood test results collected</span>
              </li>
              <li className="flex items-center space-x-2">
                <User className="h-4 w-4 text-blue-600" />
                <span>Appointment with Dr. Johnson completed</span>
              </li>
              <li className="flex items-center space-x-2">
                <FileText className="h-4 w-4 text-blue-600" />
                <span>New prescription added</span>
              </li>
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Your Care Team</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {careTeam.map((member, index) => (
                <li key={index} className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  <span>Dr. {member.firstName} {member.lastName} - {member.specialty}</span>
                </li>
              ))}
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
        const response = await fetch(`${API}/api/patient/profile`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(editedInfo)
        });
        if (response.ok) {
          const updatedProfile = await response.json();
          setPatientInfo(updatedProfile);
          setIsEditing(false);
        } else {
          const errorData = await response.json();
          alert(`Failed to update patient profile: ${errorData.error}`);
        }
      } catch (error) {
        alert('Error updating patient profile. Please try again.');
      }
    };

    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  value={isEditing ? editedInfo.firstName : patientInfo?.firstName}
                  onChange={handleInputChange}
                  readOnly={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  value={isEditing ? editedInfo.lastName : patientInfo?.lastName}
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
                value={isEditing ? editedInfo.email : patientInfo?.email}
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

  const renderAppointmentBooking = () => {
    const isCritical = appointmentData.conditionType === 'critical';
    const needsDoctorPick = !isCritical && !appointmentData.autoAssignDoctor;

    const handleInputChange = (e) => {
      const { name, value, type, checked } = e.target;
      const nextVal = type === 'checkbox' ? checked : value;
      setAppointmentData((prev) => {
        const next = { ...prev, [name]: nextVal };
        if (name === 'conditionType') {
          next.disease = '';
        }
        const critical = next.conditionType === 'critical';
        if ((name === 'date' || name === 'doctorId') && !critical) {
          const docId = name === 'doctorId' ? value : next.doctorId;
          const d = name === 'date' ? value : next.date;
          if (docId && d) {
            queueMicrotask(() => fetchAvailableSlots(docId, d));
          }
        }
        return next;
      });
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      try {
        const token = localStorage.getItem('token');
        const payload = {
          ...appointmentData,
          autoAssignDoctor: isCritical ? true : appointmentData.autoAssignDoctor
        };
        if (isCritical) {
          payload.date = new Date().toISOString();
          payload.time = 'ASAP';
        }
        const response = await fetch(`${API}/api/patient/book-appointment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
        if (response.ok) {
          await response.json();
          alert('Appointment booked successfully');
          setAppointmentData({
            doctorId: '',
            date: '',
            time: '',
            reason: '',
            conditionType: 'normal',
            disease: '',
            autoAssignDoctor: false
          });
          setAvailableSlots([]);
          fetchAppointments();
        } else {
          const errorData = await response.json();
          alert(`Failed to book appointment: ${errorData.error}`);
        }
      } catch (error) {
        alert('Error booking appointment. Please try again.');
      }
    };

    const layerHint =
      appointmentData.conditionType === 'critical'
        ? 'Edge: routed for immediate care (ASAP).'
        : appointmentData.conditionType === 'moderate'
        ? 'Fog: priority scheduling on the next available slot.'
        : 'Cloud: standard scheduling with your selected slot.';

    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Book an Appointment</CardTitle>
        </CardHeader>
        <CardContent>
          {isCritical && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900 flex gap-2">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <span>
                Critical conditions use the edge layer: the system auto-assigns a doctor and books you ASAP.
              </span>
            </div>
          )}
          <p className="text-sm text-gray-600 mb-4">{layerHint}</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="conditionType">Condition severity</Label>
              <Select
                id="conditionType"
                name="conditionType"
                value={appointmentData.conditionType}
                onChange={handleInputChange}
              >
                <option value="normal">Normal — routine</option>
                <option value="moderate">Moderate — priority</option>
                <option value="critical">Critical — emergency</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="disease">Condition / disease focus</Label>
              <Select
                id="disease"
                name="disease"
                value={appointmentData.disease}
                onChange={handleInputChange}
                required
              >
                <option value="">Select based on severity</option>
                {diseaseOptions.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </Select>
            </div>
            {!isCritical && (
              <div className="flex items-center gap-2">
                <input
                  id="autoAssignDoctor"
                  name="autoAssignDoctor"
                  type="checkbox"
                  checked={appointmentData.autoAssignDoctor}
                  onChange={handleInputChange}
                />
                <Label htmlFor="autoAssignDoctor">Auto-assign best available doctor (by specialty & load)</Label>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="doctorId">Doctor {needsDoctorPick ? '' : '(optional if auto-assign)'}</Label>
              <Select
                id="doctorId"
                name="doctorId"
                value={appointmentData.doctorId}
                onChange={handleInputChange}
                disabled={isCritical || appointmentData.autoAssignDoctor}
              >
                <option value="">{isCritical || appointmentData.autoAssignDoctor ? 'System will assign' : 'Choose a doctor'}</option>
                {doctors.map((doctor) => (
                  <option key={doctor._id} value={doctor._id}>
                    Dr. {doctor.firstName} {doctor.lastName} - {doctor.specialty}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Appointment date</Label>
              <Input
                id="date"
                name="date"
                type="date"
                value={appointmentData.date}
                onChange={handleInputChange}
                disabled={isCritical}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Preferred time</Label>
              <Select
                id="time"
                name="time"
                value={appointmentData.time}
                onChange={handleInputChange}
                disabled={isCritical || (!isCritical && availableSlots.length === 0)}
              >
                <option value="">{isCritical ? 'ASAP' : 'Choose a time slot'}</option>
                {availableSlots.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for visit</Label>
              <Input
                id="reason"
                name="reason"
                value={appointmentData.reason}
                onChange={handleInputChange}
                placeholder="Brief description of your concern"
              />
            </div>
            <Button type="submit" className="ml-auto">
              Book appointment
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-blue-600">
      <header className="bg-white p-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Hospital className="h-6 w-6 text-blue-600" />
          <span className="font-bold text-xl">Hospital Management System</span>
          <span className="text-xs font-semibold uppercase text-blue-800 bg-blue-100 px-2 py-1 rounded">Patient</span>
        </div>
        <Button variant="outline" onClick={() => navigate('/')}>Sign Out</Button>
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
              variant={activeTab === 'Appointment Booking' ? "outline" : "ghost"}
              className={`hover:bg-white hover:text-blue-600 ${activeTab === 'Appointment Booking' ? 'bg-white text-blue-600' : 'text-white'}`}
              onClick={() => setActiveTab('Appointment Booking')}

            >
              <CalendarIcon className="w-4 h-4 mr-2" />
              Appointment Booking
            </Button>
          </li>
        </ul>
      </nav>
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-white mb-8">Welcome, {patientInfo?.firstName} {patientInfo?.lastName}</h1>
        {activeTab === 'Dashboard' && renderDashboard()}
        {activeTab === 'Profile' && renderProfile()}
        {activeTab === 'Appointment Booking' && renderAppointmentBooking()}
      </main>
    </div>
  );
}