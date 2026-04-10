const API_BASE_URL = 'http://localhost:8000';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
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

export async function searchMemories(query) {
  return request('/search', {
    method: 'POST',
    body: JSON.stringify({ query }),
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