const db = require('../db');

async function addToPlaylist(userId, title, videoId) {
  // create playlist if not exists for user
  const { rows } = await db.query('SELECT id FROM playlists WHERE user_id=$1 AND title=$2', [userId, title]);
  let playlistId;
  if (rows.length === 0) {
    const r2 = await db.query('INSERT INTO playlists (user_id, title) VALUES ($1,$2) RETURNING id', [userId, title]);
    playlistId = r2.rows[0].id;
  } else {
    playlistId = rows[0].id;
  }
  // insert into playlist_videos if not present
  await db.query('INSERT INTO playlist_videos (playlist_id, video_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [playlistId, videoId]);
  return playlistId;
}

module.exports = { addToPlaylist };
