const db = require('../db');

async function createUser({ name, email, passwordHash, role }) {
  const q = `INSERT INTO users (name, email, password_hash, role) VALUES ($1,$2,$3,$4) RETURNING id, name, email, role`;
  const { rows } = await db.query(q, [name, email, passwordHash, role]);
  return rows[0];
}

async function findByEmail(email) {
  const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [email]);
  return rows[0];
}

async function findById(id) {
  const { rows } = await db.query('SELECT id, name, email, role FROM users WHERE id = $1', [id]);
  return rows[0];
}

async function toggleFollow(followerId, followeeId) {
  // if exists delete, else insert
  const { rows } = await db.query('SELECT 1 FROM follows WHERE follower_id=$1 AND followee_id=$2', [followerId, followeeId]);
  if (rows.length > 0) {
    await db.query('DELETE FROM follows WHERE follower_id=$1 AND followee_id=$2', [followerId, followeeId]);
    return { following: false };
  } else {
    await db.query('INSERT INTO follows (follower_id, followee_id) VALUES ($1,$2)', [followerId, followeeId]);
    return { following: true };
  }
}

async function getFollowingIds(userId) {
  const { rows } = await db.query('SELECT followee_id FROM follows WHERE follower_id=$1', [userId]);
  return rows.map(r => r.followee_id);
}

module.exports = { createUser, findByEmail, findById, toggleFollow, getFollowingIds };
