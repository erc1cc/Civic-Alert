import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { TIERS } from '../lib/categories';
import { HEAT_GRADIENT } from './HeatLayer';

function Swatch({ className = '', style }) {
  return <span className={`size-3.5 shrink-0 rounded-full ${className}`} style={style} aria-hidden />;
}

function PinKey() {
  return (
    <>
      <ul className="space-y-1.5">
        {Object.entries(TIERS).map(([k, t]) => (
          <li key={k} className="flex items-center gap-2">
            <Swatch style={{ background: t.color, boxShadow: `0 0 0 1.5px ${t.edge === '#ffffff' ? t.color : t.edge}` }} />
            <span className="font-mono text-[12px]">{t.label}</span>
            <span className="text-ink-2">{t.name}</span>
          </li>
        ))}
      </ul>
      <ul className="mt-3 space-y-1.5 border-t border-line pt-3 text-ink-2">
        <li className="flex items-center gap-2">
          <Swatch className="border border-dashed border-ink-2" />
          Halo: how sure the location is. It tightens as callers add landmarks.
        </li>
        <li className="flex items-center gap-2">
          <Swatch className="border-2 border-dashed border-ink bg-white" />
          Hollow pin: preliminary draft
        </li>
        <li className="flex items-center gap-2">
          <Swatch className="bg-tier-3 ring-2 ring-success ring-offset-1" />
          Green ring: approved for crew (simulated)
        </li>
        <li className="flex items-center gap-2">
          <span className="flex w-3.5 shrink-0 items-end justify-center gap-px" aria-hidden>
            <span className="size-1.5 rounded-full bg-ink-2" />
            <span className="size-2.5 rounded-full bg-ink-2" />
          </span>
          Bigger pin: more calls
        </li>
      </ul>
    </>
  );
}

function HeatKey() {
  return (
    <>
      <div
        className="h-3 rounded-full"
        style={{
          background: `linear-gradient(90deg, ${Object.entries(HEAT_GRADIENT).sort((a, b) => a[0] - b[0]).map(([s, c]) => `${c} ${s * 100}%`).join(', ')})`,
        }}
        aria-hidden
      />
      <div className="mt-1.5 flex justify-between text-ink-2">
        <span>Fewer calls</span>
        <span>More calls nearby</span>
      </div>
    </>
  );
}

export default function Legend({ layer, popupOpen }) {
  // Below lg the legend starts collapsed so the map stays usable, and it steps aside while a popup is open.
  const [open, setOpen] = useState(() => window.matchMedia?.('(min-width: 1024px)').matches ?? true);
  const title = layer === 'pins' ? 'Urgency tier' : 'Call volume';

  return (
    <div
      className={`absolute bottom-11 left-4 z-[1000] w-64 max-w-[calc(100%-5rem)] rounded-[var(--radius-card)] border border-line bg-card/95 text-[13px] shadow-[var(--shadow-card)] backdrop-blur lg:bottom-8 ${
        popupOpen ? 'max-lg:hidden' : ''
      }`}
    >
      <h2>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="meta flex min-h-11 w-full cursor-pointer items-center gap-2 px-3.5 text-left text-ink-2 hover:text-ink"
        >
          {open ? title : 'Map key'}
          <ChevronDown className={`ml-auto size-4 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
        </button>
      </h2>
      {open && <div className="px-3.5 pb-3.5">{layer === 'pins' ? <PinKey /> : <HeatKey />}</div>}
    </div>
  );
}
