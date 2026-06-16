const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) return res.status(401).json({ error: 'Invalid token. User not found.' });

    req.user = user;
    req.userId = decoded.userId;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return res.status(401).json({ error: 'Token expired. Please login again.' });
    res.status(401).json({ error: 'Invalid token.' });
  }
};

module.exports = auth;
