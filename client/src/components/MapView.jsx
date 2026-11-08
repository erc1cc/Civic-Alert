import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import L from '../leafletSetup.js';
import 'leaflet.heat';
import { MapContainer, TileLayer, Circle, CircleMarker, Popup, Tooltip, useMap } from 'react-leaflet';
import { TIER_COLORS, TIER_STROKE, TIER_LABEL, timeAgo } from '../api.js';

const SD_BOUNDS = [[32.700, -117.262], [32.805, -117.115]];

const CHIPS = [
  { key: 'roads', label: 'Roads & Signals', icon: '🚦' },
  { key: 'sanitation', label: 'Sanitation & Dumping', icon: '🗑️' },
  { key: 'lighting_parks', label: 'Lighting & Parks', icon: '💡' },
  { key: 'preliminary', label: 'Preliminary Drafts', icon: '📝' },
];

/** Radius circle that tweens to its new size so judges can watch it shrink. */
function AnimatedCircle({ center, radius, ...rest }) {
  const [r, setR] = useState(radius);
  const from = useRef(radius);
  useEffect(() => {
    const start = performance.now(), a = from.current, b = radius;
    if (a === b) return;
    let raf;
    const step = (t) => {
      const k = Math.min(1, (t - start) / 1100);
      const e = 1 - Math.pow(1 - k, 3);
      const v = a + (b - a) * e;
      from.current = v;
      setR(v);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [radius]);
  return <Circle center={center} radius={r} {...rest} />;
}

function HeatLayer({ issues }) {
  const map = useMap();
  const points = useMemo(() => {
    const pts = [];
    issues.forEach((i, idx) => {
      const intensity = Math.min(1, i.call_count / 17);
      pts.push([i.lat, i.lng, intensity]);
      // Spread a few extra points inside the uncertainty radius so busy spots form blobs.
      const extra = Math.min(8, Math.ceil(i.call_count / 2));
      const spread = Math.min(i.uncertainty_radius_meters, 250) / 111000;
      for (let k = 0; k < extra; k++) {
        const ang = (idx * 37 + k * 137.5) * (Math.PI / 180);
        const d = spread * (0.3 + ((k * 7 + idx) % 10) / 14);
        pts.push([i.lat + Math.sin(ang) * d, i.lng + Math.cos(ang) * d * 1.18, intensity * 0.7]);
      }
    });
    return pts;
  }, [issues]);
  useEffect(() => {
    const layer = L.heatLayer(points, {
      radius: 35, blur: 25, maxZoom: 15, minOpacity: 0.35,
      gradient: { 0.2: '#fde047', 0.4: '#f59e0b', 0.6: '#ea580c', 0.8: '#b91c1c', 1: '#7f1d1d' },
    }).addTo(map);
    return () => { map.removeLayer(layer); };
  }, [map, points]);
  return null;
}

function FocusController({ focus, issues, markerRefs, view }) {
  const map = useMap();
  useEffect(() => {
    if (!focus) return;
    const i = issues.find((x) => x.id === focus.id);
    if (!i) return;
    map.flyTo([i.lat, i.lng], Math.max(map.getZoom(), 15), { duration: 1.1 });
    if (view !== 'pins') return;
    const t = setTimeout(() => markerRefs.current[i.id]?.openPopup(), 1200);
    return () => clearTimeout(t);
    // only re-run when a new focus request arrives
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.nonce]);
  return null;
}

function TierBadge({ tier }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold text-white" style={{ background: TIER_COLORS[tier] }}>
      Tier {tier} · {TIER_LABEL[tier]}
    </span>
  );
}

function IssuePopup({ issue: i, onVerify }) {
  const recent = i.descriptions.slice(-3).reverse();
  return (
    <div className="text-gray-200 font-sans">
      <div className="flex flex-wrap items-center gap-2 mb-1.5">
        <TierBadge tier={i.tier} />
        {i.status === 'preliminary' && <span className="rounded-full border border-dashed border-gray-500 px-2 py-0.5 text-[11px] text-gray-300">Preliminary</span>}
        {i.status === 'flagged_for_review' && <span className="rounded-full bg-red-950 px-2 py-0.5 text-[11px] font-semibold text-red-300">Awaiting review</span>}
        {i.forwarded_to_crew && <span className="rounded-full bg-emerald-950 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">Crew notified</span>}
      </div>
      <div className="text-[11px] uppercase tracking-wider text-gray-400">{i.category} · {i.id}</div>
      <div className="text-[15px] font-bold leading-snug text-white mt-0.5">{i.title}</div>
      <div className="mt-1 text-xs text-gray-400">
        Reported {timeAgo(i.first_reported_at)} • <b className="text-gray-200">{i.call_count} call{i.call_count === 1 ? '' : 's'}</b>
      </div>
      <div className="text-xs text-gray-400">📍 {i.location_label || i.neighborhood} <span className="text-gray-500">± {i.uncertainty_radius_meters} m</span></div>
      {i.status === 'preliminary' && i.pin_code && (
        <div className="mt-2 rounded-lg bg-gray-800 px-2 py-1 text-xs">PIN <b className="tracking-widest text-white">{i.pin_code}</b> — awaiting caller</div>
      )}
      <div className="mt-2 space-y-1">
        {recent.map((d, k) => (
          <p key={k} className="!m-0 border-l-2 border-gray-700 pl-2 text-xs italic text-gray-300">“{d}”</p>
        ))}
      </div>
      <div className="mt-3 rounded-lg bg-gray-800/70 p-2">
        <div className="text-xs font-semibold text-gray-200 mb-1.5">Is this issue still here?</div>
        <div className="flex gap-2">
          <button onClick={() => onVerify(i.id, true)} className="flex-1 rounded-md bg-emerald-700/80 hover:bg-emerald-600 px-2 py-1 text-xs font-semibold text-white">
            👍 Yes <span className="opacity-70">({i.still_there_yes})</span>
          </button>
          <button onClick={() => onVerify(i.id, false)} className="flex-1 rounded-md bg-gray-700 hover:bg-gray-600 px-2 py-1 text-xs font-semibold text-white">
            👎 No <span className="opacity-70">({i.still_there_no}/3)</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function Pins({ issues, onVerify, markerRefs, focus }) {
  // Draw big/low-tier circles first so small urgent pins stay on top.
  const sorted = useMemo(() => [...issues].sort((a, b) => b.tier - a.tier || b.uncertainty_radius_meters - a.uncertainty_radius_meters), [issues]);
  return sorted.map((i) => {
    const prelim = i.status === 'preliminary';
    const fill = TIER_COLORS[i.tier], stroke = TIER_STROKE[i.tier];
    const pos = [i.lat, i.lng];
    const size = 6 + Math.min(8, i.call_count / 2);
    return (
      <Fragment key={i.id}>
        <AnimatedCircle
          center={pos}
          radius={i.uncertainty_radius_meters}
          pathOptions={{ color: stroke, weight: 1, opacity: 0.6, fillColor: fill, fillOpacity: prelim ? 0.06 : 0.16, dashArray: prelim ? '6 6' : null }}
          interactive={false}
        />
        {i.status === 'flagged_for_review' && (
          <CircleMarker center={pos} radius={size + 2} className="pulse-ring" interactive={false}
            pathOptions={{ color: '#ef4444', fill: false, weight: 2 }} />
        )}
        {focus?.id === i.id && (
          <CircleMarker key={focus.nonce} center={pos} radius={size + 4} className="flash-ring" interactive={false}
            pathOptions={{ color: '#ffffff', fill: false, weight: 0 }} />
        )}
        <CircleMarker
          ref={(m) => { if (m) markerRefs.current[i.id] = m; else delete markerRefs.current[i.id]; }}
          center={pos}
          radius={size}
          pathOptions={{ color: prelim ? stroke : '#0b0f17', weight: prelim ? 2 : 1.5, fillColor: fill, fillOpacity: prelim ? 0.15 : 0.95, dashArray: prelim ? '3 3' : null }}
        >
          <Tooltip direction="top" offset={[0, -size]} opacity={1}>
            {i.title} · {i.call_count} call{i.call_count === 1 ? '' : 's'}
          </Tooltip>
          <Popup maxWidth={320} autoPanPadding={[40, 80]}>
            <IssuePopup issue={i} onVerify={onVerify} />
          </Popup>
        </CircleMarker>
      </Fragment>
    );
  });
}

export default function MapView({ issues, view, setView, filters, setFilters, focus, onVerify }) {
  const markerRefs = useRef({});
  const toggle = (k) => setFilters((f) => { const n = new Set(f); n.has(k) ? n.delete(k) : n.add(k); return n; });

  return (
    <div className="absolute inset-0">
      <MapContainer bounds={SD_BOUNDS} zoomControl={false} className="h-full w-full" preferCanvas={false}>
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
          attribution="Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors"
          maxNativeZoom={16}
          maxZoom={19}
        />
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
          maxNativeZoom={16}
          maxZoom={19}
          zIndex={650}
        />
        {view === 'pins'
          ? <Pins issues={issues} onVerify={onVerify} markerRefs={markerRefs} focus={focus} />
          : <HeatLayer issues={issues.filter((i) => i.status !== 'preliminary')} />}
        <FocusController focus={focus} issues={issues} markerRefs={markerRefs} view={view} />
        <ZoomBottomRight />
        <AutoResize />
      </MapContainer>

      {/* Floating pill bar */}
      <div className="pointer-events-none absolute inset-x-0 top-3 z-[1000] flex flex-col items-center gap-2 px-3">
        <div className="pointer-events-auto flex rounded-full border border-gray-700 bg-gray-900/90 p-1 shadow-xl backdrop-blur">
          {[['pins', '📍 Urgency Pins'], ['heat', '🔥 Call Volume Heatmap']].map(([k, label]) => (
            <button key={k} onClick={() => setView(k)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${view === k ? 'bg-white text-gray-900' : 'text-gray-300 hover:text-white'}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="pointer-events-auto flex flex-wrap justify-center gap-1.5">
          {CHIPS.map((c) => {
            const on = filters.has(c.key);
            return (
              <button key={c.key} onClick={() => toggle(c.key)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold shadow backdrop-blur transition ${on ? 'border-orange-400 bg-orange-500/90 text-white' : 'border-gray-700 bg-gray-900/85 text-gray-300 hover:border-gray-500'}`}>
                {c.icon} {c.label}
              </button>
            );
          })}
          {filters.size > 0 && (
            <button onClick={() => setFilters(new Set())} className="rounded-full border border-gray-700 bg-gray-900/85 px-3 py-1 text-xs text-gray-400 hover:text-white">✕ Clear</button>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-6 left-3 z-[1000] hidden sm:block rounded-xl border border-gray-800 bg-gray-900/90 p-3 text-xs shadow-xl backdrop-blur">
        {view === 'pins' ? (
          <>
            <div className="mb-1.5 font-semibold text-gray-300">Urgency tier</div>
            {[1, 2, 3, 4].map((t) => (
              <div key={t} className="flex items-center gap-2 py-0.5 text-gray-400">
                <span className="h-3 w-3 rounded-full" style={{ background: TIER_COLORS[t], boxShadow: `0 0 0 1px ${TIER_STROKE[t]}` }} />
                <b className="text-gray-200">T{t}</b> {TIER_LABEL[t]}
              </div>
            ))}
            <div className="mt-1.5 border-t border-gray-800 pt-1.5 text-[11px] text-gray-500">Halo = location uncertainty<br />shrinks as more callers corroborate</div>
          </>
        ) : (
          <>
            <div className="mb-1.5 font-semibold text-gray-300">Call volume</div>
            <div className="h-2.5 w-40 rounded-full" style={{ background: 'linear-gradient(90deg,#fde047,#f59e0b,#ea580c,#b91c1c,#7f1d1d)' }} />
            <div className="mt-1 flex justify-between text-[11px] text-gray-500"><span>1 call</span><span>17+ calls</span></div>
          </>
        )}
      </div>
    </div>
  );
}

function ZoomBottomRight() {
  const map = useMap();
  useEffect(() => {
    const z = L.control.zoom({ position: 'bottomright' }).addTo(map);
    return () => z.remove();
  }, [map]);
  return null;
}

/** Leaflet measures its container once; re-measure when the layout settles or the window resizes. */
function AutoResize() {
  const map = useMap();
  useEffect(() => {
    const el = map.getContainer();
    let fitted = false;
    const ro = new ResizeObserver(() => {
      map.invalidateSize();
      if (!fitted && el.clientHeight > 100) { fitted = true; map.fitBounds(SD_BOUNDS); }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [map]);
  return null;
}
