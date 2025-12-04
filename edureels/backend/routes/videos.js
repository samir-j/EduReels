const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const auth = require('../middleware/auth');
const videosModel = require('../models/videos');
const playlistsModel = require('../models/playlists');

require('dotenv').config();

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${uuidv4()}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 500 * 1024 * 1024 } }); // 500MB limit for dev

// Upload endpoint (creator only)
router.post('/upload', auth, upload.single('video'), async (req, res) => {
  try {
    if (req.user.role !== 'creator') return res.status(403).json({ message: 'Only creators can upload' });
    if (!req.file) return res.status(400).json({ message: 'No file' });

    const { title, tags = '', concepts = '', level = 'beginner', durationSec } = req.body;
    const tagsArr = tags ? tags.split(',').map(s => s.trim()).filter(Boolean) : [];
    const conceptsArr = concepts ? concepts.split(',').map(s => s.trim()).filter(Boolean) : [];

    // construct a local URL (frontend will prefix with base host)
    const url = `/uploads/${req.file.filename}`;

    // Optionally: validate duration using ffprobe via fluent-ffmpeg
    // (uncomment and ensure ffmpeg is installed in your system)
    /*
    const ffmpeg = require('fluent-ffmpeg');
    let dur = Number(durationSec) || null;
    ffmpeg.ffprobe(req.file.path, function(err, metadata) {
      if (!err && metadata.format && metadata.format.duration) {
        dur = Math.round(metadata.format.duration);
      }
    });
    */

    const video = await videosModel.createVideo({
      title,
      filename: req.file.filename,
      url,
      creatorId: req.user.id,
      tags: tagsArr,
      concepts: conceptsArr,
      level,
      durationSec: Number(durationSec) || null
    });

    res.json({ video });
  } catch (err) {
    console.error('upload error', err);
    res.status(500).json({ message: 'Upload error' });
  }
});

// Serve uploads statically from server.js (we'll configure there)

// Feed (personalized)
router.get('/feed', auth, async (req, res) => {
  try {
    const followingIds = await (await require('../models/users').getFollowingIds(req.user.id));
    const feed = await videosModel.getFeed(followingIds, 80);
    // map creator name to a creator object for frontend compatibility
    const mapped = feed.map(v => ({
      id: v.id, title: v.title, url: v.url, creator: { id: v.creator_id, name: v.creator_name },
      tags: v.tags, concepts: v.concepts, level: v.level, durationSec: v.duration_sec, createdAt: v.created_at
    }));
    res.json({ feed: mapped });
  } catch (err) {
    console.error('feed error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add comment
router.post('/:id/comment', auth, async (req, res) => {
  try {
    const videoId = req.params.id;
    const { text } = req.body;
    if (!text) return res.status(400).json({ message: 'No text' });
    const comment = await videosModel.addComment(videoId, req.user.id, text);
    const comments = await videosModel.getComments(videoId);
    res.json({ video: { id: videoId }, comments, videoComments: comments });
  } catch (err) {
    console.error('comment error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// get single video (with comments)
router.get('/:id', auth, async (req, res) => {
  try {
    const v = await videosModel.findById(req.params.id);
    if (!v) return res.status(404).json({ message: 'Video not found' });
    const comments = await videosModel.getComments(req.params.id);
    res.json({ video: { id: v.id, title: v.title, url: v.url, creator: { id: v.creator_id, name: v.creator_name }, tags: v.tags, concepts: v.concepts, level: v.level, durationSec: v.duration_sec }, comments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
