const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, college, branch, graduationYear, targetRole } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password are required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) return res.status(409).json({ error: 'Email already registered' });

    const user = new User({ name, email, password, college, branch, graduationYear, targetRole });
    await user.save();

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '7d' });
    res.status(201).json({ message: 'Account created successfully', token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid email or password' });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '7d' });
    res.json({ message: 'Login successful', token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  res.json({ user: req.user });
});

// Update profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, college, branch, graduationYear, targetRole, skills } = req.body;
    const update = {};
    if (name) update.name = name;
    if (college) update.college = college;
    if (branch) update.branch = branch;
    if (graduationYear) update.graduationYear = graduationYear;
    if (targetRole) update.targetRole = targetRole;
    if (skills) update.skills = skills;

    const user = await User.findByIdAndUpdate(req.userId, update, { new: true });
    res.json({ message: 'Profile updated', user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
