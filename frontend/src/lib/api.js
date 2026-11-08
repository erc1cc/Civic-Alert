// Data layer. Talks to the backend (GET /api/issues, POST /api/issues/:id/verify, POST /api/simulate-decay).
// If the backend is unreachable, falls back to an in-browser store seeded from data/issues.json that applies
// the same rules, so the dashboard is always demoable.
import seed from '../../../data/issues.json';
import { isHeld } from './categories';

const BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '');
const DAY = 86400e3;

let mode = null; // 'live' | 'demo'
let local = structuredClone(seed);
let sampleCursor = 0;

async function request(path, options = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4000);
  try {
    const res = await fetch(`${BASE}${path}`, {
      ...options,
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    });
    if (!res.ok) throw new Error(`the backend answered ${res.status}${res.statusText ? ` ${res.statusText}` : ''}`);
    const type = res.headers.get('content-type') || '';
    if (!type.includes('application/json')) throw new Error('the backend sent something other than JSON');
    return await res.json();
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('the backend took longer than 4 seconds to answer');
    if (err instanceof TypeError) throw new Error('the backend could not be reached');
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export const getMode = () => mode;

export async function fetchIssues() {
  if (mode !== 'demo') {
    try {
      const data = await request('/api/issues');
      mode = 'live';
      return Array.isArray(data) ? data : data.issues ?? [];
    } catch (err) {
      if (mode === 'live') throw err; // backend was up and just failed: surface it
      mode = 'demo';
    }
  }
  return structuredClone(local);
}

/** Retry the live backend (e.g. after starting it). */
export function resetMode() {
  mode = null;
}

// ---- local mirrors of backend rules ----
function findLocal(id) {
  const i = local.find((x) => x.id === id);
  if (!i) throw new Error(`issue ${id} is no longer on the map`);
  return i;
}

function localVerify(id, stillThere) {
  const i = findLocal(id);
  if (stillThere) i.still_there_yes += 1;
  else {
    i.still_there_no += 1;
    if (i.still_there_no >= 3) i.status = 'resolved';
  }
  return structuredClone(i);
}

function localApprove(id) {
  const i = findLocal(id);
  i.flagged_for_review = false;
  i.status = 'active';
  i.forwarded_to_crew_at = new Date().toISOString();
  return structuredClone(i);
}

// Two weeks with no new calls. Safety items still awaiting a person (Tier 1 or flagged) are held:
// silence is not evidence that a hazard went away.
function localDecay() {
  let downgraded = 0;
  let resolved = 0;
  let held = 0;
  for (const i of local) {
    if (i.status === 'resolved') continue;
    i.first_reported_at = new Date(new Date(i.first_reported_at).getTime() - 14 * DAY).toISOString();
    i.last_reported_at = new Date(new Date(i.last_reported_at).getTime() - 14 * DAY).toISOString();
    if (isHeld(i)) {
      held++;
    } else if (i.tier >= 4) {
      i.status = 'resolved';
      resolved++;
    } else {
      i.tier += 1;
      downgraded++;
    }
  }
  return { downgraded, resolved, held };
}

export async function verifyIssue(id, stillThere) {
  if (mode === 'live') {
    return request(`/api/issues/${encodeURIComponent(id)}/verify`, {
      method: 'POST',
      body: JSON.stringify({ still_there: stillThere }),
    });
  }
  return localVerify(id, stillThere);
}

export async function approveIssue(id) {
  if (mode === 'live') {
    return request(`/api/issues/${encodeURIComponent(id)}/approve`, { method: 'POST' });
  }
  return localApprove(id);
}

/** File a voice report through the backend pipeline (the ElevenLabs agent's submit_report tool, or a hang-up). */
export async function submitReport(payload) {
  return request('/api/tools/submit-report', { method: 'POST', body: JSON.stringify(payload) });
}

export async function simulateDecay() {
  if (mode === 'live') return request('/api/simulate-decay', { method: 'POST' });
  return localDecay();
}

/** Demo mode only: put every issue back to the seeded state. */
export function resetDemo() {
  local = structuredClone(seed);
  sampleCursor = 0;
}

// ---- scripted sample calls (demo mode, or when no ElevenLabs agent is configured) ----
// Each one shows a different step of the loop: corroborating an existing report (halo tightens),
// a caller who can't name a cross street creating a preliminary draft, and a second caller promoting a draft.
// `target` is where the map frames while the caller is still talking.
export const SAMPLE_CALLS = [
  {
    target: { id: 'SD-135', lat: 32.7316, lng: -117.1556, category: 'Tree Maintenance', status: 'flagged_for_review' },
    lines: [
      ['agent', 'San Diego Voice Town Hall. What’s the problem, and what’s near it?'],
      ['caller', 'A huge palm frond is lying across Laurel Street, right where it meets the Cabrillo Bridge.'],
      ['agent', 'Is it blocking traffic right now?'],
      ['caller', 'Yeah, cars are swerving into the other lane to get around it.'],
      ['agent', 'Thank you. That matches a report we already have. I’ve added your call to it.'],
    ],
    apply() {
      const i = findLocal('SD-135');
      const before = i.uncertainty_radius_meters;
      i.lat = 32.7314;
      i.lng = -117.1559;
      i.uncertainty_radius_meters = 90;
      i.call_count += 1;
      i.last_reported_at = new Date().toISOString();
      i.descriptions = [...i.descriptions, 'Palm frond across Laurel St at the Cabrillo Bridge, cars swerving around it.'];
      return { id: i.id, kind: 'merged', title: i.title, before, after: 90 };
    },
  },
  {
    target: { id: 'SD-136', lat: 32.6987, lng: -117.1442, category: 'Sidewalk Repair Issue', status: 'preliminary' },
    lines: [
      ['agent', 'San Diego Voice Town Hall. What’s the problem, and what’s near it?'],
      ['caller', 'The sidewalk is lifted in front of the elementary school on Logan Avenue. Kids keep tripping on it.'],
      ['agent', 'Do you know the nearest cross street?'],
      ['caller', 'I’m not sure… it’s near the church.'],
      ['agent', 'Thanks. I’ve created a preliminary report. Your PIN is 5-8-6 to confirm it later.'],
    ],
    apply() {
      const now = new Date().toISOString();
      const issue = {
        id: 'SD-136',
        pin_code: 586,
        status: 'preliminary',
        flagged_for_review: false,
        category: 'Sidewalk Repair Issue',
        tier: 2,
        title: 'Raised sidewalk outside the elementary school on Logan Ave',
        descriptions: ['The sidewalk is lifted in front of the elementary school on Logan Avenue. Kids keep tripping on it.'],
        lat: 32.6987,
        lng: -117.1442,
        uncertainty_radius_meters: 450,
        call_count: 1,
        first_reported_at: now,
        last_reported_at: now,
        still_there_yes: 0,
        still_there_no: 0,
      };
      local = [...local.filter((x) => x.id !== issue.id), issue];
      return { id: issue.id, kind: 'draft', title: issue.title, after: issue.uncertainty_radius_meters, pin: issue.pin_code };
    },
  },
  {
    target: { id: 'SD-130', lat: 32.7956, lng: -117.2347, category: 'Pothole', status: 'preliminary' },
    lines: [
      ['agent', 'San Diego Voice Town Hall. What’s the problem, and what’s near it?'],
      ['caller', 'There’s a pothole on Grand Avenue, right in front of the taco shop at Ingraham.'],
      ['agent', 'Which lane is it in?'],
      ['caller', 'Eastbound, the right lane. It’s deep. My whole car jolted.'],
      ['agent', 'Thanks. Another caller reported this earlier. Your landmark confirms the location.'],
    ],
    apply() {
      const i = findLocal('SD-130');
      const before = i.uncertainty_radius_meters;
      i.status = 'active';
      i.pin_code = null;
      i.lat = 32.79565;
      i.lng = -117.2342;
      i.uncertainty_radius_meters = 60;
      i.call_count += 1;
      i.last_reported_at = new Date().toISOString();
      i.descriptions = [...i.descriptions, 'Deep pothole in the eastbound right lane of Grand Ave at Ingraham, by the taco shop.'];
      return { id: i.id, kind: 'promoted', title: i.title, before, after: 60 };
    },
  },
];

export const nextSampleIndex = () => (sampleCursor < SAMPLE_CALLS.length ? sampleCursor : null);

/** Apply the next sample call to the in-browser store and say what changed. */
export function fileSampleCall() {
  const call = SAMPLE_CALLS[sampleCursor];
  if (!call) throw new Error('all sample calls have been played');
  const result = call.apply();
  sampleCursor += 1;
  return result;
}
