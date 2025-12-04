import React, { useState } from 'react';
import { uploadVideo } from '../api';

/**
 * Creator-only upload form
 */
export default function UploadForm() {
  const [file, setFile] = useState(null);
  const [meta, setMeta] = useState({
    title: '',
    tags: '',
    concepts: '',
    level: 'beginner',
    durationSec: 60
  });
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!file) return alert('Please select a video file');
    // client-side basic duration check (optional)
    if (meta.durationSec < 10 || meta.durationSec > 180) {
      if (!confirm('Duration seems outside 10-180s. Continue?')) return;
    }
    const fd = new FormData();
    fd.append('video', file);
    fd.append('title', meta.title);
    fd.append('tags', meta.tags);
    fd.append('concepts', meta.concepts);
    fd.append('level', meta.level);
    fd.append('durationSec', meta.durationSec);
    setLoading(true);
    try {
      const res = await uploadVideo(fd);
      if (res.video) {
        alert('Uploaded successfully!');
        setFile(null);
        setMeta({ title: '', tags: '', concepts: '', level: 'beginner', durationSec: 60 });
      } else {
        alert('Upload failed: ' + JSON.stringify(res));
      }
    } catch (err) {
      console.error(err);
      alert(err.message || JSON.stringify(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card upload-form">
      <h4>Upload Reel (30–90s)</h4>
      <form onSubmit={submit}>
        <input type="file" accept="video/*" onChange={e => setFile(e.target.files[0])} />
        <input placeholder="Title" value={meta.title} onChange={e => setMeta({ ...meta, title: e.target.value })} required />
        <input placeholder="Tags (comma separated)" value={meta.tags} onChange={e => setMeta({ ...meta, tags: e.target.value })} />
        <input placeholder="Concepts (comma separated)" value={meta.concepts} onChange={e => setMeta({ ...meta, concepts: e.target.value })} />
        <select value={meta.level} onChange={e => setMeta({ ...meta, level: e.target.value })}>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
        <input type="number" value={meta.durationSec} onChange={e => setMeta({ ...meta, durationSec: e.target.value })} />
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" className="btn" disabled={loading}>{loading ? 'Uploading...' : 'Upload'}</button>
        </div>
      </form>
      <div className="small">Tip: Keep videos 30–90 seconds for best engagement.</div>
    </div>
  );
}
