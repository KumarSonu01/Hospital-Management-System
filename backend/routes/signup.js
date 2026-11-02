const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Admin = require('../models/Admin');
const { validateEmail } = require('../utils/validator');
const { logActivity } = require('../utils/auditLogger');

const router = express.Router();

router.post('/', async (req, res, next) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      role = 'patient',
      phoneNumber,
      dateOfBirth,
      gender,
      bloodGroup,
      address,
      specialty,
      licenseNumber
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'First name, last name, email, and password are required.'
      });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid email address.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long.'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check for existing user in any collection
    const [existingUser, existingDoctor, existingAdmin] = await Promise.all([
      User.findOne({ email: normalizedEmail }),
      Doctor.findOne({ email: normalizedEmail }),
      Admin.findOne({ email: normalizedEmail })
    ]);

    if (existingUser || existingDoctor || existingAdmin) {
      return res.status(409).json({
        success: false,
        error: 'An account with this email address already exists.'
      });
    }

    const assignedRole = role.toLowerCase();

    if (assignedRole === 'admin') {
      const orgCode = process.env.ORGANIZATION_SECURITY_CODE || 'HOSPITAL-SECURE-2026';
      const securityCode = req.body.securityCode;
      if (!securityCode || securityCode.trim() !== orgCode) {
        return res.status(403).json({
          success: false,
          error: 'Invalid Organization Security Code. Administrator registration denied.'
        });
      }
    }

    // Create user in User collection
    const user = new User({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: normalizedEmail,
      password,
      role: assignedRole,
      phoneNumber: phoneNumber || '',
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      gender: gender || '',
      bloodGroup: bloodGroup || '',
      address: address || '',
      specialty: specialty || '',
      licenseNumber: licenseNumber || ''
    });

    await user.save();

    // If registered as admin, also sync Admin model
    if (assignedRole === 'admin') {
      await Admin.create({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: normalizedEmail,
        password,
        phoneNumber: phoneNumber || ''
      }).catch((e) => console.warn('Admin collection sync warning:', e.message));
    }

    // If registered as doctor, also keep Doctor model in sync
    if (assignedRole === 'doctor' && specialty && licenseNumber) {
      await Doctor.create({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: normalizedEmail,
        password,
        specialty: specialty.trim(),
        licenseNumber: licenseNumber.trim(),
        phoneNumber: phoneNumber || 'N/A'
      }).catch((e) => console.warn('Doctor collection sync warning:', e.message));
    }

    const secret = process.env.JWT_SECRET || 'hospital_production_secure_jwt_secret_key_2025_98127391';
    const token = jwt.sign(
      {
        id: user._id.toString(),
        role: user.role,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`
      },
      secret,
      { expiresIn: '24h' }
    );

    logActivity({
      userId: user._id,
      userName: `${user.firstName} ${user.lastName}`,
      userRole: user.role,
      action: 'PATIENT_REGISTER',
      resourceType: 'User',
      resourceId: user._id,
      details: `New account registered with role ${user.role}`,
      ipAddress: req.ip
    });

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      role: user.role,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
