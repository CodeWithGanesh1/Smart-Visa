const BASE = (import.meta.env.VITE_API_URL || ' https://smart-visa.onrender.com').replace(/\/$/, '');

export async function api(path, { method = 'GET', body, blob } = {}) {
  const token = localStorage.getItem('token');
  let res;
  try {
    res = await fetch(`${BASE}/api${path}`, {
      method,
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Cannot reach the server. Check your internet connection. If the server was idle, wait 30 seconds and retry.');
  }
  if (blob) {
    if (!res.ok) throw new Error('Download failed');
    return res.blob();
  }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && token) {
    // token expired or account disabled: clear it and send the user to the login page
    localStorage.removeItem('token');
    window.location.href = '/login';
  }
  if (!res.ok) throw new Error(data.message || 'Something went wrong');
  return data;
}

export async function openBlob(path, filename) {
  const b = await api(path, { blob: true });
  const url = URL.createObjectURL(b);
  if (filename) {
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
  } else {
    window.open(url, '_blank');
  }
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
