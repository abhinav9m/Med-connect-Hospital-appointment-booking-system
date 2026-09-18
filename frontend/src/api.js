export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function getHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('medconnect_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function apiGet(path) {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || data.msg || 'API Error');
    return data;
  } catch (e) {
    console.warn(`[apiGet Error] ${path}:`, e.message);
    return null;
  }
}

export async function apiPost(path, body) {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error || data.msg || 'Request failed' };
    return data;
  } catch (e) {
    console.warn(`[apiPost Error] ${path}:`, e.message);
    return { success: false, error: e.message };
  }
}

export async function apiPut(path, body) {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error || data.msg || 'Request failed' };
    return data;
  } catch (e) {
    console.warn(`[apiPut Error] ${path}:`, e.message);
    return { success: false, error: e.message };
  }
}

export async function apiPatch(path, body) {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error || data.msg || 'Request failed' };
    return data;
  } catch (e) {
    console.warn(`[apiPatch Error] ${path}:`, e.message);
    return { success: false, error: e.message };
  }
}

export async function apiDelete(path) {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error || data.msg || 'Request failed' };
    return data;
  } catch (e) {
    console.warn(`[apiDelete Error] ${path}:`, e.message);
    return { success: false, error: e.message };
  }
}
