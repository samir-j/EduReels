import React, { useEffect, useState } from 'react';
import { fetchFeed } from '../api';
import VideoCard from './VideoCard';

export default function Feed() {
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
    // simple polling/refresh every 30s to show new reels
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetchFeed();
      setFeed(res.feed || []);
    } catch (err) {
      console.error('fetchFeed', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="feed">
      <div style={{ marginBottom: 8 }} className="card">
        <strong>Learning Feed</strong>
        <div className="small">Personalized feed — creators you follow come first.</div>
      </div>

      {loading && <div className="card">Loading feed...</div>}
      {!loading && feed.length === 0 && <div className="card">No reels yet. Follow creators or upload one!</div>}

      {feed.map(v => (
        <VideoCard key={v._id || v.id} video={v} />
      ))}
    </div>
  );
}
