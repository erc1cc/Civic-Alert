export const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '');
export const AGENT_ID = import.meta.env.VITE_ELEVENLABS_AGENT_ID || '';

async function req(path, opts = {}) {
  const r = await fetch(API_BASE + path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!r.ok) throw new Error(`${r.status} ${path}`);
  return r.json();
}

export const api = {
  issues: () => req('/api/issues'),
  summary: () => req('/api/summary'),
  feed: () => req('/api/feed'),
  meta: () => req('/api/meta'),
  verify: (id, still_there) => req(`/api/issues/${id}/verify`, { method: 'POST', body: { still_there } }),
  approve: (id) => req(`/api/issues/${id}/approve`, { method: 'POST' }),
  decay: () => req('/api/simulate-decay', { method: 'POST', body: { days: 14 } }),
  reset: () => req('/api/reset', { method: 'POST' }),
  submit: (payload) => req('/api/tools/submit-report', { method: 'POST', body: payload }),
  streamUrl: () => `${API_BASE}/api/stream`,
};

export const TIER_COLORS = { 1: '#991b1b', 2: '#ea580c', 3: '#d97706', 4: '#eab308' };
export const TIER_LABEL = { 1: 'Safety Hazard', 2: 'High Urgency', 3: 'Medium', 4: 'Low / Routine' };
// Tier 1's darkest red is hard to see on a dark map; use a brighter stroke for outlines.
export const TIER_STROKE = { 1: '#ef4444', 2: '#f97316', 3: '#f59e0b', 4: '#facc15' };

export function timeAgo(iso) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 45) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} hr ago`;
  const d = Math.round(s / 86400);
  return `${d} day${d === 1 ? '' : 's'} ago`;
}
