export function setToken(token) {
  localStorage.setItem('token', token);
}

export function getToken() {
  return localStorage.getItem('token');
}

export function logout() {
  localStorage.removeItem('token');
}

export function parseUserFromToken() {
  const t = getToken();
  if (!t) return null;
  try {
    const payload = JSON.parse(atob(t.split('.')[1]));
    // payload should contain user id, maybe name; backend may return user separately
    return payload;
  } catch (err) {
    return null;
  }
}
