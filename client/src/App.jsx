import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from './api.js';
import MapView from './components/MapView.jsx';
import Sidebar from './components/Sidebar.jsx';
import Header from './components/Header.jsx';
import Toasts from './components/Toasts.jsx';

export default function App() {
  const [issues, setIssues] = useState([]);
  const [summary, setSummary] = useState(null);
  const [feed, setFeed] = useState([]);
  const [groupOf, setGroupOf] = useState({});
  const [live, setLive] = useState(false);
  const [view, setView] = useState('pins');
  const [filters, setFilters] = useState(new Set());
  const [focus, setFocus] = useState(null); // { id, nonce }
  const [toasts, setToasts] = useState([]);
  const summaryTimer = useRef(null);

  const toast = useCallback((text, kind = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t.slice(-3), { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
  }, []);

  const refreshSummary = useCallback(() => {
    clearTimeout(summaryTimer.current);
    summaryTimer.current = setTimeout(() => api.summary().then(setSummary).catch(() => {}), 150);
  }, []);

  const flyTo = useCallback((id) => id && setFocus({ id, nonce: Date.now() }), []);

  // Initial load + live stream (with polling fallback).
  useEffect(() => {
    api.meta().then((m) => setGroupOf(Object.fromEntries(m.categories.map((c) => [c.name, c.group])))).catch(() => {});
    api.issues().then(setIssues).catch(() => {});
    api.feed().then(setFeed).catch(() => {});
    refreshSummary();

    let poll = null;
    const es = new EventSource(api.streamUrl());
    es.addEventListener('open', () => { setLive(true); clearInterval(poll); poll = null; });
    es.addEventListener('issues', (e) => { setIssues(JSON.parse(e.data)); refreshSummary(); });
    es.addEventListener('report', (e) => {
      const ev = JSON.parse(e.data);
      setFeed((f) => [ev, ...f].slice(0, 50));
      toast(ev.message, ev.action);
      if (ev.issue_id && !['resolved'].includes(ev.action)) setTimeout(() => flyTo(ev.issue_id), 250);
    });
    es.addEventListener('error', () => {
      setLive(false);
      if (!poll) poll = setInterval(() => {
        api.issues().then(setIssues).catch(() => {});
        api.feed().then(setFeed).catch(() => {});
        refreshSummary();
      }, 5000);
    });
    return () => { es.close(); clearInterval(poll); };
  }, [refreshSummary, toast, flyTo]);

  const visible = useMemo(() => {
    if (!filters.size) return issues;
    return issues.filter((i) =>
      (filters.has('preliminary') && i.status === 'preliminary') ||
      (i.status !== 'preliminary' && filters.has(groupOf[i.category])));
  }, [issues, filters, groupOf]);

  const actions = useMemo(() => ({
    verify: async (id, yes) => {
      try {
        const i = await api.verify(id, yes);
        if (!live) setIssues((list) => (i.status === 'resolved' ? list.filter((x) => x.id !== id) : list.map((x) => (x.id === id ? i : x))));
        if (i.status === 'resolved' && !live) toast(`${id} resolved — residents confirmed it's gone`, 'resolved');
      } catch { toast('Could not reach the server', 'error'); }
    },
    approve: async (id) => {
      try { await api.approve(id); } catch { toast('Could not reach the server', 'error'); }
    },
    decay: async () => {
      try { const r = await api.decay(); if (!live) toast(`2 weeks later: ${r.dropped} issues dropped a tier, ${r.resolved} resolved`, 'decay'); }
      catch { toast('Could not reach the server', 'error'); }
    },
    reset: async () => {
      try { await api.reset(); setFeed([]); toast('Demo data reset', 'info'); setFocus(null); } catch { toast('Could not reach the server', 'error'); }
    },
  }), [live, toast]);

  return (
    <div className="min-h-full lg:h-full flex flex-col">
      <Header summary={summary} live={live} />
      <div className="lg:flex-1 lg:min-h-0 flex flex-col lg:flex-row">
        <main className="relative h-[65vh] shrink-0 lg:h-auto lg:shrink lg:flex-[7] min-w-0">
          <MapView
            issues={visible}
            view={view}
            setView={setView}
            filters={filters}
            setFilters={setFilters}
            focus={focus}
            onVerify={actions.verify}
          />
          <Toasts toasts={toasts} />
        </main>
        <aside className="lg:flex-[3] lg:min-w-[360px] lg:max-w-[480px] lg:border-l border-gray-800 bg-[#0d121c] lg:overflow-y-auto scroll-thin">
          <Sidebar
            issues={issues}
            summary={summary}
            feed={feed}
            actions={actions}
            flyTo={flyTo}
            toast={toast}
          />
        </aside>
      </div>
    </div>
  );
}
