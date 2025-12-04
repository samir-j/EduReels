import React, { useEffect, useState } from 'react';
import AuthForm from './components/AuthForm';
import Header from './components/Header';
import UploadForm from './components/UploadForm';
import Feed from './components/Feed';
import PlaylistPanel from './components/PlaylistPanel';
import ProfilePanel from './components/ProfilePanel';
import { getMe } from './api';
import { getToken, logout } from './utils/auth';

export default function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    async function loadMe() {
      const token = getToken();
      if (!token) return;
      try {
        const res = await getMe();
        if (res.user) setUser(res.user);
      } catch (err) {
        console.error('getMe', err);
      }
    }
    loadMe();
  }, []);

  function onAuth(u) {
    setUser(u);
  }

  function handleLogout() {
    logout();
    setUser(null);
  }

  return (
    <div className="app">
      <Header user={user} onLogout={handleLogout} />
      <main className="container">
        {!user ? (
          <div className="auth-wrap">
            <AuthForm onAuth={onAuth} />
          </div>
        ) : (
          <div className="layout">
            <aside className="left">
              {user.role === 'creator' && <UploadForm />}
              <ProfilePanel user={user} />
            </aside>

            <section className="center">
              <Feed />
            </section>

            <aside className="right">
              <PlaylistPanel />
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
