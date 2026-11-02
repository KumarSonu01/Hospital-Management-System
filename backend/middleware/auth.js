const jwt = require('jsonwebtoken');

/**
 * Authentication middleware that verifies JWT and attaches decoded user to req.user.
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : authHeader;

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Authentication token missing. Please log in.'
    });
  }

  const secret = process.env.JWT_SECRET || 'hospital_production_secure_jwt_secret_key_2025_98127391';

  try {
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Session expired. Please log in again.'
      });
    }
    return res.status(401).json({
      success: false,
      error: 'Invalid authentication token.'
    });
  }
};

/**
 * Role-based authorization middleware.
 * Example: authorizeRoles('admin', 'doctor')
 */
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: User identity not established.'
      });
    }

    const normalizedRole = req.user.role.toLowerCase();
    const normalizedAllowed = allowedRoles.map((r) => r.toLowerCase());

    if (!normalizedAllowed.includes(normalizedRole)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Role '${req.user.role}' is not authorized for this resource.`
      });
    }

    next();
  };
};

module.exports = {
  authenticateToken,
  authorizeRoles
};
