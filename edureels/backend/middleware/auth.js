const jwt = require('jsonwebtoken');
require('dotenv').config();
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'devsecret';

async function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ message: 'No token' });
  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    // payload: { id, iat, exp }
    const { rows } = await db.query('SELECT id, name, email, role FROM users WHERE id = $1', [payload.id]);
    if (!rows[0]) return res.status(401).json({ message: 'Invalid token (user missing)' });
    req.user = rows[0];
    next();
  } catch (err) {
    console.error('auth error', err);
    return res.status(401).json({ message: 'Invalid token' });
  }
}

module.exports = auth;
