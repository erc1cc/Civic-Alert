import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X, AlertCircle, CheckCircle2 } from 'lucide-react';
import MapView from './components/MapView';
import LayerBar from './components/LayerBar';
import Legend from './components/Legend';
import Sidebar, { UNDO_MS } from './components/Sidebar';
import { fetchIssues, verifyIssue, approveIssue, simulateDecay, getMode, resetDemo, resetLive, fileSampleCall, SAMPLE_CALLS } from './lib/api';
import { FILTER_GROUPS, TIERS, groupOf, isVisible } from './lib/categories';

const POLL_MS = 4000;

const SENT_HOLD_MS = 2400; // a sent card holds its place so the next Approve doesn't slide under the cursor
const CLICK_GUARD_MS = 700; // and Approve ignores clicks briefly after the list reflows

function tierCounts(list) {
  const c = { 1: 0, 2: 0, 3: 0, 4: 0, open: list.length };
  for (const i of list) c[i.tier] = (c[i.tier] ?? 0) + 1;
  return c;
}

export default function App() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState(null);
  const [layer, setLayer] = useState(() =>
    new URLSearchParams(window.location.search).get('layer') === 'heat' ? 'heat' : 'pins');
  const [filters, setFilters] = useState(() => new Set());
  const [focus, setFocus] = useState(null); // { id, nonce }
  const [toasts, setToasts] = useState([]);
  const [offline, setOffline] = useState(false);
  const [approvedIds, setApprovedIds] = useState(() => new Set());
  const [pending, setPending] = useState(() => new Map()); // id -> { timer, deadline }: approvals inside the undo window
  const [sent, setSent] = useState(() => new Set()); // ids just approved, still holding their place in the queue
  const [pulse, setPulse] = useState(null); // { id, tone, nonce }: ring on a pin that just changed
  const [decayReport, setDecayReport] = useState(null);
  const [popupOpen, setPopupOpen] = useState(false);
  const [sampleKey, setSampleKey] = useState(0);
  const toastId = useRef(0);
  const offlineRef = useRef(false);
  const dataRef = useRef([]);
  const mapApi = useRef(null); // { frame, fitAll, closePopup } from MapView
  const returnFocus = useRef(null);
  const guardUntil = useRef(0);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const toast = useCallback((text, tone = 'info') => {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-2), { id, text, tone }]);
    setTimeout(() => dismiss(id), tone === 'error' ? 8000 : 5000);
  }, [dismiss]);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchIssues();
      dataRef.current = data;
      setIssues(data);
      setMode(getMode());
      if (offlineRef.current) {
        offlineRef.current = false;
        setOffline(false);
        toast('Reconnected to the backend.', 'success');
      }
    } catch (err) {
      // Toast once per outage, not on every 4-second poll.
      if (!offlineRef.current) {
        offlineRef.current = true;
        setOffline(true);
        toast(`Lost the backend: ${err.message}. Showing the last data we had and retrying every 4 seconds.`, 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, POLL_MS);
    return () => clearInterval(t);
  }, [refresh]);

  // Deep link: /#SD-109 flies to and opens that issue once data has loaded.
  const deepLinked = useRef(false);
  useEffect(() => {
    if (deepLinked.current || issues.length === 0) return;
    deepLinked.current = true;
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (id && issues.some((i) => i.id === id)) setTimeout(() => setFocus({ id, nonce: Date.now() }), 400);
  }, [issues]);

  const visible = useMemo(() => issues.filter(isVisible), [issues]);
  const issuesRef = useRef(visible);
  issuesRef.current = visible;

  const counts = useMemo(() => {
    const c = Object.fromEntries(FILTER_GROUPS.map((g) => [g.id, 0]));
    for (const i of visible) {
      c[groupOf(i.category).id]++;
      if (i.status === 'preliminary') c.preliminary++;
    }
    return c;
  }, [visible]);

  const filtered = useMemo(() => {
    if (filters.size === 0) return visible;
    return visible.filter(
      (i) => (filters.has('preliminary') && i.status === 'preliminary') || filters.has(groupOf(i.category).id),
    );
  }, [visible, filters]);

  const selected = useMemo(() => {
    if (!focus) return null;
    const issue = visible.find((i) => i.id === focus.id);
    return issue ? { ...issue, _focusNonce: focus.nonce } : null;
  }, [focus, visible]);

  const toggleFilter = (id) =>
    setFilters((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // Pins are needed to see an issue; filters are only cleared when they would hide it.
  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  const reveal = ({ category, status }) => {
    setLayer('pins');
    const f = filtersRef.current;
    if (f.size > 0 && !((f.has('preliminary') && status === 'preliminary') || f.has(groupOf(category).id))) {
      setFilters(new Set());
    }
  };

  const onFocus = (id) => {
    const issue = issuesRef.current.find((i) => i.id === id);
    if (issue) reveal(issue);
    const active = document.activeElement;
    returnFocus.current = active && active !== document.body ? active : null;
    setFocus({ id, nonce: Date.now() });
    history.replaceState(null, '', `#${id}`);
  };

  // When a popup closes, put keyboard focus back on whatever opened it.
  const onPopupChange = useCallback((open) => {
    setPopupOpen(open);
    if (open) return;
    setTimeout(() => {
      const el = returnFocus.current;
      returnFocus.current = null;
      const lost = !document.activeElement || document.activeElement === document.body
        || document.activeElement.closest?.('.leaflet-container');
      if (el?.isConnected && lost) el.focus({ preventScroll: true });
    }, 0);
  }, []);

  const flash = (id, tone) => {
    const nonce = Date.now();
    setPulse({ id, tone, nonce });
    setTimeout(() => setPulse((p) => (p?.nonce === nonce ? null : p)), 5000);
  };

  async function run(action, success, failure) {
    try {
      const result = await action();
      const msg = success?.(result);
      if (msg) toast(msg, 'success');
      return { ok: true, result };
    } catch (err) {
      toast(`${failure}: ${err.message}. Try again.`, 'error');
      return { ok: false };
    } finally {
      await refresh();
    }
  }

  const onVerify = (id, stillThere) =>
    run(() => verifyIssue(id, stillThere), (r) =>
      r?.status === 'resolved'
        ? 'Pin removed. Three residents said the issue is gone.'
        : stillThere ? 'Thanks. Marked as still there.' : 'Thanks. Your “gone” vote was counted.',
    'Your vote wasn’t saved');

  // Approve is deferred for UNDO_MS so a misclick can be taken back before anything is sent.
  const pendingRef = useRef(pending);
  pendingRef.current = pending;
  const dropPending = (id) => setPending((m) => { const n = new Map(m); n.delete(id); return n; });
  const onApprove = (id) => {
    if (Date.now() < guardUntil.current || pendingRef.current.has(id)) return;
    const issue = issuesRef.current.find((i) => i.id === id);
    const title = issue?.title ?? id;
    const timer = setTimeout(async () => {
      dropPending(id);
      setSent((s) => new Set(s).add(id));
      const { ok } = await run(() => approveIssue(id), () => `“${title}” approved. It’s in the simulated crew queue.`, 'Approval didn’t go through');
      if (ok) {
        setApprovedIds((s) => new Set(s).add(id));
        if (issue) {
          reveal(issue);
          mapApi.current?.frame(issue.lat, issue.lng).then(() => flash(id, 'approved'));
        }
      }
      setTimeout(() => {
        setSent((s) => { const n = new Set(s); n.delete(id); return n; });
        guardUntil.current = Date.now() + CLICK_GUARD_MS;
      }, ok ? SENT_HOLD_MS : 0);
    }, UNDO_MS);
    setPending((m) => new Map(m).set(id, { timer, deadline: Date.now() + UNDO_MS }));
  };
  const onUndo = (id) => {
    clearTimeout(pendingRef.current.get(id)?.timer);
    dropPending(id);
  };
  useEffect(() => () => pendingRef.current.forEach((p) => clearTimeout(p.timer)), []);

  // Decay is shown, not just reported: pull back to the whole city first, then let every pin re-tier in view.
  const onDecay = async () => {
    const before = tierCounts(issuesRef.current);
    const beforeIssues = issuesRef.current;
    setFocus(null);
    setDecayReport(null);
    setLayer('pins');
    await mapApi.current?.fitAll(issuesRef.current);
    const { ok, result } = await run(simulateDecay, null, 'Couldn’t simulate decay');
    if (!ok) return;
    const afterIssues = dataRef.current.filter(isVisible);
    const after = tierCounts(afterIssues);
    // Name what resolved on its own, so the report shows *which* issues closed, not just how many.
    const stillOpen = new Set(afterIssues.map((i) => i.id));
    const resolvedList = beforeIssues.filter((i) => !stillOpen.has(i.id)).map((i) => i.title);
    const nonce = Date.now();
    setDecayReport({ before, after, held: result?.held, resolvedList, nonce });
    setTimeout(() => setDecayReport((d) => (d?.nonce === nonce ? null : d)), 15000);
  };

  const onReset = async () => {
    pendingRef.current.forEach((p) => clearTimeout(p.timer));
    setPending(new Map());
    setSent(new Set());
    setApprovedIds(new Set());
    setPulse(null);
    setFocus(null);
    setDecayReport(null);
    setToasts([]);
    if (getMode() === 'live') {
      try { await resetLive(); } catch (err) { toast(`Couldn’t reset: ${err.message}. Try again.`, 'error'); return; }
    } else {
      resetDemo();
    }
    setSampleKey((k) => k + 1);
    history.replaceState(null, '', window.location.pathname + window.location.search);
    await refresh();
    mapApi.current?.fitAll(dataRef.current.filter(isVisible));
    document.getElementById('sidebar')?.scrollTo({ top: 0, behavior: 'smooth' });
    toast('Map reset to the starting 35 issues.', 'success');
  };

  // Sample calls: frame the pin while the caller is still talking, so the change happens on camera.
  const onSampleStart = (index) => {
    const t = SAMPLE_CALLS[index]?.target;
    if (!t) return;
    setFocus(null);
    reveal(t);
    mapApi.current?.frame(t.lat, t.lng);
  };

  const onSampleFiled = async () => {
    try {
      const r = fileSampleCall();
      await refresh();
      flash(r.id, 'call');
      history.replaceState(null, '', `#${r.id}`);
      return r;
    } catch (err) {
      toast(`The sample call couldn’t be filed: ${err.message}.`, 'error');
      return null;
    }
  };

  return (
    <div className="flex min-h-screen flex-col lg:h-screen">
      <header className="flex h-14 shrink-0 items-center gap-6 border-b border-line bg-ground px-4">
        <a href="/" title="Back to the overview" className="flex items-center gap-2.5 text-[16px] tracking-[-0.02em] text-ink">
          <svg viewBox="0 0 32 32" className="size-6" aria-hidden>
            <circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" strokeOpacity=".35" strokeWidth="1.5" strokeDasharray="3 3" />
            <circle cx="16" cy="16" r="8" fill="none" stroke="currentColor" strokeOpacity=".75" strokeWidth="1.5" />
            <circle cx="16" cy="16" r="3.5" fill="currentColor" />
          </svg>
          <h1 className="whitespace-nowrap">SD Voice Town Hall</h1>
        </a>
        <nav aria-label="Site" className="hidden items-center gap-5 text-[14px] text-ink-2 md:flex">
          <a href="/" className="hover:text-ink">Overview</a>
          <a href="/map" aria-current="page" className="text-ink">Live map</a>
        </nav>
        <div className="ml-auto flex items-center gap-3">
          {mode && (
            <span
              className="meta flex items-center gap-2 whitespace-nowrap rounded-[var(--radius-ctl)] border border-line bg-card px-2.5 py-1.5 text-ink-2"
              title={offline ? 'Backend not answering, retrying every 4 seconds'
                : mode === 'live' ? 'Connected to the backend, updating every 4 seconds'
                  : 'No backend found, so this browser is running the seeded demo data'}
            >
              <span className={`size-1.5 rounded-full ${offline ? 'bg-tier-1' : mode === 'live' ? 'bg-success' : 'bg-ink-3'}`} aria-hidden />
              {offline ? 'Reconnecting' : mode === 'live' ? 'Live' : 'Demo data'}
            </span>
          )}
        </div>
      </header>

      {/* The panel comes first in the DOM so keyboard users reach it before the map's own controls;
          CSS order puts the map on the left on wide screens and on top on phones. */}
      <main className="flex flex-col lg:min-h-0 lg:flex-1 lg:flex-row">
        <aside
          id="sidebar"
          aria-label="Town Hall panel"
          className="order-2 border-line bg-ground lg:w-[30%] lg:min-w-[380px] lg:max-w-[520px] lg:overflow-y-auto lg:border-l"
        >
          <Sidebar
            issues={visible}
            mode={mode}
            approvedIds={approvedIds}
            pending={pending}
            sent={sent}
            onFocus={onFocus}
            onApprove={onApprove}
            onUndo={onUndo}
            onDecay={onDecay}
            onReset={onReset}
            onSampleStart={onSampleStart}
            onSampleFiled={onSampleFiled}
            sampleKey={sampleKey}
            onCallEnded={() => { toast('Call ended. Filing the report…'); setTimeout(refresh, 1500); }}
            onError={(m) => toast(m, 'error')}
          />
        </aside>

        <section aria-label="San Diego issue map" className="relative order-1 h-[64vh] lg:h-auto lg:flex-1">
          {loading ? (
            <div className="flex h-full items-center justify-center bg-wash text-ink-2">Loading map…</div>
          ) : (
            <MapView
              issues={filtered}
              layer={layer}
              selected={selected}
              approvedIds={approvedIds}
              pulse={pulse}
              apiRef={mapApi}
              onVerify={onVerify}
              onPopupChange={onPopupChange}
            />
          )}
          <LayerBar layer={layer} onLayer={setLayer} filters={filters} onToggleFilter={toggleFilter} counts={counts} onDecay={onDecay} />
          <div id="call-card-slot" className="pointer-events-none absolute right-4 top-[188px] z-[1000] hidden max-h-[calc(100%-300px)] w-[360px] overflow-y-auto lg:block" />
          <Legend layer={layer} popupOpen={popupOpen} />
          <Toasts toasts={toasts} onDismiss={dismiss} report={decayReport} onCloseReport={() => setDecayReport(null)} />
        </section>
      </main>
    </div>
  );
}

function DecayReport({ report, onClose }) {
  const { before, after, held, resolvedList = [] } = report;
  const resolved = Math.max(0, before.open - after.open);
  const SHOW = 4;
  return (
    <section
      role="status"
      aria-label="Two weeks without new calls"
      className="toast pointer-events-auto w-full max-w-md rounded-[var(--radius-card)] border border-line bg-card p-4 text-ink shadow-[var(--shadow-float)]"
    >
      <div className="flex items-center gap-2">
        <h2 className="title text-[18px]">Two weeks without new calls</h2>
        <button
          type="button"
          aria-label="Close summary"
          onClick={onClose}
          className="-my-2 -mr-2 ml-auto grid size-10 cursor-pointer place-items-center rounded-[var(--radius-ctl)] text-ink-2 hover:bg-wash"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
      <dl className="mt-4 grid grid-cols-5 gap-3">
        {[1, 2, 3, 4].map((k) => (
          <div key={k} className="border-t border-line pt-2">
            <dt className="flex items-center gap-1.5 text-[13px] text-ink-2">
              <span
                className="size-2.5 rounded-full"
                style={{ background: TIERS[k].color, boxShadow: `0 0 0 1.5px ${TIERS[k].edge === '#ffffff' ? TIERS[k].color : TIERS[k].edge}` }}
                aria-hidden
              />
              {TIERS[k].label}
            </dt>
            <dd className="mt-1 font-mono text-[15px] tabular-nums">
              {before[k]}<span className="mx-1 text-ink-3" aria-label="became">→</span>{after[k]}
            </dd>
          </div>
        ))}
        <div className="border-t border-success pt-2 text-success">
          <dt className="text-[13px]">Resolved</dt>
          <dd className="mt-1 font-mono text-[15px] tabular-nums">{resolved}</dd>
        </div>
      </dl>
      {resolvedList.length > 0 && (
        <div className="mt-4 border-t border-line pt-3">
          <p className="meta text-success">Resolved automatically</p>
          <ul className="mt-2 space-y-1 text-[14px] text-ink">
            {resolvedList.slice(0, SHOW).map((t) => (
              <li key={t} className="flex gap-2"><span className="text-success" aria-hidden>✓</span>{t}</li>
            ))}
            {resolvedList.length > SHOW && <li className="text-ink-2">and {resolvedList.length - SHOW} more</li>}
          </ul>
        </div>
      )}
      <p className="mt-4 text-[14px] text-ink-2">
        Quiet issues drop a tier and routine ones close on their own.{typeof held === 'number' ? ` ${held} safety hazards were held because silence isn’t proof a hazard is gone.` : ''}
      </p>
    </section>
  );
}

function Toasts({ toasts, onDismiss, report, onCloseReport }) {
  // On large screens toasts sit over the bottom of the map so they never cover the sidebar's buttons.
  // Each toast carries its own role, so the container is not a live region (that would announce twice).
  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[2000] flex flex-col items-center gap-2 lg:absolute lg:bottom-8">
      {report && <DecayReport key={report.nonce} report={report} onClose={onCloseReport} />}
      {toasts.map((t) => (
        <div
          key={t.id}
          role={t.tone === 'error' ? 'alert' : 'status'}
          className="toast pointer-events-auto flex w-full max-w-md items-start gap-2.5 rounded-[var(--radius-card)] border border-white/10 bg-ink px-4 py-3 text-[15px] text-white shadow-[var(--shadow-float)]"
        >
          {t.tone === 'error'
            ? <AlertCircle className="mt-0.5 size-4 shrink-0 text-[#ff8a80]" aria-hidden />
            : t.tone === 'success' ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#8fd3a8]" aria-hidden /> : null}
          <span className="flex-1">{t.text}</span>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => onDismiss(t.id)}
            className="-m-2 grid size-10 shrink-0 cursor-pointer place-items-center rounded-[var(--radius-ctl)] text-white/70 hover:bg-white/10 hover:text-white"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      ))}
    </div>
  );
}
