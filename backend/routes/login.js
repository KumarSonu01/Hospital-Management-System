const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Admin = require('../models/Admin');
const { validateEmail } = require('../utils/validator');
const { logActivity } = require('../utils/auditLogger');

const router = express.Router();

router.post('/', async (req, res, next) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required.'
      });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid email address.'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    let user = null;
    let userRole = role ? role.toLowerCase() : '';

    // Search targeted role collection first, or find across collections
    if (userRole === 'doctor') {
      user = await Doctor.findOne({ email: normalizedEmail });
      if (!user) user = await User.findOne({ email: normalizedEmail, role: 'doctor' });
    } else if (userRole === 'admin') {
      user = await Admin.findOne({ email: normalizedEmail });
      if (!user) user = await User.findOne({ email: normalizedEmail, role: 'admin' });
    } else {
      user = await User.findOne({ email: normalizedEmail });
      if (!user) {
        user = await Doctor.findOne({ email: normalizedEmail });
      }
      if (!user) {
        user = await Admin.findOne({ email: normalizedEmail });
      }
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.'
      });
    }

    const resolvedRole = user.role || userRole || 'patient';
    const secret = process.env.JWT_SECRET || 'hospital_production_secure_jwt_secret_key_2025_98127391';

    const tokenPayload = {
      id: user._id.toString(),
      role: resolvedRole,
      email: user.email,
      name: `${user.firstName} ${user.lastName}`
    };

    const token = jwt.sign(tokenPayload, secret, { expiresIn: '24h' });

    // Non-blocking activity log
    logActivity({
      userId: user._id,
      userName: `${user.firstName} ${user.lastName}`,
      userRole: resolvedRole,
      action: 'LOGIN',
      resourceType: 'User',
      resourceId: user._id,
      details: `User logged in successfully with role ${resolvedRole}`,
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: 'Login successful',
      token,
      role: resolvedRole,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: resolvedRole,
        specialty: user.specialty || '',
        phoneNumber: user.phoneNumber || '',
        licenseNumber: user.licenseNumber || '',
        department: user.department || ''
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
