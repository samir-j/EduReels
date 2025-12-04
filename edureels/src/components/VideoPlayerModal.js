import React from 'react';

export default function VideoPlayerModal({ video, onClose }) {
  const src = `${process.env.REACT_APP_API?.replace('/api', '') || 'http://localhost:5000'}${video.url}`;
  return (
    <div style={{
      position:'fixed', left:0, top:0, right:0, bottom:0, background:'rgba(0,0,0,0.6)',
      display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000
    }}>
      <div style={{ width:'80%', maxWidth:900, background:'#111', padding:12, borderRadius:10 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h3 style={{ color:'#fff', margin:0 }}>{video.title}</h3>
          <button className="btn" onClick={onClose}>Close</button>
        </div>
        <div style={{ marginTop:12 }}>
          <video controls autoPlay style={{ width:'100%', borderRadius:8 }} src={src} />
        </div>
      </div>
    </div>
  );
}
