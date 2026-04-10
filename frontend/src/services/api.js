const API_BASE_URL = 'http://localhost:8000';
const TOKEN_KEY = 'memory-app-auth-token';

let authToken =
  typeof window !== 'undefined' ? window.localStorage.getItem(TOKEN_KEY) || '' : '';

export function getStoredToken() {
  return authToken;
}

export function setAuthToken(token) {
  authToken = token || '';
  if (typeof window !== 'undefined') {
    if (authToken) {
      window.localStorage.setItem(TOKEN_KEY, authToken);
    } else {
      window.localStorage.removeItem(TOKEN_KEY);
    }
  }
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof data === 'string'
        ? data
        : data?.detail || data?.message || 'Something went wrong.';
    throw new Error(message);
  }

  return data;
}

export async function fetchHealth() {
  return request('/health');
}

export async function registerUser(payload) {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function loginUser(payload) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchCurrentUser() {
  return request('/auth/me');
}

export async function logoutUser() {
  return request('/auth/logout', {
    method: 'POST',
  });
}

export async function fetchMemories() {
  return request('/memories');
}

export async function fetchMemoryById(memoryId) {
  return request(`/memories/${memoryId}`);
}

export async function createMemory(payload) {
  return request('/memories', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function searchMemories(payload) {
  return request('/search', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function deleteMemory(memoryId) {
  return request(`/memories/${memoryId}`, {
    method: 'DELETE',
  });
}

export async function updateMemory(memoryId, payload) {
  return request(`/memories/${memoryId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function fetchInsights() {
  return request('/insights');
}

export async function exportMemories() {
  return request('/memories/export/all');
}
