const mongoose = require('mongoose');

function validateEmail(email) {
  if (!email || typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function validateRequired(obj, requiredFields) {
  const missing = [];
  for (const field of requiredFields) {
    if (obj[field] === undefined || obj[field] === null || obj[field] === '') {
      missing.push(field);
    }
  }
  return missing;
}

module.exports = {
  validateEmail,
  isValidObjectId,
  validateRequired
};
