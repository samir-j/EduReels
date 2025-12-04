// backend/db.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // optionally: ssl: { rejectUnauthorized: false } for some hosted providers
});

pool.on('error', (err) => console.error('Unexpected PG client error', err));

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
