const express = require('express');
const Invoice = require('../models/Invoice');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { logActivity } = require('../utils/auditLogger');

const router = express.Router();

// ================= LIST INVOICES =================

router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const { status, patientId, search } = req.query;
    const query = {};

    // Patients can only view their own invoices
    if (req.user.role === 'patient') {
      query.patientId = req.user.id;
    } else if (patientId) {
      query.patientId = patientId;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    if (search) {
      query.invoiceNumber = new RegExp(search.trim(), 'i');
    }

    const invoices = await Invoice.find(query)
      .populate('patientId', 'firstName lastName email phoneNumber')
      .populate('doctorId', 'firstName lastName specialty')
      .sort({ createdAt: -1 });

    res.json({ success: true, invoices });
  } catch (error) {
    next(error);
  }
});

// ================= GET SINGLE INVOICE =================

router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('patientId', 'firstName lastName email phoneNumber address')
      .populate('doctorId', 'firstName lastName specialty licenseNumber');

    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found.' });
    }

    // Role check
    if (req.user.role === 'patient' && invoice.patientId._id.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Unauthorized to view this invoice.' });
    }

    res.json({ success: true, invoice });
  } catch (error) {
    next(error);
  }
});

// ================= CREATE INVOICE =================

router.post('/', authenticateToken, authorizeRoles('admin', 'receptionist', 'doctor'), async (req, res, next) => {
  try {
    const { patientId, doctorId, appointmentId, items, tax = 0, discount = 0, paymentMethod = 'none', notes } = req.body;

    if (!patientId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Patient ID and at least one itemized line are required.'
      });
    }

    const patient = await User.findById(patientId);
    if (!patient) {
      return res.status(404).json({ success: false, error: 'Patient not found.' });
    }

    // Calculate subtotal & item totals
    let subtotal = 0;
    const formattedItems = items.map((item) => {
      const qty = Number(item.quantity) || 1;
      const price = Number(item.unitPrice) || 0;
      const total = qty * price;
      subtotal += total;
      return {
        description: item.description,
        category: item.category || 'consultation',
        quantity: qty,
        unitPrice: price,
        total
      };
    });

    const numTax = Number(tax) || 0;
    const numDiscount = Number(discount) || 0;
    const grandTotal = Math.max(0, subtotal + numTax - numDiscount);

    // Generate unique invoice number: INV-YEAR-RANDOM
    const count = await Invoice.countDocuments();
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    const invoice = new Invoice({
      invoiceNumber,
      patientId,
      doctorId,
      appointmentId,
      items: formattedItems,
      subtotal,
      tax: numTax,
      discount: numDiscount,
      total: grandTotal,
      status: paymentMethod !== 'none' ? 'paid' : 'pending',
      paymentMethod,
      paidAt: paymentMethod !== 'none' ? new Date() : undefined,
      notes: notes || ''
    });

    await invoice.save();

    const populated = await invoice.populate('patientId', 'firstName lastName email');

    logActivity({
      userId: req.user.id,
      userName: req.user.name || 'Staff',
      userRole: req.user.role,
      action: 'INVOICE_CREATE',
      resourceType: 'Invoice',
      resourceId: invoice._id,
      details: `Generated invoice ${invoiceNumber} for $${grandTotal}`,
      ipAddress: req.ip
    });

    res.status(201).json({ success: true, message: 'Invoice generated successfully', invoice: populated });
  } catch (error) {
    next(error);
  }
});

// ================= RECORD PAYMENT =================

router.patch('/:id/pay', authenticateToken, authorizeRoles('admin', 'receptionist', 'patient'), async (req, res, next) => {
  try {
    const { paymentMethod = 'credit_card' } = req.body;
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found.' });
    }

    if (req.user.role === 'patient' && invoice.patientId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Unauthorized to pay this invoice.' });
    }

    invoice.status = 'paid';
    invoice.paymentMethod = paymentMethod;
    invoice.paidAt = new Date();
    await invoice.save();

    logActivity({
      userId: req.user.id,
      userName: req.user.name || 'User',
      userRole: req.user.role,
      action: 'INVOICE_PAY',
      resourceType: 'Invoice',
      resourceId: invoice._id,
      details: `Settled payment for ${invoice.invoiceNumber} via ${paymentMethod}`,
      ipAddress: req.ip
    });

    res.json({ success: true, message: 'Invoice paid successfully', invoice });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
