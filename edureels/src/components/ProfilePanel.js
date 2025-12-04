import React from 'react';

export default function ProfilePanel({ user }) {
  return (
    <div className="card">
      <h4>{user.name}</h4>
      <div className="small">Role: {user.role}</div>
      <div style={{ marginTop:8 }}>
        <button className="btn">Edit profile</button>
      </div>
    </div>
  );
}
