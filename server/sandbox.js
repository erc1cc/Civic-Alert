// One Daytona sandbox per live case (issue): opened when a case goes live, deleted when it resolves.
//
// Opt-in: with no DAYTONA_API_KEY (or DISABLE_DAYTONA=1) every function here is a no-op,
// so the app behaves exactly as before. Sandbox work never sits in the voice-call response
// path, and a Daytona failure never breaks report intake.
import * as store from './store.js';

const APP_LABEL = 'sd-voice-town-hall';
const LIVE = ['active', 'flagged_for_review']; // preliminary drafts are not cases yet
const CREATE_TIMEOUT_S = 90;
const DELETE_TIMEOUT_S = 60;
// Safety net: sandboxes are ephemeral, so Daytona stops AND deletes one that sits idle this long,
// even if this server crashed before it could close the case.
const IDLE_MINUTES = Number(process.env.DAYTONA_IDLE_MINUTES) || 60;
const SWEEP_EVERY_MS = 15 * 60 * 1000;

let client = null;
let epoch = 0; // bumped by closeAll() so in-flight opens know they were orphaned by a reset
const opening = new Map(); // case id -> Promise<Sandbox> while a sandbox is being created
const live = new Map(); // case id -> Sandbox handle for this process

export const enabled = () => !!client || (!!process.env.DAYTONA_API_KEY && process.env.DISABLE_DAYTONA !== '1');

/** Test hook: inject a fake Daytona client. */
export function _setClient(c) { client = c; }

async function getClient() {
  if (client) return client;
  if (!enabled()) return null;
  const { Daytona } = await import('@daytona/sdk');
  client = new Daytona(); // reads DAYTONA_API_KEY (and optional DAYTONA_API_URL / DAYTONA_TARGET) from env
  return client;
}

const isLive = (id) => LIVE.includes(store.get(id)?.status);
const isNotFound = (e) => e?.statusCode === 404 || e?.status === 404 || /not found/i.test(e?.message || '');

function caseContext(i) {
  // Deliberately leaves out pin_code and conversation_ids.
  return {
    id: i.id, status: i.status, category: i.category, tier: i.tier, title: i.title,
    descriptions: i.descriptions, lat: i.lat, lng: i.lng, location_label: i.location_label,
    neighborhood: i.neighborhood, language: i.language, call_count: i.call_count,
    first_reported_at: i.first_reported_at, last_reported_at: i.last_reported_at,
  };
}

async function adopt(daytona, issue) {
  if (!issue.sandbox_id) return null;
  try {
    return await daytona.get(issue.sandbox_id);
  } catch (e) {
    if (isNotFound(e)) return null; // idle auto-delete got it; make a fresh one
    throw e;
  }
}

/**
 * Ensure this case has a sandbox and return it (null when Daytona is off).
 * Safe to call repeatedly: concurrent and repeat calls share one sandbox.
 * Rejects if Daytona fails; callers that don't care should catch.
 */
export function openCase(issue) {
  if (!enabled()) return Promise.resolve(null);
  if (live.has(issue.id)) return Promise.resolve(live.get(issue.id));
  if (opening.has(issue.id)) return opening.get(issue.id);

  const startedEpoch = epoch;
  const p = (async () => {
    const daytona = await getClient();
    let sandbox = await adopt(daytona, issue);
    let created = false;
    if (!sandbox) {
      sandbox = await daytona.create(
        {
          language: 'javascript',
          labels: { app: APP_LABEL, case: issue.id },
          ephemeral: true,
          autoStopInterval: IDLE_MINUTES,
        },
        { timeout: CREATE_TIMEOUT_S },
      );
      created = true;
    }
    try {
      // The case may have resolved (or the data been reset) while the sandbox was starting.
      if (epoch !== startedEpoch || !isLive(issue.id)) throw Object.assign(new Error('case closed during open'), { closedDuringOpen: true });
      if (created) await sandbox.fs.uploadFile(Buffer.from(JSON.stringify(caseContext(issue), null, 2)), 'case.json');
    } catch (e) {
      await sandbox.delete(DELETE_TIMEOUT_S).catch((err) => console.error(`[sandbox] cleanup of ${sandbox.id} failed:`, err.message));
      if (e.closedDuringOpen) return null;
      throw e;
    }
    live.set(issue.id, sandbox);
    const current = store.get(issue.id);
    if (current && current.sandbox_id !== sandbox.id) { current.sandbox_id = sandbox.id; store.save(); }
    console.log(`[sandbox] ${issue.id} opened ${sandbox.id}`);
    return sandbox;
  })().finally(() => opening.delete(issue.id));

  opening.set(issue.id, p);
  return p;
}

/** Delete the case's sandbox. Never throws. Treats an already-deleted sandbox as success. */
export async function closeCase(id, reason = 'resolved') {
  if (!enabled()) return;
  let sandbox = live.get(id) || null;
  const pending = opening.get(id);
  if (!sandbox && pending) sandbox = await pending.catch(() => null);
  const issue = store.get(id);
  const sandboxId = sandbox?.id || issue?.sandbox_id;
  if (!sandboxId) return;
  try {
    const target = sandbox || (await (await getClient()).get(sandboxId));
    await target.delete(DELETE_TIMEOUT_S);
  } catch (e) {
    if (!isNotFound(e)) {
      // Keep issue.sandbox_id so the periodic sweep retries.
      console.error(`[sandbox] failed to delete ${sandboxId} for ${id}:`, e.message);
      return;
    }
  }
  live.delete(id);
  if (issue?.sandbox_id) { delete issue.sandbox_id; store.save(); }
  console.log(`[sandbox] ${id} closed ${sandboxId} (${reason})`);
}

/** Close every case sandbox this app owns. Call before wiping the data (the reset button). */
export async function closeAll() {
  if (!enabled()) return;
  epoch++;
  const ids = new Set([...live.keys(), ...opening.keys(), ...store.all().filter((i) => i.sandbox_id).map((i) => i.id)]);
  await Promise.allSettled([...ids].map((id) => closeCase(id, 'reset')));
}

/** Delete this app's sandboxes whose case is no longer live (crash leftovers, failed deletes). */
export async function sweep() {
  if (!enabled()) return 0;
  const daytona = await getClient();
  let deleted = 0;
  for await (const sb of daytona.list({ labels: { app: APP_LABEL } })) {
    const id = sb.labels?.case;
    if (!id || opening.has(id) || isLive(id)) continue;
    try {
      await sb.delete(DELETE_TIMEOUT_S);
      deleted++;
      const issue = store.get(id);
      if (issue?.sandbox_id === sb.id) { delete issue.sandbox_id; store.save(); }
      live.delete(id);
    } catch (e) {
      if (!isNotFound(e)) console.error(`[sandbox] sweep could not delete ${sb.id}:`, e.message);
    }
  }
  if (deleted) console.log(`[sandbox] sweep removed ${deleted} leftover sandbox(es)`);
  return deleted;
}

/** Sweep once now and then periodically. Returns the timer (unref'd so it never blocks exit). */
export function startSweeper() {
  if (!enabled()) return null;
  const run = () => sweep().catch((e) => console.error('[sandbox] sweep failed:', e.message));
  run();
  return setInterval(run, SWEEP_EVERY_MS).unref();
}
