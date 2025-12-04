import React, { useState } from 'react';
import { register, login } from '../api';
import { setToken } from '../utils/auth';

/**
 * Props:
 * - onAuth(user) called after successful auth
 */
export default function AuthForm({ onAuth }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'learner' });
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const fn = mode === 'login' ? login : register;
      const res = await fn(form);
      if (res.token) {
        setToken(res.token);
        onAuth(res.user || { name: form.name, role: form.role });
      } else {
        alert(res.msg || 'Unknown response');
      }
    } catch (err) {
      console.error(err);
      alert(err.message || JSON.stringify(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-card card">
      <h3>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h3>
      <form onSubmit={submit}>
        {mode === 'register' && (
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Full name" required />
        )}
        <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="Email" type="email" required />
        <input value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Password" type="password" required />
        {mode === 'register' && (
          <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
            <option value="learner">Learner</option>
            <option value="creator">Creator</option>
          </select>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" className="btn" disabled={loading}>{loading ? 'Please wait...' : (mode === 'login' ? 'Login' : 'Create Account')}</button>
          <button type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="btn">{mode === 'login' ? 'Switch to Register' : 'Switch to Login'}</button>
        </div>
      </form>
    </div>
  );
}
