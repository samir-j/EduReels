import React from 'react';

export default function Header({ user, onLogout }) {
  return (
    <header>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <img src="/logo192.png" alt="Edureels" style={{ width: 36, height: 36 }} />
        <h1>Edureels</h1>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {user ? (
          <>
            <div style={{ fontSize: 14, color: '#333' }}>{user.name} • {user.role}</div>
            <button className="btn" onClick={onLogout}>Logout</button>
          </>
        ) : (
          <div className="small">Sign up to create reels</div>
        )}
      </div>
    </header>
  );
}
