import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock, Loader2, RotateCcw, Send, Undo2, ChevronDown, MapPin, ShieldCheck } from 'lucide-react';
import VoiceCall from './VoiceCall';
import TierBadge from './TierBadge';
import { groupOf, isApproved, isFlagged, tierInfo } from '../lib/categories';
import { fmtRadius, plural, timeAgo } from '../lib/time';

export const UNDO_MS = 5000;
const FEED_PREVIEW = 6;

const latestQuote = (i) => i.descriptions?.[i.descriptions.length - 1];

const BTN = 'flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-ctl)] px-3 text-[14px] font-[450] transition-colors duration-150';
const BTN_PRIMARY = `${BTN} bg-ink text-white hover:bg-ink/85`;
const BTN_SECONDARY = `${BTN} border border-line-strong bg-card text-ink hover:border-ink`;

// Two-tone heading: the ink clause names the section, the grey continuation says what's in it.
function Section({ id, title, more, aside, note, children }) {
  return (
    <section aria-labelledby={id} className="border-t border-line px-5 py-6 first:border-t-0">
      <div className="flex items-baseline gap-3">
        <h2 id={id} className="title text-[22px]">
          {title}{more && <span className="text-ink-3"> {more}</span>}
        </h2>
        {aside && <div className="ml-auto shrink-0">{aside}</div>}
      </div>
      {note && <p className="mt-1.5 text-[14px] leading-relaxed text-ink-2">{note}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Tag({ children, title }) {
  return <span className="meta rounded-[3px] border border-line-strong px-1 py-px text-[10px] text-ink-2" title={title}>{children}</span>;
}

function Lang({ issue }) {
  return issue.language === 'es' ? (
    <Tag title="Reported in Spanish">ES</Tag>
  ) : null;
}

function hotspots(issues) {
  // Highest call volume per field, skipping anything already waiting in the review queue above.
  const pool = issues.filter((i) => i.status !== 'preliminary' && !isFlagged(i));
  const byCalls = (a, b) => b.call_count - a.call_count || a.tier - b.tier;
  return ['roads', 'sanitation', 'lighting']
    .map((g) => pool.filter((i) => groupOf(i.category).id === g).sort(byCalls)[0])
    .filter(Boolean)
    .map((issue) => ({ issue, field: groupOf(issue.category).field }));
}

function useSecondsLeft(deadline) {
  const left = () => Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
  const [s, setS] = useState(left);
  useEffect(() => {
    const t = setInterval(() => setS(left()), 250);
    return () => clearInterval(t);
  }, [deadline]); // eslint-disable-line react-hooks/exhaustive-deps
  return s;
}

function PendingApproval({ issue, deadline, onUndo }) {
  const secs = useSecondsLeft(deadline);
  return (
    <div className="rounded-[var(--radius-card)] bg-ink px-4 py-3 text-white">
      <div className="flex items-center gap-3">
        <Send className="size-4 shrink-0" aria-hidden />
        <p className="min-w-0 flex-1 text-[14px]">
          <span>Sending to the crew queue in <span className="font-mono tabular-nums">{secs}</span>&nbsp;s</span>
          <span className="block truncate text-white/60">{issue.title}</span>
        </p>
        <button
          type="button"
          onClick={() => onUndo(issue.id)}
          aria-label={`Undo approving ${issue.title}`}
          className="flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-[var(--radius-ctl)] border border-white/20 px-3 text-[14px] transition-colors hover:bg-white/10"
        >
          <Undo2 className="size-4" aria-hidden /> Undo
        </button>
      </div>
      <div className="mt-3 h-px overflow-hidden bg-white/20" aria-hidden>
        <div className="undo-bar h-full bg-white" style={{ animationDuration: `${UNDO_MS}ms` }} />
      </div>
    </div>
  );
}

// Holds the approved card's place for a moment, then folds away, so the list doesn't jump under the pointer.
function SentRow({ issue }) {
  return (
    <div className="sent-row grid">
      <div className="min-h-0 overflow-hidden">
        <p className="flex min-h-[72px] items-center gap-3 rounded-[var(--radius-card)] border border-line bg-card px-4 text-[14px]">
          <CheckCircle2 className="size-5 shrink-0 text-success" aria-hidden />
          <span className="min-w-0">
            <span>Sent to the simulated crew queue</span>
            <span className="block truncate text-ink-2">{issue.title}</span>
          </span>
        </p>
      </div>
    </div>
  );
}

function QueueItem({ issue, primary, onFocus, onApprove }) {
  const quote = latestQuote(issue);
  return (
    <article aria-labelledby={`q-${issue.id}`} className="rounded-[var(--radius-card)] border border-line bg-card p-4 shadow-[0_1px_2px_rgb(0_0_0/0.03)]">
      <div className="flex items-center gap-2">
        <TierBadge tier={issue.tier} compact />
        <span className="meta truncate text-ink-2">{issue.id} · {issue.category}</span>
      </div>
      <h3 id={`q-${issue.id}`} className="mt-3 text-[16px] font-[500] leading-snug tracking-[-0.01em]">{issue.title}</h3>
      {quote && (
        <p className="mt-1.5 line-clamp-2 text-[15px] leading-snug text-ink-2" lang={issue.language}>
          “{quote}”
        </p>
      )}
      <p className="mt-2.5 flex items-center gap-2 font-mono text-[12px] text-ink-2">
        <span>{plural(issue.call_count, 'call')} · {fmtRadius(issue.uncertainty_radius_meters)} · first {timeAgo(issue.first_reported_at)}</span>
        <Lang issue={issue} />
      </p>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => onApprove(issue.id)}
          aria-label={`Approve ${issue.title} for crew`}
          className={`flex-1 ${primary ? BTN_PRIMARY : BTN_SECONDARY}`}
        >
          <Send className="size-4" aria-hidden />
          Approve for crew
        </button>
        <button
          type="button"
          onClick={() => onFocus(issue.id)}
          className={`${BTN} text-ink hover:bg-wash`}
          aria-label={`Show ${issue.title} on the map`}
        >
          <MapPin className="size-4" aria-hidden /> Map
        </button>
      </div>
    </article>
  );
}

function IssueRow({ issue, onFocus, meta, detail }) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onFocus(issue.id)}
        className="group flex w-full cursor-pointer gap-3 border-t border-line px-5 py-3 text-left transition-colors hover:bg-card"
      >
        <span
          className="mt-1.5 size-2.5 shrink-0 rounded-full"
          style={{ background: tierInfo(issue.tier).color, boxShadow: `inset 0 0 0 1.5px ${tierInfo(issue.tier).edge === '#ffffff' ? 'transparent' : tierInfo(issue.tier).edge}` }}
          aria-hidden
        />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className="text-[15px] leading-snug underline-offset-4 group-hover:underline">{issue.title}</span>
            {meta && <span className="shrink-0 font-mono text-[12px] text-ink-2">{meta}</span>}
          </span>
          <span className="mt-1 flex items-center gap-1.5 text-[14px] text-ink-2">
            <span className="sr-only">{tierInfo(issue.tier).label}.</span>
            <Lang issue={issue} />
            {issue.status === 'preliminary' && (
              <Tag>Draft</Tag>
            )}
            <span className="line-clamp-1" lang={detail?.lang}>{detail?.text}</span>
          </span>
        </span>
      </button>
    </li>
  );
}

// Re-mounts on change so the number briefly highlights when calls land.
function Num({ value, className = 'text-ink' }) {
  return <span key={value} className={`num-tick font-mono tabular-nums ${className}`}>{value}</span>;
}

export default function Sidebar({
  issues, mode, approvedIds, pending, sent, onFocus, onApprove, onUndo, onDecay, onReset,
  onCallEnded, onError, onSampleStart, onSampleFiled, sampleKey,
}) {
  const [decaying, setDecaying] = useState(false);
  const [confirmDecay, setConfirmDecay] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const stats = useMemo(() => ({
    open: issues.length,
    calls: issues.reduce((n, i) => n + i.call_count, 0),
    hazards: issues.filter((i) => i.tier === 1).length,
    drafts: issues.filter((i) => i.status === 'preliminary').length,
  }), [issues]);

  const queue = useMemo(
    () => issues.filter((i) => isFlagged(i) || sent.has(i.id)).sort((a, b) => a.tier - b.tier || b.call_count - a.call_count),
    [issues, sent],
  );
  const awaiting = queue.filter((i) => !sent.has(i.id)).length;
  const approved = useMemo(
    () => issues.filter((i) => !isFlagged(i) && !sent.has(i.id) && (approvedIds.has(i.id) || isApproved(i))),
    [issues, approvedIds, sent],
  );
  const spots = useMemo(() => hotspots(issues), [issues]);
  const recent = useMemo(
    () => [...issues].sort((a, b) => new Date(b.last_reported_at) - new Date(a.last_reported_at)),
    [issues],
  );

  async function decay() {
    if (mode === 'live' && !confirmDecay) {
      setConfirmDecay(true);
      return;
    }
    setConfirmDecay(false);
    setDecaying(true);
    try { await onDecay(); } finally { setDecaying(false); }
  }



  return (
    <div className="pb-8">
      <Section id="call-h" title="Report by phone." more="Calls about the same thing merge into one issue.">
        <VoiceCall key={sampleKey} mode={mode} onCallEnded={onCallEnded} onError={onError} onSampleStart={onSampleStart} onSampleFiled={onSampleFiled} />
      </Section>

      <p className="border-t border-line px-5 py-3.5 text-[14px] text-ink-2">
        <Num value={stats.open} /> open issues from <Num value={stats.calls} /> calls ·{' '}
        <Num value={stats.hazards} className="text-tier-1" /> safety {stats.hazards === 1 ? 'hazard' : 'hazards'}
        {stats.drafts > 0 && <> · <Num value={stats.drafts} />&nbsp;{stats.drafts === 1 ? 'draft' : 'drafts'}</>}
      </p>

      <Section
        id="queue-h"
        title="Needs review."
        more={awaiting > 0 ? `${awaiting} ${awaiting === 1 ? 'hazard' : 'hazards'} waiting.` : null}
        note="A person approves every safety hazard before a crew is sent. Dispatch is simulated in this prototype."
      >
        {queue.length === 0 ? (
          <p className="flex items-center gap-2 rounded-[var(--radius-card)] border border-line bg-card px-4 py-3 text-[15px]">
            <CheckCircle2 className="size-5 text-success" aria-hidden /> Every safety hazard has been reviewed.
          </p>
        ) : (
          <ul className="space-y-3">
            {queue.map((i, k) => (
              <li key={i.id}>
                {sent.has(i.id)
                  ? <SentRow issue={i} />
                  : pending.has(i.id)
                    ? <PendingApproval issue={i} deadline={pending.get(i.id).deadline} onUndo={onUndo} />
                    : <QueueItem issue={i} primary={k === queue.findIndex((x) => !pending.has(x.id) && !sent.has(x.id))} onFocus={onFocus} onApprove={onApprove} />}
              </li>
            ))}
          </ul>
        )}

        {approved.length > 0 && (
          <details className="group mt-4 rounded-[var(--radius-card)] border border-line bg-card">
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 text-[14px]">
              <ShieldCheck className="size-4 text-success" aria-hidden />
              Approved for crew ({approved.length})
              <ChevronDown className="ml-auto size-4 transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <ul className="-mx-px">
              {approved.map((i) => (
                <IssueRow key={i.id} issue={i} onFocus={onFocus} detail={{ text: `${i.category} · in the simulated crew queue` }} />
              ))}
            </ul>
          </details>
        )}
      </Section>

      <Section id="spots-h" title="Hotspots." more="The most-called issue in each field.">
        {spots.length === 0 ? (
          <p className="text-ink-2">No open hotspots right now.</p>
        ) : (
          <ol className="-mx-5 border-b border-line">
            {spots.map(({ issue, field }) => (
              <IssueRow
                key={issue.id}
                issue={issue}
                onFocus={onFocus}
                meta={plural(issue.call_count, 'call')}
                detail={{ text: `${field} · latest ${timeAgo(issue.last_reported_at)}` }}
              />
            ))}
          </ol>
        )}
      </Section>

      <Section id="feed-h" title="Recent calls." more={mode === 'live' ? null : 'Demo data.'}>
        <ul className="-mx-5 border-b border-line">
          {(showAll ? recent : recent.slice(0, FEED_PREVIEW)).map((i) => (
            <IssueRow
              key={i.id}
              issue={i}
              onFocus={onFocus}
              meta={timeAgo(i.last_reported_at)}
              detail={{ text: latestQuote(i), lang: i.language }}
            />
          ))}
        </ul>
        {recent.length > FEED_PREVIEW && (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            aria-expanded={showAll}
            className={`mt-3 w-full ${BTN} text-ink hover:bg-wash`}
          >
            {showAll ? 'Show fewer' : `Show all ${recent.length} open issues`}
            <ChevronDown className={`size-4 transition-transform ${showAll ? 'rotate-180' : ''}`} aria-hidden />
          </button>
        )}
      </Section>

      <details className="group mx-5 rounded-[var(--radius-card)] border border-dashed border-line-strong">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 text-[14px] text-ink-2">
          <Clock className="size-4" aria-hidden />
          Presenter controls
          <ChevronDown className="ml-auto size-4 transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        <div className="space-y-3 border-t border-dashed border-line-strong p-4">
          <p className="text-[14px] leading-relaxed text-ink-2">
            <span className="text-ink">Simulate two weeks of silence.</span> Issues with no new calls drop one tier and Tier 4 issues resolve.
            Safety hazards and anything awaiting review are held.
          </p>
          <button
            type="button"
            onClick={decay}
            onBlur={() => setConfirmDecay(false)}
            disabled={decaying}
            className={`w-full disabled:cursor-wait disabled:opacity-60 ${confirmDecay ? `${BTN} bg-tier-1 text-white` : BTN_SECONDARY}`}
          >
            {decaying ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Clock className="size-4" aria-hidden />}
            {confirmDecay ? 'Changes the live backend. Click again to confirm' : 'Simulate 2 weeks'}
          </button>
          {mode === 'demo' ? (
            <button
              type="button"
              onClick={onReset}
              className={`w-full ${BTN_SECONDARY}`}
            >
              <RotateCcw className="size-4" aria-hidden /> Reset demo data
            </button>
          ) : (
            <p className="text-[14px] text-ink-2">Connected to the live backend. Reset is only available with demo data.</p>
          )}
        </div>
      </details>
    </div>
  );
}
