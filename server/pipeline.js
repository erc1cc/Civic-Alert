// Intake → Categorizer → Analyst pipeline for voice reports.
import * as store from './store.js';
import { CATEGORIES, classifyText, matchCategory, tierFor, isUrgentWord } from './categories.js';
import { geocode } from './geocode.js';

export const OPEN = ['active', 'flagged_for_review', 'preliminary'];
const MERGE_RADIUS_M = 800;
const SHRINK = 0.6; // shrink by 40%
const MIN_RADIUS = 30;
const DAY = 24 * 3600 * 1000;

const feed = []; // recent pipeline events for the live feed
export const recentFeed = () => feed;
function log(entry) {
  const e = { at: new Date().toISOString(), ...entry };
  feed.unshift(e);
  feed.length = Math.min(feed.length, 50);
  store.events.emit('report', e);
  return e;
}

export function distanceM(a, b) {
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const truthy = (v) => v === true || ['true', 'yes', 'si', 'sí', '1'].includes(String(v ?? '').toLowerCase().trim());
const str = (v) => (v == null ? '' : typeof v === 'object' ? String(v.value ?? '') : String(v)).trim();

/**
 * Accepts either an ElevenLabs post-call webhook body
 *   { type: 'post_call_transcription', data: { conversation_id, transcript: [{role, message}], analysis: { data_collection_results } } }
 * or a flat payload from a client/server tool:
 *   { conversation_id, transcript, category, problem_description, location_description, cross_street_1,
 *     cross_street_2, landmark, neighborhood, language, ended_early, wants_to_finish_later, pin_code }
 */
export function normalizePayload(body = {}) {
  const d = body.data && (body.type || body.data.transcript) ? body.data : body;
  const dc = d.analysis?.data_collection_results || {};
  const pick = (k) => str(d[k] ?? dc[k]);

  let userText = '';
  if (Array.isArray(d.transcript)) {
    userText = d.transcript.filter((t) => t.role === 'user' && t.message).map((t) => t.message).join(' ');
  } else if (typeof d.transcript === 'string') userText = d.transcript;

  const cross = [pick('cross_street_1'), pick('cross_street_2')].filter(Boolean).join(' & ');
  const description = pick('problem_description') || str(d.analysis?.transcript_summary) || userText;
  const lang = (pick('language') || d.metadata?.language || d.conversation_initiation_client_data?.conversation_config_override?.agent?.language || 'en').toLowerCase();

  return {
    conversation_id: str(d.conversation_id) || null,
    category: pick('category'),
    description: description.slice(0, 400),
    fullText: [description, userText, pick('location_description'), pick('landmark')].join(' '),
    locationCandidates: [cross, pick('landmark'), pick('location_description'), pick('neighborhood'), userText].filter(Boolean),
    language: lang.startsWith('es') ? 'es' : 'en',
    ended_early: truthy(d.ended_early ?? dc.ended_early) || d.analysis?.call_successful === 'failure',
    wants_later: truthy(d.wants_to_finish_later ?? dc.wants_to_finish_later),
    pin_code: (pick('pin_code').match(/\d{3}/) || [null])[0],
  };
}

async function locate(candidates) {
  for (const c of candidates) {
    const g = await geocode(c);
    if (g) return g;
  }
  return null;
}

function titleFor(category, label, text) {
  const short = CATEGORIES[category]?.short || category;
  return `${isUrgentWord(text) ? 'Huge ' + short.toLowerCase() : short} at ${label}`;
}

function statusForTier(tier, forwarded) {
  return tier === 1 && !forwarded ? 'flagged_for_review' : 'active';
}

function newIssue({ category, tier, title, desc, geo, radius, status, language, pin, convo }) {
  const now = new Date().toISOString();
  return store.add({
    id: store.nextId(),
    pin_code: pin ?? null,
    status,
    category,
    tier,
    title,
    descriptions: desc ? [desc] : [],
    lat: geo.lat,
    lng: geo.lng,
    uncertainty_radius_meters: radius,
    call_count: 1,
    first_reported_at: now,
    last_reported_at: now,
    still_there_yes: 0,
    still_there_no: 0,
    language,
    neighborhood: geo.neighborhood || '',
    location_label: geo.label || '',
    flagged_for_review: status === 'flagged_for_review',
    forwarded_to_crew: false,
    conversation_ids: convo ? [convo] : [],
  });
}

const speakPin = (pin, lang) => (lang === 'es'
  ? `Su código es ${pin.split('').join('-')}. Llame de nuevo y diga este código para terminar su reporte.`
  : `Your PIN is ${pin.split('').join('-')}. Call back and say this PIN to finish your report.`);

/** Main entry point. Returns { action, issue, pin_code?, message }. */
export async function processReport(body) {
  const r = normalizePayload(body);
  const es = r.language === 'es';

  // Idempotency: the client tool and the post-call webhook may both report the same conversation.
  if (r.conversation_id) {
    const seen = store.all().find((i) => i.conversation_ids?.includes(r.conversation_id));
    if (seen) return { action: 'duplicate', issue: seen, message: 'This conversation was already recorded.' };
  }

  const category = matchCategory(r.category) || classifyText(r.fullText)?.category || null;
  const geo = await locate(r.locationCandidates);

  // ── Case 3b: caller returns with a PIN → reopen the preliminary draft ──
  if (r.pin_code) {
    const draft = store.all().find((i) => i.status === 'preliminary' && i.pin_code === r.pin_code);
    if (draft) {
      if (category) draft.category = category;
      draft.tier = Math.min(draft.tier, tierFor(draft.category, r.fullText));
      if (geo) { draft.lat = geo.lat; draft.lng = geo.lng; draft.location_label = geo.label; draft.neighborhood = geo.neighborhood || draft.neighborhood; }
      draft.title = titleFor(draft.category, draft.location_label || 'reported location', draft.descriptions.join(' ') + ' ' + r.fullText);
      if (r.description) draft.descriptions.push(r.description);
      draft.uncertainty_radius_meters = 60;
      draft.status = statusForTier(draft.tier, draft.forwarded_to_crew);
      draft.flagged_for_review = draft.status === 'flagged_for_review';
      draft.call_count += 1;
      draft.last_reported_at = new Date().toISOString();
      if (r.conversation_id) draft.conversation_ids.push(r.conversation_id);
      store.save();
      log({ action: 'reopened', issue_id: draft.id, message: `PIN ${r.pin_code} reopened ${draft.id} — pinpointed to 60 m` });
      return { action: 'reopened', issue: draft, message: es ? `Gracias, completamos su reporte ${draft.id}.` : `Thanks — your report ${draft.id} is now complete and on the map.` };
    }
  }

  // ── Case 3: caller is in a rush → preliminary draft with PIN ──
  // (Also used when a completed call is still missing category or location.)
  if (r.wants_later || (!r.ended_early && (!category || !geo))) {
    const g = geo || { lat: 32.7157, lng: -117.1611, label: 'San Diego (location pending)', neighborhood: '' };
    const cat = category || 'ROW Maintenance';
    const pin = store.newPin();
    const issue = newIssue({
      category: cat, tier: tierFor(cat, r.fullText), title: titleFor(cat, `${g.label} (approx.)`, r.fullText),
      desc: r.description, geo: g, radius: 1000, status: 'preliminary', language: r.language, pin, convo: r.conversation_id,
    });
    store.save();
    log({ action: 'preliminary', issue_id: issue.id, message: `Preliminary draft ${issue.id} saved with PIN ${pin}` });
    return { action: 'preliminary', issue, pin_code: pin, message: speakPin(pin, r.language) };
  }

  // ── Case 2: hung up early with too little info → discard ──
  if (!category || !geo) {
    log({ action: 'rejected', issue_id: null, message: 'Call ended early without a usable location + problem type' });
    return { action: 'rejected', issue: null, message: 'Not enough information to file a report.' };
  }

  const tier = tierFor(category, r.fullText);
  const radius = r.ended_early ? Math.max(geo.radius, 800) : geo.radius;

  // ── Spatial + semantic dedup → radius shrinking ──
  const match = store.all()
    .filter((i) => (i.status === 'active' || i.status === 'flagged_for_review') && i.category === category)
    .map((i) => ({ i, d: distanceM(i, geo) }))
    .filter((x) => x.d <= MERGE_RADIUS_M)
    .sort((a, b) => a.d - b.d)[0]?.i;

  if (match) {
    const before = match.uncertainty_radius_meters;
    // Weighted triangulation: tighter reports pull the pin harder.
    const w1 = 1 / before ** 2, w2 = 1 / radius ** 2;
    match.lat = +((match.lat * w1 + geo.lat * w2) / (w1 + w2)).toFixed(6);
    match.lng = +((match.lng * w1 + geo.lng * w2) / (w1 + w2)).toFixed(6);
    match.uncertainty_radius_meters = Math.max(MIN_RADIUS, Math.min(Math.round(before * SHRINK), radius));
    match.call_count += 1;
    if (r.description) match.descriptions.push(r.description);
    match.last_reported_at = new Date().toISOString();
    match.still_there_yes += 1;
    match.tier = Math.min(match.tier, tier);
    match.status = statusForTier(match.tier, match.forwarded_to_crew);
    match.flagged_for_review = match.status === 'flagged_for_review';
    if (r.conversation_id) match.conversation_ids.push(r.conversation_id);
    store.save();
    const msg = `Merged into ${match.id} (${match.call_count} calls) — radius ${before} m → ${match.uncertainty_radius_meters} m`;
    log({ action: 'merged', issue_id: match.id, message: msg, radius_before: before, radius_after: match.uncertainty_radius_meters });
    return {
      action: 'merged', issue: match,
      message: es ? `Gracias. Otras ${match.call_count - 1} personas ya reportaron esto; su llamada nos ayudó a ubicarlo mejor.`
        : `Thanks — ${match.call_count - 1} other residents already reported this, and your call helped us pinpoint it.`,
    };
  }

  const status = statusForTier(tier, false);
  const issue = newIssue({
    category, tier, title: titleFor(category, geo.label, r.fullText), desc: r.description, geo, radius, status,
    language: r.language, convo: r.conversation_id,
  });
  store.save();
  log({ action: 'created', issue_id: issue.id, message: `New ${category} (Tier ${tier}) ${issue.id}${status === 'flagged_for_review' ? ' — flagged for review' : ''}${r.ended_early ? ' — caller hung up, wide radius' : ''}` });
  return {
    action: 'created', issue,
    message: es ? `Gracias, su reporte ${issue.id} fue registrado.` : `Thanks — your report ${issue.id} has been filed with the City.`,
  };
}

export function verify(id, stillThere) {
  const i = store.get(id);
  if (!i) return null;
  if (stillThere) i.still_there_yes += 1;
  else i.still_there_no += 1;
  if (i.still_there_no >= 3 && i.status !== 'resolved') {
    i.status = 'resolved';
    i.flagged_for_review = false;
    i.resolved_at = new Date().toISOString();
    i.resolved_reason = 'community_verified';
    log({ action: 'resolved', issue_id: i.id, message: `${i.id} resolved — 3 residents say it's gone` });
  }
  store.save();
  return i;
}

export function approve(id) {
  const i = store.get(id);
  if (!i) return null;
  i.forwarded_to_crew = true;
  i.forwarded_at = new Date().toISOString();
  i.flagged_for_review = false;
  if (i.status === 'flagged_for_review') i.status = 'active';
  store.save();
  log({ action: 'approved', issue_id: i.id, message: `${i.id} approved & forwarded to ${CATEGORIES[i.category]?.dept || 'crew'}` });
  return i;
}

/** Simulate 2 weeks with zero new calls: every open issue drops a tier, Tier 4 resolves. */
export function simulateDecay(days = 14) {
  let dropped = 0, resolved = 0;
  const shift = (iso) => new Date(new Date(iso).getTime() - days * DAY).toISOString();
  for (const i of store.all()) {
    if (!OPEN.includes(i.status)) continue;
    i.first_reported_at = shift(i.first_reported_at);
    i.last_reported_at = shift(i.last_reported_at);
    if (i.tier >= 4) {
      i.status = 'resolved';
      i.flagged_for_review = false;
      i.resolved_at = new Date().toISOString();
      i.resolved_reason = 'decay_no_new_calls';
      resolved++;
    } else {
      i.tier += 1;
      if (i.status === 'flagged_for_review') { i.status = 'active'; i.flagged_for_review = false; }
      dropped++;
    }
  }
  store.save();
  log({ action: 'decay', issue_id: null, message: `Simulated ${days} days: ${dropped} issues dropped a tier, ${resolved} resolved` });
  return { dropped, resolved };
}

/** "What to Focus On" executive summary + headline stats. */
export function summary() {
  const open = store.all().filter((i) => OPEN.includes(i.status));
  const live = open.filter((i) => i.status !== 'preliminary');
  const score = (i) => i.call_count * (5 - i.tier);
  const top = (list) => list.sort((a, b) => score(b) - score(a))[0];
  const FIELDS = [
    ['Safety', live.filter((i) => i.tier === 1)],
    ['Infrastructure', live.filter((i) => i.tier > 1 && CATEGORIES[i.category]?.group === 'roads')],
    ['Sanitation', live.filter((i) => i.tier > 1 && CATEGORIES[i.category]?.group === 'sanitation')],
    ['Lighting & Parks', live.filter((i) => i.tier > 1 && CATEGORIES[i.category]?.group === 'lighting_parks')],
  ];
  const focus = FIELDS
    .map(([field, list]) => [field, top(list)])
    .filter(([, i]) => i)
    .sort((a, b) => (a[0] === 'Safety' ? -1 : b[0] === 'Safety' ? 1 : score(b[1]) - score(a[1])))
    .slice(0, 3)
    .map(([field, i]) => {
      const dept = CATEGORIES[i.category]?.dept || 'City staff';
      const recent = Date.now() - new Date(i.last_reported_at).getTime() < 7 * DAY;
      const tail = i.tier === 1 ? (i.forwarded_to_crew ? `Forwarded to ${dept}` : `Flagged for ${dept}`) : `${i.call_count} calls${recent ? ' this week' : ', none in 7+ days'}`;
      return { field, issue_id: i.id, headline: `${i.title.toUpperCase()} — ${tail}`, call_count: i.call_count, tier: i.tier, dept, neighborhood: i.neighborhood };
    });
  const weekAgo = Date.now() - 7 * DAY;
  return {
    focus,
    stats: {
      open: live.length,
      tier1: live.filter((i) => i.tier === 1).length,
      awaiting_review: live.filter((i) => i.status === 'flagged_for_review').length,
      preliminary: open.length - live.length,
      resolved: store.all().filter((i) => i.status === 'resolved').length,
      calls_this_week: live.filter((i) => new Date(i.last_reported_at).getTime() > weekAgo).reduce((s, i) => s + i.call_count, 0),
    },
  };
}
