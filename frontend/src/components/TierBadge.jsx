import { tierInfo } from '../lib/categories';

// A small square-cornered tag in the tier's colour. Compact shows "Tier 1"; full adds the meaning.
export default function TierBadge({ tier, compact = false }) {
  const t = tierInfo(tier);
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-[3px] px-1.5 py-px font-mono text-[11px] uppercase tracking-[0.04em]"
      style={{ background: t.color, color: t.text, boxShadow: t.edge === '#ffffff' ? undefined : `inset 0 0 0 1px ${t.edge}` }}
      title={`${t.label}: ${t.name}`}
    >
      {t.label}
      {!compact && <span className="normal-case tracking-normal">· {t.name}</span>}
    </span>
  );
}
