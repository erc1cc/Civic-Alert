import { useEffect, useRef, useState } from 'react';
import { MapPin, Flame, Route, Trash2, Lamp, FileClock, Clock, Loader2 } from 'lucide-react';
import { FILTER_GROUPS } from '../lib/categories';

const LAYERS = [
  { id: 'pins', label: 'Urgency pins', icon: MapPin },
  { id: 'heat', label: 'Call heatmap', icon: Flame },
];
const CHIP_ICONS = { roads: Route, sanitation: Trash2, lighting: Lamp, preliminary: FileClock };

// Fade whichever edge of the chip row has more chips hidden behind it.
function useEdgeFade() {
  const ref = useRef(null);
  const [edges, setEdges] = useState({ left: false, right: false });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setEdges({
      left: el.scrollLeft > 4,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
    });
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => { el.removeEventListener('scroll', update); ro.disconnect(); };
  }, []);
  const mask = `linear-gradient(to right, ${edges.left ? 'transparent, black 2.5rem' : 'black'}, ${edges.right ? 'black calc(100% - 2.5rem), transparent' : 'black'})`;
  return [ref, { maskImage: mask, WebkitMaskImage: mask }];
}

export default function LayerBar({ layer, onLayer, filters, onToggleFilter, counts, onDecay }) {
  const [chipsRef, fade] = useEdgeFade();
  const [decaying, setDecaying] = useState(false);
  async function decay() {
    setDecaying(true);
    try { await onDecay?.(); } finally { setDecaying(false); }
  }
  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-[1000] flex flex-col items-center gap-2 px-3">
      <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2">
      <div role="radiogroup" aria-label="Map view" className="flex rounded-[6px] border border-line bg-card p-1 shadow-[var(--shadow-card)]">
        {LAYERS.map(({ id, label, icon: Icon }) => {
          const active = layer === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onLayer(id)}
              className={`flex min-h-10 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-ctl)] px-3.5 text-[14px] font-[450] transition-colors duration-150 ${
                active ? 'bg-ink text-white' : 'text-ink-2 hover:bg-wash hover:text-ink'
              }`}
            >
              <Icon className="size-4" aria-hidden />
              {label}
            </button>
          );
        })}
      </div>
      {onDecay && (
        <button
          type="button"
          onClick={decay}
          disabled={decaying}
          title="Fast-forward two weeks with no new calls: quiet issues drop a tier and routine ones resolve on their own"
          className="flex min-h-12 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-[6px] border border-line bg-card px-3.5 text-[14px] font-[450] text-ink shadow-[var(--shadow-card)] transition-colors duration-150 hover:border-ink disabled:cursor-wait disabled:opacity-60"
        >
          {decaying ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Clock className="size-4" aria-hidden />}
          Simulate 2 weeks
        </button>
      )}
      </div>

      <div
        ref={chipsRef}
        role="group"
        aria-label="Filter by category"
        style={fade}
        className="pointer-events-auto flex max-w-full gap-2 overflow-x-auto px-1 pb-2 [scrollbar-width:none]"
      >
        {FILTER_GROUPS.map((g) => {
          const Icon = CHIP_ICONS[g.id];
          const on = filters.has(g.id);
          return (
            <button
              key={g.id}
              type="button"
              aria-pressed={on}
              onClick={() => onToggleFilter(g.id)}
              className={`flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-ctl)] border px-3 text-[14px] font-[450] shadow-[0_1px_2px_rgb(0_0_0/0.05)] transition-colors duration-150 ${
                on
                  ? 'border-ink bg-ink text-white'
                  : 'border-line bg-card text-ink hover:border-ink'
              }`}
            >
              <Icon className="size-4 opacity-70" aria-hidden />
              {g.label}
              <span className={`font-mono text-[12px] tabular-nums ${on ? 'text-white/75' : 'text-ink-2'}`}>{counts[g.id] ?? 0}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
