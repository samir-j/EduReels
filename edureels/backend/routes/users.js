const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const usersModel = require('../models/users');
const playlistsModel = require('../models/playlists');

// get my user
router.get('/me', auth, async (req, res) => {
  res.json({ user: req.user });
});

// follow / unfollow
router.post('/:id/follow', auth, async (req, res) => {
  try {
    const followeeId = req.params.id;
    if (followeeId === req.user.id) return res.status(400).json({ message: 'Cannot follow yourself' });
    const result = await usersModel.toggleFollow(req.user.id, followeeId);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// add to playlist
router.post('/playlist', auth, async (req, res) => {
  try {
    const { title, videoId } = req.body;
    if (!title || !videoId) return res.status(400).json({ message: 'Missing title or videoId' });
    const pid = await playlistsModel.addToPlaylist(req.user.id, title, videoId);
    res.json({ playlistId: pid });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
