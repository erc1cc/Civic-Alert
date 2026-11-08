// Flat JSON-file store with an event emitter for live (SSE) updates.
import fs from 'node:fs';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { fileURLToPath } from 'node:url';
import { buildSeed } from './seed.js';

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'data');
const FILE = path.join(DIR, 'issues.json');

export const events = new EventEmitter();
events.setMaxListeners(200);

let issues = [];

export function load() {
  fs.mkdirSync(DIR, { recursive: true });
  if (!fs.existsSync(FILE)) return reset();
  try {
    issues = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch {
    reset();
  }
  return issues;
}

export function reset() {
  issues = buildSeed();
  save();
  return issues;
}

export function save() {
  fs.writeFileSync(FILE, JSON.stringify(issues, null, 2));
  events.emit('issues', issues);
}

export const all = () => issues;
export const get = (id) => issues.find((i) => i.id === id);
export const add = (issue) => { issues.push(issue); return issue; };

export function nextId() {
  const max = issues.reduce((m, i) => Math.max(m, parseInt(String(i.id).split('-')[1], 10) || 0), 500);
  return `SD-${max + 1}`;
}

export function newPin() {
  const used = new Set(issues.filter((i) => i.status === 'preliminary').map((i) => i.pin_code));
  let pin;
  do pin = String(100 + Math.floor(Math.random() * 900)); while (used.has(pin));
  return pin;
}
