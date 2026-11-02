const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { asyncHandler } = require('../middleware/auth');

const router = express.Router();
const digest = (s) => crypto.createHash('sha256').update(String(s)).digest();
const safeEqual = (a, b) => crypto.timingSafeEqual(digest(a), digest(b));

// POST /auth/login  -> { token }
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  const okEmail = safeEqual(email || '', process.env.ADMIN_EMAIL || '');
  const okPass = safeEqual(password || '', process.env.ADMIN_PASSWORD || '');
  if (!(okEmail && okPass)) return res.status(401).json({ message: 'Wrong email or password.' });
  const token = jwt.sign({ role: 'admin', email }, process.env.JWT_SECRET, { expiresIn: '8h' });
  res.json({ token, email });
}));

module.exports = router;
