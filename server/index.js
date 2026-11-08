import express from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as store from './store.js';
import { CATEGORIES, TIER_COLORS } from './categories.js';
import * as sandbox from './sandbox.js';
import { OPEN, processReport, verify, approve, simulateDecay, summary, recentFeed } from './pipeline.js';

const PORT = process.env.PORT || 3000;
const WEBHOOK_SECRET = process.env.ELEVENLABS_WEBHOOK_SECRET || '';

store.load();
const app = express();

app.use(express.json({ limit: '2mb', verify: (req, _res, buf) => { req.rawBody = buf; } }));

// Permissive CORS so a frontend on another machine / port can hit this API directly.
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, ElevenLabs-Signature');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Optional HMAC check for ElevenLabs post-call webhooks ("t=<ts>,v0=<sha256 hex>").
function verifySignature(req) {
  if (!WEBHOOK_SECRET) return true;
  const header = req.get('ElevenLabs-Signature');
  if (!header) return false;
  const parts = Object.fromEntries(header.split(',').map((p) => p.split('=')));
  if (!parts.t || !parts.v0) return false;
  if (Math.abs(Date.now() / 1000 - Number(parts.t)) > 30 * 60) return false;
  const expected = crypto.createHmac('sha256', WEBHOOK_SECRET).update(`${parts.t}.${req.rawBody}`).digest('hex');
  return expected.length === parts.v0.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v0));
}

const wrap = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
};

// ── Voice intake ──
// Post-call webhook from ElevenLabs (signed when a secret is configured).
app.post('/api/webhook/voice-report', wrap(async (req, res) => {
  if (req.get('ElevenLabs-Signature') && !verifySignature(req)) return res.status(401).json({ error: 'bad signature' });
  if (req.body?.type && req.body.type !== 'post_call_transcription') return res.json({ ignored: req.body.type });
  const result = await processReport(req.body);
  res.json(result);
}));

// Same pipeline, shaped for an ElevenLabs *server tool* / client tool mid-call: the agent speaks `message`.
app.post('/api/tools/submit-report', wrap(async (req, res) => {
  const result = await processReport(req.body);
  res.json({ action: result.action, issue_id: result.issue?.id ?? null, pin_code: result.pin_code ?? null, message: result.message });
}));

// ── Dashboard data ──
app.get('/api/issues', (req, res) => {
  const list = req.query.all ? store.all() : store.all().filter((i) => OPEN.includes(i.status));
  res.json(list);
});
app.get('/api/issues/:id', (req, res) => {
  const i = store.get(req.params.id);
  i ? res.json(i) : res.status(404).json({ error: 'not found' });
});
app.post('/api/issues/:id/verify', (req, res) => {
  const v = req.body?.still_there;
  if (typeof v !== 'boolean') return res.status(400).json({ error: 'body must be { "still_there": true | false }' });
  const i = verify(req.params.id, v);
  i ? res.json(i) : res.status(404).json({ error: 'not found' });
});
app.post('/api/issues/:id/approve', (req, res) => {
  const i = approve(req.params.id);
  i ? res.json(i) : res.status(404).json({ error: 'not found' });
});
app.get('/api/summary', (_req, res) => res.json(summary()));
app.get('/api/feed', (_req, res) => res.json(recentFeed()));
app.get('/api/meta', (_req, res) => res.json({
  categories: Object.entries(CATEGORIES).map(([name, c]) => ({ name, ...c })),
  tier_colors: TIER_COLORS,
  groups: { roads: 'Roads & Signals', sanitation: 'Sanitation & Dumping', lighting_parks: 'Lighting & Parks' },
}));

// ── Demo controls ──
app.post('/api/simulate-decay', (req, res) => res.json(simulateDecay(Number(req.body?.days) || 14)));
app.post('/api/reset', wrap(async (_req, res) => {
  await sandbox.closeAll(); // before the data is wiped, so no case sandbox is orphaned
  store.reset();
  res.json({ ok: true, count: store.all().length });
}));

// ── Live updates (Server-Sent Events) ──
app.get('/api/stream', (req, res) => {
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  res.flushHeaders();
  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  const onIssues = (list) => send('issues', list.filter((i) => OPEN.includes(i.status)));
  const onReport = (e) => send('report', e);
  onIssues(store.all());
  store.events.on('issues', onIssues);
  store.events.on('report', onReport);
  const ping = setInterval(() => res.write(': ping\n\n'), 20000);
  req.on('close', () => {
    clearInterval(ping);
    store.events.off('issues', onIssues);
    store.events.off('report', onReport);
  });
});

app.get('/api/health', (_req, res) => res.json({ ok: true, issues: store.all().length }));

// Serve the built dashboard when present — one port for Daytona. The new UI (frontend/) wins over the old one (client/).
const dist = ['frontend', 'client']
  .map((d) => path.join(path.dirname(fileURLToPath(import.meta.url)), '..', d, 'dist'))
  .find((d) => fs.existsSync(path.join(d, 'index.html')));
if (dist) {
  console.log(`Serving dashboard from ${path.relative(process.cwd(), dist) || dist}`);
  app.use(express.static(dist));
  app.get(/^\/(?!api).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`SD Voice Town Hall API on http://localhost:${PORT}`);
  console.log(`Daytona per-case sandboxes: ${sandbox.enabled() ? 'ON' : 'off (set DAYTONA_API_KEY to enable)'}`);
  sandbox.startSweeper();
});
