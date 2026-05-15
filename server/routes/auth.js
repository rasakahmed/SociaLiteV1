const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { User } = require('../models');

const router = express.Router();

const generateToken = (user) => {
  return jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

// POST /api/auth/register
router.post(
  '/register',
  [
    body('username').trim().isLength({ min: 3, max: 50 }).isAlphanumeric()
      .withMessage('Username must be 3-50 alphanumeric characters'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('display_name').optional().trim().isLength({ max: 100 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { username, email, password, display_name } = req.body;

      const existingUser = await User.findOne({
        where: { username },
      });
      if (existingUser) {
        return res.status(409).json({ error: 'Username already taken.' });
      }

      const existingEmail = await User.findOne({
        where: { email },
      });
      if (existingEmail) {
        return res.status(409).json({ error: 'Email already registered.' });
      }

      const user = await User.create({
        username,
        email,
        password_hash: password,
        display_name: display_name || username,
      });

      const token = generateToken(user);

      res.status(201).json({
        message: 'Registration successful.',
        token,
        user: user.toSafeJSON(),
      });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({ error: 'Internal server error.' });
    }
  }
);

// POST /api/auth/login
router.post(
  '/login',
  [
    body('login').trim().notEmpty().withMessage('Username or email required'),
    body('password').notEmpty().withMessage('Password required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { login, password } = req.body;

      const user = await User.findOne({
        where: {
          [require('sequelize').Op.or]: [{ username: login }, { email: login }],
        },
      });

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials.' });
      }

      const isValid = await user.validatePassword(password);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid credentials.' });
      }

      const token = generateToken(user);

      res.json({
        message: 'Login successful.',
        token,
        user: user.toSafeJSON(),
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error.' });
    }
  }
);

// GET /api/auth/me
const auth = require('../middleware/auth');
router.get('/me', auth, async (req, res) => {
  try {
    res.json({ user: req.user.toSafeJSON() });
  } catch (error) {
    console.error('Me error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
