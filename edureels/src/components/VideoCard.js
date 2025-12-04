import React, { useState } from 'react';
import { followUser, addToPlaylist, commentOnVideo, getVideoSummary } from '../api';
import VideoPlayerModal from './VideoPlayerModal';

export default function VideoCard({ video }) {
  const [showPlayer, setShowPlayer] = useState(false);
  const [adding, setAdding] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState(video.comments || []);
  const [commentText, setCommentText] = useState('');
  const [summary, setSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const creator = video.creator || {};

  async function handleFollow() {
    try {
      await followUser(creator._id || creator.id);
      alert('Toggled follow');
    } catch (err) {
      alert('Follow error: ' + (err.message || JSON.stringify(err)));
    }
  }

  async function handleAddPlaylist() {
    const title = prompt('Playlist title (e.g., React Basics)');
    if (!title) return;
    setAdding(true);
    try {
      await addToPlaylist({ title, videoId: video._id || video.id });
      alert('Added to playlist');
    } catch (err) {
      alert('Error: ' + (err.message || JSON.stringify(err)));
    } finally {
      setAdding(false);
    }
  }

  async function postComment() {
    if (!commentText) return;
    try {
      const res = await commentOnVideo(video._id || video.id, commentText);
      setComments(res.video.comments || []);
      setCommentText('');
    } catch (err) {
      alert('Comment failed');
    }
  }

  async function loadSummary() {
    setLoadingSummary(true);
    try {
      const res = await getVideoSummary(video._id || video.id);
      setSummary(res);
    } catch (err) {
      alert('Summary error: ' + (err.message || JSON.stringify(err)));
    } finally {
      setLoadingSummary(false);
    }
  }

  return (
    <div className="video-card card">
      <div className="video-preview" onClick={() => setShowPlayer(true)} style={{ cursor: 'pointer' }}>
        <video src={`${process.env.REACT_APP_API?.replace('/api', '') || 'http://localhost:5000'}${video.url}`} width="320" height="180" preload="metadata" />
      </div>

      <div className="video-meta">
        <h4>{video.title}</h4>
        <div className="small">By <strong>{creator.name || 'Creator'}</strong> • {video.level} • {video.durationSec}s</div>
        <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
          <button className="btn" onClick={handleFollow}>Follow</button>
          <button className="btn" onClick={handleAddPlaylist} disabled={adding}>{adding ? 'Adding...' : 'Add to playlist'}</button>
          <button className="btn" onClick={() => setCommentsOpen(s => !s)}>{commentsOpen ? 'Hide' : 'Comments'}</button>
          <button className="btn" onClick={loadSummary}>{loadingSummary ? '...' : 'Get summary & quiz'}</button>
        </div>

        <div style={{ marginTop: 8 }}>Tags: <span className="small">{(video.tags||[]).join(', ')}</span></div>

        {commentsOpen && (
          <div style={{ marginTop: 8 }}>
            <div style={{ maxHeight: 180, overflow: 'auto' }}>
              {comments.length === 0 && <div className="small">No comments yet</div>}
              {comments.map(c => <div key={c._id || c.createdAt} className="small" style={{ marginBottom: 6 }}>{c.text}</div>)}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <input value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Add comment" />
              <button className="btn" onClick={postComment}>Post</button>
            </div>
          </div>
        )}

        {summary && (
          <div className="card" style={{ marginTop: 10 }}>
            <strong>AI Summary</strong>
            <p className="small">{summary.summary}</p>
            <strong>Quiz</strong>
            <ol>
              {(summary.quiz || []).map((q, i) => <li key={i}><div style={{ fontWeight:600 }}>{q.question}</div><div className="small">Options: {q.options.join(' | ')}</div></li>)}
            </ol>
          </div>
        )}
      </div>

      {showPlayer && <VideoPlayerModal video={video} onClose={() => setShowPlayer(false)} />}
    </div>
  );
}
