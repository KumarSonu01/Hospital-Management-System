require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/User');
const Doctor = require('./models/Doctor');
const Admin = require('./models/Admin');
const Appointment = require('./models/Appointment');
const Prescription = require('./models/Prescription');
const Invoice = require('./models/Invoice');
const Inventory = require('./models/Inventory');
const Bed = require('./models/Bed');
const VitalSign = require('./models/VitalSign');
const AuditLog = require('./models/AuditLog');
const { calendarDateToUtcMidnight, startOfUtcDay } = require('./utils/dateHelpers');

async function seedDatabase() {
  console.log('--- Starting Hospital Database Seeding ---');

  if (!process.env.MONGODB_URI) {
    console.error('Error: MONGODB_URI is not set in backend/.env');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB cluster.');

  // Clean existing collections to ensure fresh, consistent state
  console.log('Clearing existing records...');
  await Promise.all([
    User.deleteMany({}),
    Doctor.deleteMany({}),
    Admin.deleteMany({}),
    Appointment.deleteMany({}),
    Prescription.deleteMany({}),
    Invoice.deleteMany({}),
    Inventory.deleteMany({}),
    Bed.deleteMany({}),
    VitalSign.deleteMany({}),
    AuditLog.deleteMany({})
  ]);

  // 1. Create Admin
  console.log('Seeding Administrators...');
  const adminPassword = 'Admin@123';
  const adminUser = await User.create({
    firstName: 'System',
    lastName: 'Administrator',
    email: 'admin@hospital.com',
    password: adminPassword,
    role: 'admin',
    phoneNumber: '+1-555-0199',
    department: 'Hospital Administration'
  });
  await Admin.create({
    firstName: 'System',
    lastName: 'Administrator',
    email: 'admin@hospital.com',
    password: adminPassword,
    role: 'admin'
  });

  // 2. Create Doctors
  console.log('Seeding Doctors...');
  const doctorPassword = 'Doctor@123';
  const doctorsData = [
    {
      firstName: 'Sarah',
      lastName: 'Mitchell',
      email: 'sarah.mitchell@hospital.com',
      password: doctorPassword,
      specialty: 'Cardiology',
      department: 'Cardiovascular Care',
      licenseNumber: 'DOC-CAR-0101',
      phoneNumber: '+1-555-0121'
    },
    {
      firstName: 'David',
      lastName: 'Chen',
      email: 'david.chen@hospital.com',
      password: doctorPassword,
      specialty: 'Neurology',
      department: 'Neurological Sciences',
      licenseNumber: 'DOC-NEU-0202',
      phoneNumber: '+1-555-0122'
    },
    {
      firstName: 'Emily',
      lastName: 'Rodriguez',
      email: 'emily.rodriguez@hospital.com',
      password: doctorPassword,
      specialty: 'Internal Medicine',
      department: 'General & Internal Medicine',
      licenseNumber: 'DOC-INT-0303',
      phoneNumber: '+1-555-0123'
    },
    {
      firstName: 'James',
      lastName: 'Wilson',
      email: 'james.wilson@hospital.com',
      password: doctorPassword,
      specialty: 'Emergency Medicine',
      department: 'Trauma & Emergency',
      licenseNumber: 'DOC-EMR-0404',
      phoneNumber: '+1-555-0124'
    }
  ];

  const createdDoctors = [];
  for (const doc of doctorsData) {
    const d = await Doctor.create(doc);
    await User.create({
      ...doc,
      role: 'doctor'
    });
    createdDoctors.push(d);
  }

  // 3. Create Staff (Pharmacist & Receptionist)
  console.log('Seeding Clinical Staff...');
  const staffPassword = 'Staff@123';
  await User.create([
    {
      firstName: 'Clara',
      lastName: 'Oswald',
      email: 'pharmacist@hospital.com',
      password: staffPassword,
      role: 'pharmacist',
      department: 'Central Pharmacy',
      phoneNumber: '+1-555-0130'
    },
    {
      firstName: 'Donna',
      lastName: 'Noble',
      email: 'receptionist@hospital.com',
      password: staffPassword,
      role: 'receptionist',
      department: 'Front Desk & Admissions',
      phoneNumber: '+1-555-0131'
    }
  ]);

  // 4. Create Patients
  console.log('Seeding Patients...');
  const patientPassword = 'Patient@123';
  const patientsData = [
    {
      firstName: 'Johnathan',
      lastName: 'Doe',
      email: 'john.doe@email.com',
      password: patientPassword,
      role: 'patient',
      phoneNumber: '+1-555-0141',
      dateOfBirth: new Date('1988-04-12'),
      gender: 'male',
      bloodGroup: 'O+',
      address: '742 Evergreen Terrace, Springfield',
      emergencyContact: { name: 'Jane Doe', phone: '+1-555-0142', relation: 'Spouse' }
    },
    {
      firstName: 'Maria',
      lastName: 'Garcia',
      email: 'maria.garcia@email.com',
      password: patientPassword,
      role: 'patient',
      phoneNumber: '+1-555-0143',
      dateOfBirth: new Date('1994-09-23'),
      gender: 'female',
      bloodGroup: 'A+',
      address: '124 Conch Street, Pacific City',
      emergencyContact: { name: 'Carlos Garcia', phone: '+1-555-0144', relation: 'Brother' }
    },
    {
      firstName: 'Robert',
      lastName: 'Taylor',
      email: 'robert.taylor@email.com',
      password: patientPassword,
      role: 'patient',
      phoneNumber: '+1-555-0145',
      dateOfBirth: new Date('1972-11-05'),
      gender: 'male',
      bloodGroup: 'B+',
      address: '350 Fifth Ave, Metroville',
      emergencyContact: { name: 'Susan Taylor', phone: '+1-555-0146', relation: 'Spouse' }
    },
    {
      firstName: 'Aisha',
      lastName: 'Patel',
      email: 'aisha.patel@email.com',
      password: patientPassword,
      role: 'patient',
      phoneNumber: '+1-555-0147',
      dateOfBirth: new Date('2001-02-18'),
      gender: 'female',
      bloodGroup: 'AB+',
      address: '42 Wallaby Way, Sydney Park',
      emergencyContact: { name: 'Ravi Patel', phone: '+1-555-0148', relation: 'Father' }
    }
  ];

  const createdPatients = [];
  for (const pat of patientsData) {
    const p = await User.create(pat);
    createdPatients.push(p);
  }

  // 5. Create Appointments
  console.log('Seeding Clinical Appointments...');
  const today = startOfUtcDay(new Date());
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  const nextWeek = new Date(today.getTime() + 4 * 24 * 60 * 60 * 1000);

  const sampleAppointments = [
    {
      patientId: createdPatients[0]._id,
      doctorId: createdDoctors[0]._id, // Dr. Sarah (Cardio)
      date: today,
      time: '10:00 AM',
      conditionType: 'moderate',
      disease: 'Hypertension',
      computingLayer: 'fog',
      priorityScore: 480,
      reason: 'Routine quarterly blood pressure review',
      status: 'scheduled'
    },
    {
      patientId: createdPatients[1]._id,
      doctorId: createdDoctors[2]._id, // Dr. Emily (Internal)
      date: today,
      time: '11:00 AM',
      conditionType: 'normal',
      disease: 'Routine checkup',
      computingLayer: 'cloud',
      priorityScore: 100,
      reason: 'Annual physical examination and blood panel',
      status: 'scheduled'
    },
    {
      patientId: createdPatients[2]._id,
      doctorId: createdDoctors[3]._id, // Dr. James (Emergency)
      date: today,
      time: 'ASAP',
      conditionType: 'critical',
      disease: 'Cardiac arrest risk',
      computingLayer: 'edge',
      priorityScore: 1000,
      reason: 'Acute chest tightness and elevated heart rate',
      status: 'scheduled'
    },
    {
      patientId: createdPatients[3]._id,
      doctorId: createdDoctors[1]._id, // Dr. David (Neuro)
      date: tomorrow,
      time: '02:00 PM',
      conditionType: 'moderate',
      disease: 'Chronic pain',
      computingLayer: 'fog',
      priorityScore: 400,
      reason: 'Migraine frequency evaluation and MRI consult',
      status: 'scheduled'
    },
    {
      patientId: createdPatients[0]._id,
      doctorId: createdDoctors[2]._id,
      date: nextWeek,
      time: '03:00 PM',
      conditionType: 'normal',
      disease: 'Follow-up',
      computingLayer: 'cloud',
      priorityScore: 100,
      reason: 'Dietary response checkup',
      status: 'scheduled'
    }
  ];

  const createdAppointments = await Appointment.insertMany(sampleAppointments);

  // 6. Create Prescriptions
  console.log('Seeding Prescriptions...');
  await Prescription.create([
    {
      patientId: createdPatients[0]._id,
      doctorId: createdDoctors[0]._id,
      appointmentId: createdAppointments[0]._id,
      diagnosis: 'Primary Stage 1 Essential Hypertension',
      notes: 'Monitor BP daily morning and evening. Reduce sodium intake.',
      status: 'active',
      items: [
        { medication: 'Lisinopril 10mg', dosage: '1 tablet', frequency: 'Once daily in the morning', duration: '30 days', instructions: 'Take with full glass of water' },
        { medication: 'Amlodipine 5mg', dosage: '1 tablet', frequency: 'Once daily', duration: '30 days', instructions: 'Take at bedtime' }
      ]
    },
    {
      patientId: createdPatients[1]._id,
      doctorId: createdDoctors[2]._id,
      appointmentId: createdAppointments[1]._id,
      diagnosis: 'Vitamin D Deficiency',
      notes: 'Recheck 25-OH Vitamin D after 8 weeks.',
      status: 'active',
      items: [
        { medication: 'Ergocalciferol (Vitamin D2) 50,000 IU', dosage: '1 capsule', frequency: 'Once weekly', duration: '8 weeks', instructions: 'Take with a fatty meal' }
      ]
    }
  ]);

  // 7. Create Pharmacy Inventory
  console.log('Seeding Pharmacy Inventory & Medications...');
  const inventoryData = [
    { itemName: 'Amoxicillin 500mg', sku: 'MED-AMX-500', category: 'antibiotics', stockQuantity: 180, reorderThreshold: 30, unitPrice: 12.50, unit: 'tablets' },
    { itemName: 'Atorvastatin 20mg', sku: 'MED-ATV-020', category: 'cardiovascular', stockQuantity: 95, reorderThreshold: 25, unitPrice: 18.00, unit: 'tablets' },
    { itemName: 'Lisinopril 10mg', sku: 'MED-LSN-010', category: 'cardiovascular', stockQuantity: 15, reorderThreshold: 20, unitPrice: 8.50, unit: 'tablets' }, // LOW STOCK ALERT
    { itemName: 'Metformin 500mg', sku: 'MED-MET-500', category: 'diabetes', stockQuantity: 240, reorderThreshold: 40, unitPrice: 9.00, unit: 'tablets' },
    { itemName: 'Ibuprofen 400mg', sku: 'MED-IBU-400', category: 'analgesics', stockQuantity: 8, reorderThreshold: 30, unitPrice: 6.00, unit: 'tablets' }, // LOW STOCK ALERT
    { itemName: 'Normal Saline IV 0.9% 500ml', sku: 'SUP-NSS-500', category: 'supplies', stockQuantity: 65, reorderThreshold: 20, unitPrice: 15.00, unit: 'vials' },
    { itemName: 'Ceftriaxone 1g Injectable', sku: 'MED-CFT-001', category: 'antibiotics', stockQuantity: 4, reorderThreshold: 15, unitPrice: 28.00, unit: 'vials' }, // LOW STOCK ALERT
    { itemName: 'Insulin Glargine 100u/ml', sku: 'MED-INS-100', category: 'diabetes', stockQuantity: 42, reorderThreshold: 10, unitPrice: 64.00, unit: 'vials' }
  ];

  await Inventory.insertMany(inventoryData);

  // 8. Create Hospital Beds
  console.log('Seeding Hospital Ward & Bed Allocations...');
  const bedsData = [
    // General Ward (Floor 1)
    { bedNumber: 'GEN-101', wardNumber: 'Ward 1A', wardType: 'general', floor: 1, status: 'occupied', currentPatientId: createdPatients[0]._id, admittedAt: new Date(Date.now() - 2 * 86400000), dailyRate: 75 },
    { bedNumber: 'GEN-102', wardNumber: 'Ward 1A', wardType: 'general', floor: 1, status: 'available', dailyRate: 75 },
    { bedNumber: 'GEN-103', wardNumber: 'Ward 1A', wardType: 'general', floor: 1, status: 'available', dailyRate: 75 },
    { bedNumber: 'GEN-104', wardNumber: 'Ward 1B', wardType: 'general', floor: 1, status: 'occupied', currentPatientId: createdPatients[1]._id, admittedAt: new Date(Date.now() - 1 * 86400000), dailyRate: 75 },
    { bedNumber: 'GEN-105', wardNumber: 'Ward 1B', wardType: 'general', floor: 1, status: 'cleaning', dailyRate: 75 },

    // ICU Ward (Floor 2)
    { bedNumber: 'ICU-201', wardNumber: 'Intensive Care Unit', wardType: 'icu', floor: 2, status: 'occupied', currentPatientId: createdPatients[2]._id, admittedAt: new Date(), dailyRate: 350 },
    { bedNumber: 'ICU-202', wardNumber: 'Intensive Care Unit', wardType: 'icu', floor: 2, status: 'available', dailyRate: 350 },
    { bedNumber: 'ICU-203', wardNumber: 'Intensive Care Unit', wardType: 'icu', floor: 2, status: 'available', dailyRate: 350 },

    // Emergency Ward (Ground Floor)
    { bedNumber: 'EMR-301', wardNumber: 'Emergency Trauma', wardType: 'emergency', floor: 0, status: 'available', dailyRate: 150 },
    { bedNumber: 'EMR-302', wardNumber: 'Emergency Trauma', wardType: 'emergency', floor: 0, status: 'available', dailyRate: 150 },
    { bedNumber: 'EMR-303', wardNumber: 'Emergency Trauma', wardType: 'emergency', floor: 0, status: 'occupied', currentPatientId: createdPatients[3]._id, admittedAt: new Date(), dailyRate: 150 },

    // Private Ward (Floor 3)
    { bedNumber: 'PRV-401', wardNumber: 'Executive Suite', wardType: 'private', floor: 3, status: 'available', dailyRate: 220 },
    { bedNumber: 'PRV-402', wardNumber: 'Executive Suite', wardType: 'private', floor: 3, status: 'available', dailyRate: 220 }
  ];

  await Bed.insertMany(bedsData);

  // 9. Create Billing Invoices
  console.log('Seeding Billing & Invoices...');
  await Invoice.create([
    {
      invoiceNumber: `INV-${new Date().getFullYear()}-00101`,
      patientId: createdPatients[0]._id,
      doctorId: createdDoctors[0]._id,
      items: [
        { description: 'Cardiology Specialist Consultation', category: 'consultation', quantity: 1, unitPrice: 150, total: 150 },
        { description: 'Electrocardiogram (ECG) Diagnostic', category: 'lab_test', quantity: 1, unitPrice: 95, total: 95 },
        { description: 'Lisinopril 10mg (30 day supply)', category: 'medication', quantity: 1, unitPrice: 8.50, total: 8.50 }
      ],
      subtotal: 253.50,
      tax: 12.50,
      discount: 20.00,
      total: 246.00,
      status: 'paid',
      paymentMethod: 'insurance',
      paidAt: new Date(Date.now() - 3 * 86400000),
      notes: 'Covered under BlueCross Silver Tier'
    },
    {
      invoiceNumber: `INV-${new Date().getFullYear()}-00102`,
      patientId: createdPatients[1]._id,
      doctorId: createdDoctors[2]._id,
      items: [
        { description: 'Comprehensive Annual Metabolic Panel', category: 'lab_test', quantity: 1, unitPrice: 120, total: 120 },
        { description: 'Internal Medicine Consultation', category: 'consultation', quantity: 1, unitPrice: 110, total: 110 }
      ],
      subtotal: 230.00,
      tax: 11.50,
      discount: 0,
      total: 241.50,
      status: 'pending',
      paymentMethod: 'none',
      notes: 'Due in 7 days'
    }
  ]);

  // 10. Create Sample Patient Vitals
  console.log('Seeding Patient Vital Signs...');
  const baseTime = Date.now();
  const vitalsSamples = [];
  for (let i = 12; i >= 0; i--) {
    const t = new Date(baseTime - i * 3600000);
    vitalsSamples.push({
      patientId: createdPatients[0]._id,
      heartRate: 72 + Math.floor(Math.sin(i) * 8),
      temperature: Number((36.8 + Math.cos(i) * 0.3).toFixed(1)),
      source: 'clinical-monitor',
      computingLayer: 'cloud',
      processedByFog: true,
      emergency: false,
      createdAt: t
    });
  }

  // Add one emergency reading for patient 2
  vitalsSamples.push({
    patientId: createdPatients[2]._id,
    heartRate: 142,
    temperature: 38.9,
    source: 'edge-wearable',
    computingLayer: 'edge',
    processedByFog: true,
    emergency: true,
    anomalyReason: 'Sustained tachycardia (>140 BPM) with fever spike',
    createdAt: new Date()
  });

  await VitalSign.insertMany(vitalsSamples);

  // 11. Initial Audit Log Entry
  await AuditLog.create({
    userId: adminUser._id,
    userName: 'System Administrator',
    userRole: 'admin',
    action: 'SYSTEM_SEED',
    resourceType: 'Database',
    details: 'Demo hospital data seeded successfully with patients, staff, doctors, wards, pharmacy, and billing.',
    ipAddress: '127.0.0.1'
  });

  console.log('============================================');
  console.log('Database Seeding Complete!');
  console.log('Demo Credentials:');
  console.log(' - Admin: admin@hospital.com / Admin@123');
  console.log(' - Doctor: sarah.mitchell@hospital.com / Doctor@123');
  console.log(' - Doctor: david.chen@hospital.com / Doctor@123');
  console.log(' - Patient: john.doe@email.com / Patient@123');
  console.log(' - Patient: maria.garcia@email.com / Patient@123');
  console.log(' - Pharmacist: pharmacist@hospital.com / Staff@123');
  console.log(' - Receptionist: receptionist@hospital.com / Staff@123');
  console.log('============================================');

  await mongoose.connection.close();
  process.exit(0);
}

seedDatabase().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
