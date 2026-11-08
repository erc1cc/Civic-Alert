#!/usr/bin/env node
// One-command deploy of SD Voice Town Hall to a Daytona sandbox.
//
//   DAYTONA_API_KEY=dtn_... npm run deploy:daytona
//
// First run: creates a PUBLIC sandbox (no auto-stop) and saves its id to .daytona-sandbox.
// Later runs: reuse that sandbox, re-upload the code, rebuild, and restart the server.
// Options (env vars):
//   DAYTONA_SANDBOX_ID   deploy into this sandbox instead of the saved / a new one
//   FRESH=1              ignore the saved sandbox and create a new one
//   RESET_DATA=1         wipe server/data/issues.json in the sandbox (back to the 35 seeded calls)
//   ELEVENLABS_WEBHOOK_SECRET   passed to the server for signed post-call webhooks
//   CASE_SANDBOXES=1     also turn on per-case sandboxes (server/sandbox.js) in the deployed app:
//                        the server gets DAYTONA_API_KEY and opens one sandbox per live case

import { Daytona } from '@daytona/sdk';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ID_FILE = path.join(ROOT, '.daytona-sandbox');
const PORT = 3000;

const step = (msg) => console.log(`\n▸ ${msg}`);
const fail = (msg) => { console.error(`\n✖ ${msg}`); process.exit(1); };

// ── Config ──
function readEnvFile(file) {
  if (!fs.existsSync(file)) return {};
  return Object.fromEntries(fs.readFileSync(file, 'utf8').split('\n')
    .map((l) => l.trim()).filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
}
const rootEnv = readEnvFile(path.join(ROOT, '.env'));
const clientEnv = readEnvFile(path.join(ROOT, 'client', '.env'));
const apiKey = process.env.DAYTONA_API_KEY || rootEnv.DAYTONA_API_KEY;
if (!apiKey) fail('Set DAYTONA_API_KEY (create one at app.daytona.io → API Keys), either in your shell or in a .env file in the project root.');

const agentId = process.env.VITE_ELEVENLABS_AGENT_ID || clientEnv.VITE_ELEVENLABS_AGENT_ID || '';
if (!agentId) console.warn('⚠ No VITE_ELEVENLABS_AGENT_ID found in client/.env: the call button will be disabled (the simulator still works).');
const webhookSecret = process.env.ELEVENLABS_WEBHOOK_SECRET || rootEnv.ELEVENLABS_WEBHOOK_SECRET || '';
const caseSandboxes = ['1', 'true', 'yes'].includes(String(process.env.CASE_SANDBOXES || rootEnv.CASE_SANDBOXES || '').toLowerCase());
// The hosting sandbox gets its own label. server/sandbox.js sweeps sandboxes labelled
// `app: sd-voice-town-hall` (one per case), and the host must never match that sweep.
const HOST_LABEL = 'sd-voice-town-hall-host';

// ── Files to ship: everything git knows about (tracked + new), minus ignored stuff like node_modules ──
const files = execSync('git ls-files -co --exclude-standard', { cwd: ROOT, encoding: 'utf8' })
  .split('\n').filter(Boolean)
  .filter((f) => fs.existsSync(path.join(ROOT, f)) && fs.statSync(path.join(ROOT, f)).isFile())
  .filter((f) => !f.startsWith('.claude/') && f !== '.daytona-sandbox');

const daytona = new Daytona({ apiKey });

// ── Get or create the sandbox ──
let sandbox;
const savedId = process.env.DAYTONA_SANDBOX_ID || (!process.env.FRESH && fs.existsSync(ID_FILE) ? fs.readFileSync(ID_FILE, 'utf8').trim() : '');
if (savedId) {
  step(`Reusing sandbox ${savedId}`);
  try {
    sandbox = await daytona.get(savedId);
    if (sandbox.state !== 'started') {
      step('Starting sandbox…');
      await sandbox.start(120);
    }
  } catch (e) {
    console.warn(`  Could not reuse it (${e.message}); creating a new one.`);
    sandbox = null;
  }
}
if (!sandbox) {
  step('Creating a public Daytona sandbox (auto-stop disabled)…');
  sandbox = await daytona.create({
    language: 'typescript',
    public: true,            // judges + ElevenLabs webhooks can reach the preview URL without a token
    autoStopInterval: 0,     // don't fall asleep mid-demo
    labels: { app: HOST_LABEL },
  }, { timeout: 180 });
  fs.writeFileSync(ID_FILE, sandbox.id);
  console.log(`  Created ${sandbox.id} (saved to .daytona-sandbox)`);
}

const run = async (cmd, { cwd, env, timeout = 600, quiet = false } = {}) => {
  const r = await sandbox.process.executeCommand(cmd, cwd, env, timeout);
  if (!quiet && r.result?.trim()) console.log(r.result.trim().split('\n').slice(-15).map((l) => `  ${l}`).join('\n'));
  return r;
};

const nodeVersion = (await run('node -v', { quiet: true })).result.trim();
if (!/^v(1[89]|[2-9]\d)\./.test(nodeVersion)) fail(`The sandbox needs Node 18+ but has "${nodeVersion || 'none'}".`);
console.log(`  Node ${nodeVersion}`);

const home = (await sandbox.getUserHomeDir()) || '/home/daytona';
const APP = `${home}/app`;

// ── Upload code ──
step(`Uploading ${files.length} files…`);
await run(`mkdir -p ${APP} && cd ${APP} && rm -rf client/src server/*.js scripts agent`, { quiet: true });
for (let i = 0; i < files.length; i += 50) {
  await sandbox.fs.uploadFiles(files.slice(i, i + 50).map((f) => ({ source: path.join(ROOT, f), destination: `${APP}/${f}` })));
}
if (process.env.RESET_DATA) await run(`rm -f ${APP}/server/data/issues.json`, { quiet: true });

// ── Install + build (agent id is baked into the frontend at build time) ──
step('Installing dependencies and building the dashboard (1–2 min)…');
const build = await run('npm install --no-audit --no-fund && npm run build', {
  cwd: APP, env: { VITE_ELEVENLABS_AGENT_ID: agentId }, timeout: 900,
});
if (build.exitCode !== 0) fail('Build failed in the sandbox (see output above).');

// ── (Re)start the server in the background ──
step('Starting the server…');
// Passed as the command's environment (not spliced into the command text) so secrets don't need shell quoting.
const serverEnv = {
  PORT: String(PORT),
  ...(webhookSecret && { ELEVENLABS_WEBHOOK_SECRET: webhookSecret }),
  ...(caseSandboxes ? { DAYTONA_API_KEY: apiKey } : { DISABLE_DAYTONA: '1' }),
};
console.log(`  Per-case sandboxes: ${caseSandboxes ? 'ON' : 'off (set CASE_SANDBOXES=1 to enable)'}`);
await run("pkill -f 'node server/index.js' || true", { quiet: true });
await run(`cd ${APP} && nohup node server/index.js > server.log 2>&1 &`, { quiet: true, env: serverEnv, timeout: 30 });

let healthy = false;
for (let i = 0; i < 20 && !healthy; i++) {
  await new Promise((r) => setTimeout(r, 1000));
  const h = await run(`curl -s localhost:${PORT}/api/health`, { quiet: true, timeout: 10 });
  healthy = h.result.includes('"ok":true');
}
if (!healthy) {
  await run(`tail -20 ${APP}/server.log`);
  fail('Server did not come up (log above).');
}

// ── Public URL ──
const preview = await sandbox.getPreviewLink(PORT);
const url = preview.url.replace(/\/$/, '');
console.log(`
✔ SD Voice Town Hall is live

  Dashboard:          ${url}
  Health check:       ${url}/api/health
  ElevenLabs webhook: ${url}/api/webhook/voice-report
  Server tool URL:    ${url}/api/tools/submit-report
  Sandbox id:         ${sandbox.id}

Next: add "${new URL(url).hostname}" to your ElevenLabs agent's allowlist (Security tab).
Server logs:  re-run with your terminal, or open the sandbox in app.daytona.io and run: tail -f ~/app/server.log
`);
