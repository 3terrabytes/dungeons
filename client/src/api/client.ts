// Tiny fetch wrapper. Sends credentials (httpOnly JWT cookie) on every call.

const BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) msg = body.error;
    } catch { /* non-JSON */ }
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export interface SaveData {
  highestFloor: number;
  totalGold: number;
  permanentBoosts: { maxHpBonus: number; atkBonus: number };
  unlockedItems: string[];
}

export const api = {
  health: () => req<{ ok: true }>('/api/health'),
  register: (username: string, password: string) =>
    req<{ username: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  login: (username: string, password: string) =>
    req<{ username: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  logout: () => req<void>('/api/auth/logout', { method: 'POST' }),
  me: () => req<{ username: string; createdAt: string }>('/api/me'),
  getSave: () => req<SaveData>('/api/save'),
  putSave: (data: SaveData) =>
    req<SaveData>('/api/save', { method: 'PUT', body: JSON.stringify(data) }),
};
