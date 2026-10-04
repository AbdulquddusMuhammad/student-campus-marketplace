const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const pool = require('../db');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not configured');
}

const ACCESS_TOKEN_EXPIRES_IN = '15m';
const REFRESH_TOKEN_EXPIRES_IN = '30d';

function createAccessToken(userId) {
  return jwt.sign(
    {
      userId,
      type: 'access',
    },
    JWT_SECRET,
    {
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    },
  );
}

function createRefreshToken(userId) {
  return jwt.sign(
    {
      userId,
      type: 'refresh',
    },
    JWT_SECRET,
    {
      expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    },
  );
}

router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: 'Name, email, and password are required',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: 'Password must be at least 6 characters',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [normalizedEmail],
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        message: 'An account with this email already exists',
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO users (name, email, phone, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, phone, created_at`,
      [name.trim(), normalizedEmail, phone?.trim() || null, passwordHash],
    );

    const user = result.rows[0];

    const accessToken = createAccessToken(user.id);
    const refreshToken = createRefreshToken(user.id);

    res.status(201).json({
      message: 'Account created successfully',
      accessToken,
      refreshToken,
      user,
    });
  } catch (error) {
    console.error('Registration error:', error);

    res.status(500).json({
      message: 'Could not create account',
    });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const result = await pool.query(
      `SELECT id, name, email, phone, password_hash, created_at
       FROM users
       WHERE email = $1`,
      [normalizedEmail],
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: 'Invalid email or password',
      });
    }

    const user = result.rows[0];

    if (!user.password_hash) {
      return res.status(401).json({
        message: 'This account needs to be registered again with a password',
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.password_hash,
    );

    if (!passwordMatches) {
      return res.status(401).json({
        message: 'Invalid email or password',
      });
    }

    const accessToken = createAccessToken(user.id);
    const refreshToken = createRefreshToken(user.id);

    delete user.password_hash;

    res.json({
      message: 'Login successful',
      accessToken,
      refreshToken,
      user,
    });
  } catch (error) {
    console.error('Login error:', error);

    res.status(500).json({
      message: 'Could not log in',
    });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        message: 'Refresh token is required',
      });
    }

    let decoded;

    try {
      decoded = jwt.verify(refreshToken, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({
        message: 'Refresh token is invalid or expired',
      });
    }

    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        message: 'Invalid refresh token',
      });
    }

    const result = await pool.query(
      `SELECT id, name, email, phone, created_at
       FROM users
       WHERE id = $1`,
      [decoded.userId],
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: 'User account no longer exists',
      });
    }

    const user = result.rows[0];

    const accessToken = createAccessToken(user.id);
    const newRefreshToken = createRefreshToken(user.id);

    res.json({
      message: 'Token refreshed successfully',
      accessToken,
      refreshToken: newRefreshToken,
      user,
    });
  } catch (error) {
    console.error('Refresh token error:', error);

    res.status(500).json({
      message: 'Could not refresh login',
    });
  }
});

module.exports = router;
