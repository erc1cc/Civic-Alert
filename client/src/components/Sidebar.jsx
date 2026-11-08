import { useMemo, useState } from 'react';
import { api, TIER_COLORS, timeAgo } from '../api.js';
import CallWidget from './CallWidget.jsx';
import { ICON } from './Toasts.jsx';

const FIELD_ICON = { Safety: '🚨', Infrastructure: '🛣️', Sanitation: '🗑️', 'Lighting & Parks': '💡' };

function Section({ title, right, children }) {
  return (
    <section className="border-b border-gray-800/80 px-4 py-4">
      <div className="mb-2.5 flex items-center justify-between">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-400">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

function FocusCard({ summary, flyTo }) {
  const focus = summary?.focus || [];
  return (
    <Section title="✨ What to focus on" right={<span className="text-[10px] text-gray-600">AI executive summary</span>}>
      <div className="space-y-2">
        {focus.length === 0 && <div className="text-sm text-gray-500">No open hotspots.</div>}
        {focus.map((f) => (
          <button key={f.field} onClick={() => flyTo(f.issue_id)}
            className="block w-full rounded-xl border border-gray-800 bg-gray-900/70 p-3 text-left transition hover:border-gray-600">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: TIER_COLORS[f.tier] === '#991b1b' ? '#f87171' : TIER_COLORS[f.tier] }}>
                {FIELD_ICON[f.field]} {f.field}
              </span>
              <span className="text-[10px] text-gray-500">{f.neighborhood}</span>
            </div>
            <div className="mt-1 text-[13px] font-extrabold leading-snug text-white">{f.headline}</div>
          </button>
        ))}
      </div>
    </Section>
  );
}

function ReviewQueue({ issues, onApprove, flyTo }) {
  const queue = useMemo(() => issues.filter((i) => i.status === 'flagged_for_review').sort((a, b) => b.call_count - a.call_count), [issues]);
  return (
    <Section title="🚨 Urgent review queue" right={queue.length > 0 && <span className="rounded-full bg-red-900 px-2 py-0.5 text-[11px] font-bold text-red-100">{queue.length}</span>}>
      {queue.length === 0 && <div className="rounded-xl border border-emerald-900/60 bg-emerald-950/30 p-3 text-sm text-emerald-300">✓ No hazards awaiting review</div>}
      <div className="space-y-2">
        {queue.map((i) => (
          <div key={i.id} className="rounded-xl border border-red-900/60 bg-red-950/25 p-3">
            <button onClick={() => flyTo(i.id)} className="block w-full text-left">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-red-300">Tier 1 · {i.category}</div>
              <div className="text-sm font-bold text-white">{i.title}</div>
              <div className="text-xs text-gray-400">{i.location_label} · {i.call_count} call{i.call_count === 1 ? '' : 's'} · {timeAgo(i.last_reported_at)}</div>
            </button>
            <button onClick={() => onApprove(i.id)}
              className="mt-2 w-full rounded-lg bg-red-700 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-red-600">
              ✓ Approve &amp; Forward to Crew
            </button>
          </div>
        ))}
      </div>
    </Section>
  );
}

function LiveFeed({ feed, flyTo }) {
  return (
    <Section title="📡 Live call feed">
      {feed.length === 0 && <div className="text-sm text-gray-500">Waiting for calls…</div>}
      <ul className="space-y-1.5">
        {feed.slice(0, 12).map((e, k) => (
          <li key={e.at + k}>
            <button onClick={() => flyTo(e.issue_id)} disabled={!e.issue_id}
              className="flex w-full gap-2 rounded-lg px-2 py-1.5 text-left text-xs hover:bg-gray-800/60 disabled:hover:bg-transparent">
              <span>{ICON[e.action] || '•'}</span>
              <span className="flex-1 text-gray-300">{e.message}</span>
              <span className="shrink-0 text-gray-600">{timeAgo(e.at)}</span>
            </button>
          </li>
        ))}
      </ul>
    </Section>
  );
}

const PRESETS = [
  { label: '🎯 Merge: pothole at 7th & Market', transcript: "There's another huge pothole at 7th and Market by the parking garage" },
  { label: '🇲🇽 Semáforo apagado (ES)', transcript: 'El semáforo en University y la treinta está apagado', language: 'es' },
  { label: '🌳 New Tier 1: tree down', transcript: 'A tree fell across the road near Chicano Park' },
  { label: '📝 In a rush → PIN', transcript: 'Trash dumped somewhere by Snapdragon, gotta run', later: true },
  { label: '🔓 Return with PIN 402', transcript: 'The sidewalk is cracked at University and Ray', pin: '402', language: 'es' },
  { label: '📵 Hung up early', transcript: 'There is a dead dog near Ocean Beach and', early: true },
];

function Simulator({ toast }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ transcript: '', language: 'en', early: false, later: false, pin: '' });
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const submit = async (e) => {
    e?.preventDefault();
    if (!f.transcript.trim() && !f.pin) return;
    setBusy(true);
    try {
      const r = await api.submit({
        transcript: f.transcript, language: f.language, ended_early: f.early,
        wants_to_finish_later: f.later, pin_code: f.pin || undefined,
        conversation_id: `sim-${Date.now()}`,
      });
      setResult(r);
    } catch {
      toast('Could not reach the server', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section title="⌨️ No mic? Simulate a call"
      right={<button onClick={() => setOpen((o) => !o)} className="text-xs font-semibold text-orange-400 hover:text-orange-300">{open ? 'Hide' : 'Show'}</button>}>
      {open && (
        <form onSubmit={submit} className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button type="button" key={p.label}
                onClick={() => { setResult(null); setF({ transcript: p.transcript, language: p.language || 'en', early: !!p.early, later: !!p.later, pin: p.pin || '' }); }}
                className="rounded-full border border-gray-700 bg-gray-900 px-2.5 py-1 text-[11px] text-gray-300 hover:border-gray-500 hover:text-white">
                {p.label}
              </button>
            ))}
          </div>
          <textarea value={f.transcript} onChange={set('transcript')} rows={3} placeholder="What the caller says…"
            className="w-full rounded-lg border border-gray-700 bg-gray-950 p-2 text-sm text-gray-100 placeholder:text-gray-600 focus:border-orange-500 focus:outline-none" />
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-300">
            <div className="flex overflow-hidden rounded-md border border-gray-700">
              {['en', 'es'].map((l) => (
                <button type="button" key={l} onClick={() => setF((s) => ({ ...s, language: l }))}
                  className={`px-2.5 py-1 font-semibold uppercase ${f.language === l ? 'bg-gray-200 text-gray-900' : 'text-gray-400'}`}>{l}</button>
              ))}
            </div>
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={f.early} onChange={set('early')} className="accent-orange-500" /> Hung up early</label>
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={f.later} onChange={set('later')} className="accent-orange-500" /> In a rush, finish later</label>
            <input value={f.pin} onChange={set('pin')} placeholder="PIN" maxLength={3}
              className="w-16 rounded-md border border-gray-700 bg-gray-950 px-2 py-1 text-xs tracking-widest text-gray-100 placeholder:text-gray-600" />
          </div>
          <button disabled={busy} className="w-full rounded-lg bg-gray-100 px-3 py-2 text-sm font-bold text-gray-900 hover:bg-white disabled:opacity-50">
            {busy ? 'Processing…' : '📞 Submit simulated call'}
          </button>
          {result && (
            <div className="rounded-lg border border-gray-700 bg-gray-900 p-2.5 text-xs text-gray-300">
              <div className="mb-1 font-semibold uppercase tracking-wider text-gray-500">{result.action}{result.issue_id ? ` · ${result.issue_id}` : ''}</div>
              <div>🗣️ “{result.message}”</div>
              {result.pin_code && <div className="mt-2 text-center text-3xl font-extrabold tracking-[0.4em] text-white">{result.pin_code}</div>}
            </div>
          )}
        </form>
      )}
    </Section>
  );
}

export default function Sidebar({ issues, summary, feed, actions, flyTo, toast }) {
  return (
    <div>
      <div className="border-b border-gray-800/80 px-4 py-4">
        <CallWidget toast={toast} />
        <div className="mt-2 flex gap-2">
          <button onClick={actions.decay} className="flex-1 rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-sm font-semibold text-gray-200 hover:border-gray-500">
            ⏱️ Simulate 2-Week Decay
          </button>
          <button onClick={actions.reset} title="Restore the 35 seeded issues" className="rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-400 hover:text-white">↺ Reset</button>
        </div>
      </div>
      <FocusCard summary={summary} flyTo={flyTo} />
      <ReviewQueue issues={issues} onApprove={actions.approve} flyTo={flyTo} />
      <LiveFeed feed={feed} flyTo={flyTo} />
      <Simulator toast={toast} />
    </div>
  );
}

