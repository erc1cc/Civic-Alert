import { useState } from 'react';
import { ThumbsUp, ThumbsDown, KeyRound, Loader2, ShieldAlert, ShieldCheck } from 'lucide-react';
import TierBadge from './TierBadge';
import { timeAgo, radiusLabel, fmtRadius, plural } from '../lib/time';
import { isFlagged } from '../lib/categories';

const VOTE = 'flex min-h-11 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-[var(--radius-ctl)] border border-line-strong bg-card px-2 text-[14px] font-[450] transition-colors hover:border-ink disabled:opacity-60';

function Note({ icon: Icon, tone = 'text-ink', children }) {
  return (
    <p className={`mt-3 flex items-start gap-2 border-t border-line pt-3 text-[14px] ${tone}`}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

export default function IssuePopup({ issue, approved, onVerify }) {
  const [pending, setPending] = useState(null);
  const latest = issue.descriptions?.[issue.descriptions.length - 1];
  const noLeft = Math.max(0, 3 - issue.still_there_no);

  async function vote(stillThere) {
    setPending(stillThere ? 'yes' : 'no');
    try {
      await onVerify(issue.id, stillThere);
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="p-4 text-ink">
      <div className="flex flex-wrap items-center gap-2 pr-9">
        <TierBadge tier={issue.tier} compact />
        <span className="meta text-ink-2">{issue.id} · {issue.category}</span>
      </div>
      <h2 tabIndex={-1} data-popup-heading className="title mt-3 pr-4 text-[19px]">{issue.title}</h2>

      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-mono text-[12px] text-ink-2">
        <dt>Calls</dt><dd className="text-ink">{plural(issue.call_count, 'call')} · first {timeAgo(issue.first_reported_at)}</dd>
        <dt>Where</dt>
        <dd className="text-ink">
          {fmtRadius(issue.uncertainty_radius_meters)} · {radiusLabel(issue.uncertainty_radius_meters)}
          <span className="block text-ink-2">{issue.call_count > 1 ? `from ${issue.call_count} callers’ landmarks` : 'from one caller’s description'}</span>
        </dd>
      </dl>

      {latest && (
        <blockquote lang={issue.language} className="mt-3 text-[15px] leading-relaxed text-ink">
          “{latest}”
          {issue.language === 'es' && (
            <span lang="en" className="meta ml-1.5 rounded-[3px] border border-line-strong px-1 text-[10px] text-ink-2">ES</span>
          )}
        </blockquote>
      )}

      {isFlagged(issue) && <Note icon={ShieldAlert} tone="text-tier-1">Waiting for an official to review.</Note>}
      {approved && <Note icon={ShieldCheck} tone="text-success">Approved. In the simulated crew queue.</Note>}
      {issue.status === 'preliminary' && (
        <Note icon={KeyRound}>
          Preliminary draft. The caller can confirm it with PIN <span className="font-mono tracking-[0.2em]">{issue.pin_code}</span>.
        </Note>
      )}

      <div className="mt-4 border-t border-line pt-3">
        <p className="text-[15px]" id={`still-${issue.id}`}>Is this still there?</p>
        <div className="mt-2.5 grid grid-cols-2 gap-2" role="group" aria-labelledby={`still-${issue.id}`} aria-busy={!!pending}>
          <button type="button" onClick={() => vote(true)} disabled={!!pending} className={VOTE}>
            {pending === 'yes' ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <ThumbsUp className="size-4" aria-hidden />}
            Still there <span className="font-mono text-[12px] text-ink-2">{issue.still_there_yes}</span>
          </button>
          <button type="button" onClick={() => vote(false)} disabled={!!pending} className={VOTE}>
            {pending === 'no' ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <ThumbsDown className="size-4" aria-hidden />}
            Gone <span className="font-mono text-[12px] text-ink-2">{issue.still_there_no}</span>
          </button>
        </div>
        <p className="mt-2 text-[13px] text-ink-2">
          {noLeft === 1 ? 'One more “Gone” vote removes this pin.' : `${noLeft} more “Gone” votes remove this pin.`}
        </p>
      </div>
    </div>
  );
}
