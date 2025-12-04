// central API helper (fetch-based)
const API_BASE = process.env.REACT_APP_API || '/api';

function authHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function jsonFetch(url, opts = {}) {
  const res = await fetch(`${API_BASE}${url}`, opts);
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const data = await res.json();
    if (!res.ok) throw data;
    return data;
  } else {
    // non-json responses
    const text = await res.text();
    if (!res.ok) throw { message: text };
    return text;
  }
}

export async function register(payload) {
  return jsonFetch('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function login(payload) {
  return jsonFetch('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function getMe() {
  return jsonFetch('/users/me', {
    method: 'GET',
    headers: { ...authHeaders() },
  });
}

export async function uploadVideo(formData) {
  return jsonFetch('/videos/upload', {
    method: 'POST',
    headers: { ...authHeaders() }, // DO NOT set Content-Type for FormData
    body: formData,
  });
}

export async function fetchFeed() {
  return jsonFetch('/videos/feed', {
    method: 'GET',
    headers: { ...authHeaders() },
  });
}

export async function followUser(userId) {
  return jsonFetch(`/users/${userId}/follow`, {
    method: 'POST',
    headers: { ...authHeaders() },
  });
}

export async function addToPlaylist(payload) {
  return jsonFetch('/users/playlist', {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function commentOnVideo(videoId, text) {
  return jsonFetch(`/videos/${videoId}/comment`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
}

export async function getVideoSummary(videoId) {
  // expects backend RAG/AI summary endpoint
  return jsonFetch(`/videos/${videoId}/summary`, {
    method: 'GET',
    headers: { ...authHeaders() },
  });
}

export default {
  register, login, getMe, uploadVideo, fetchFeed, followUser, addToPlaylist, commentOnVideo, getVideoSummary
};
