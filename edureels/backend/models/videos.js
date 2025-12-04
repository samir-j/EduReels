const db = require('../db');

async function createVideo({ title, filename, url, creatorId, tags = [], concepts = [], level = 'beginner', durationSec = 60 }) {
  const q = `INSERT INTO videos (title, filename, url, creator_id, tags, concepts, level, duration_sec)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`;
  const { rows } = await db.query(q, [title, filename, url, creatorId, tags, concepts, level, durationSec]);
  return rows[0];
}

async function getFeed(followingIds = [], limit = 80) {
  // First videos from followed creators, then others. Latest first.
  if (!followingIds || followingIds.length === 0) {
    const { rows } = await db.query('SELECT v.*, u.name AS creator_name FROM videos v JOIN users u ON v.creator_id = u.id ORDER BY v.created_at DESC LIMIT $1', [limit]);
    return rows;
  }
  const followed = await db.query(
    `SELECT v.*, u.name AS creator_name FROM videos v JOIN users u ON v.creator_id=u.id
     WHERE v.creator_id = ANY($1) ORDER BY v.created_at DESC LIMIT 40`, [followingIds]
  );
  const others = await db.query(
    `SELECT v.*, u.name AS creator_name FROM videos v JOIN users u ON v.creator_id=u.id
     WHERE NOT (v.creator_id = ANY($1)) ORDER BY v.created_at DESC LIMIT $2`, [followingIds, limit]
  );
  return [...followed.rows, ...others.rows];
}

async function addComment(videoId, userId, text) {
  const { rows } = await db.query('INSERT INTO comments (video_id, user_id, text) VALUES ($1,$2,$3) RETURNING *', [videoId, userId, text]);
  return rows[0];
}

async function getComments(videoId) {
  const { rows } = await db.query('SELECT c.*, u.name as user_name FROM comments c JOIN users u ON c.user_id = u.id WHERE c.video_id=$1 ORDER BY c.created_at ASC', [videoId]);
  return rows;
}

async function findById(id) {
  const { rows } = await db.query('SELECT v.*, u.name as creator_name FROM videos v JOIN users u ON v.creator_id=u.id WHERE v.id=$1', [id]);
  return rows[0];
}

module.exports = { createVideo, getFeed, addComment, getComments, findById };
