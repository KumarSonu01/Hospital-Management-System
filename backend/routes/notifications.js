const express = require('express');
const Notification = require('../models/Notification');

const router = express.Router();

const auth = (req, res, next) => {
  const jwt = require('jsonwebtoken');
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).send({ error: 'No token provided' });
  }
  try {
    req.user = jwt.verify(token, 'your_jwt_secret');
    next();
  } catch {
    res.status(401).send({ error: 'Invalid token' });
  }
};

router.get('/', auth, async (req, res) => {
  try {
    const items = await Notification.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(items);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/:id/read', auth, async (req, res) => {
  try {
    const n = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { read: true },
      { new: true }
    );
    if (!n) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.json(n);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
