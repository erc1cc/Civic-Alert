import { Fragment, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Circle, CircleMarker, Popup, Tooltip, ZoomControl, useMap, useMapEvents } from 'react-leaflet';
import IssuePopup from './IssuePopup';
import HeatLayer from './HeatLayer';
import { isApproved, tierInfo } from '../lib/categories';
import { plural } from '../lib/time';

const SD_CENTER = [32.758, -117.185];
const APPROVED_RING = '#2f6b4a';
const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function FlyToSelected({ issue, markers }) {
  const map = useMap();
  useEffect(() => {
    if (!issue) return;
    map.flyTo([issue.lat, issue.lng], Math.max(map.getZoom(), 15), { duration: reduceMotion() ? 0 : 0.8 });
    const t = setTimeout(() => markers.current[issue.id]?.openPopup(), reduceMotion() ? 50 : 850);
    return () => clearTimeout(t);
  }, [issue?.id, issue?._focusNonce]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

function FitToIssuesOnce({ issues }) {
  const map = useMap();
  const done = useRef(false);
  useEffect(() => {
    if (done.current || issues.length === 0) return;
    done.current = true;
    map.fitBounds(issues.map((i) => [i.lat, i.lng]), { paddingTopLeft: [40, 130], paddingBottomRight: [40, 30], maxZoom: 14 });
  }, [issues, map]);
  return null;
}

// Popups take keyboard focus (heading) when they open and close on Escape; App returns focus on close.
function PopupEvents({ onChange }) {
  const map = useMapEvents({
    popupopen: (e) => {
      onChange?.(true);
      const el = e.popup.getElement();
      if (!el) return;
      if (!el.dataset.escBound) {
        el.dataset.escBound = '1';
        el.addEventListener('keydown', (ev) => {
          if (ev.key === 'Escape') { ev.stopPropagation(); map.closePopup(); }
        });
      }
      // react-leaflet portals the content in after popupopen, so wait a few frames for the heading to exist.
      let tries = 0;
      const focusHeading = () => {
        const h = el.querySelector('[data-popup-heading]');
        if (h) h.focus({ preventScroll: true });
        else if (++tries < 20) requestAnimationFrame(focusHeading);
      };
      requestAnimationFrame(focusHeading);
    },
    popupclose: () => onChange?.(false),
  });
  return null;
}

// Imperative camera for App: frame one spot, or pull back to the whole city. Resolves when the map settles.
function MapApi({ apiRef }) {
  const map = useMap();
  useEffect(() => {
    const settle = () => new Promise((resolve) => {
      let done = false;
      const fin = () => { if (!done) { done = true; resolve(); } };
      map.once('moveend', fin);
      setTimeout(fin, 1600);
    });
    apiRef.current = {
      frame(lat, lng, zoom = 15) {
        map.closePopup();
        const p = settle();
        const z = Math.max(map.getZoom(), zoom);
        if (reduceMotion()) map.setView([lat, lng], z); else map.flyTo([lat, lng], z, { duration: 0.9 });
        return p;
      },
      fitAll(list) {
        map.closePopup();
        if (!list?.length) return Promise.resolve();
        const p = settle();
        const opts = { paddingTopLeft: [40, 130], paddingBottomRight: [40, 30], maxZoom: 14 };
        const pts = list.map((i) => [i.lat, i.lng]);
        if (reduceMotion()) map.fitBounds(pts, opts); else map.flyToBounds(pts, { ...opts, duration: 0.9 });
        return p;
      },
      closePopup: () => map.closePopup(),
    };
    // Escape closes an open popup from anywhere inside the map, not only from inside the popup.
    const onKey = (e) => { if (e.key === 'Escape' && map.hasLayer?.(map._popup)) map.closePopup(); };
    const el = map.getContainer();
    el.addEventListener('keydown', onKey);
    return () => { apiRef.current = null; el.removeEventListener('keydown', onKey); };
  }, [map, apiRef]);
  return null;
}

function markerRadius(calls) {
  return 7 + Math.min(calls, 17) * 0.55;
}

// SVG paths are not useful tab stops (no name, drawn in tier-4-first order). The sidebar lists every issue instead.
const untab = { add: (e) => e.target.getElement?.()?.setAttribute('tabindex', '-1') };

/** Uncertainty halo. When a new caller narrows the location, the ring tightens instead of jumping. */
function Halo({ issue, t, prelim }) {
  const ref = useRef(null);
  const shown = useRef(issue.uncertainty_radius_meters);
  const target = issue.uncertainty_radius_meters;

  useEffect(() => {
    const circle = ref.current;
    const from = shown.current;
    if (!circle || from === target) return;
    if (reduceMotion()) {
      circle.setRadius(target);
      shown.current = target;
      return;
    }
    let raf;
    const t0 = performance.now();
    const D = 1400;
    const step = (now) => {
      const p = Math.min(1, (now - t0) / D);
      const eased = p === 1 ? 1 : 1 - 2 ** (-10 * p); // expo ease-out
      shown.current = from + (target - from) * eased;
      circle.setRadius(shown.current);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  const approximate = target >= 400;
  return (
    <Circle
      ref={ref}
      center={[issue.lat, issue.lng]}
      radius={shown.current}
      interactive={false}
      pathOptions={{
        color: t.halo,
        weight: 1.5,
        opacity: 0.6,
        dashArray: approximate || prelim ? '6 6' : null,
        fillColor: t.halo,
        fillOpacity: approximate ? 0.07 : 0.14,
      }}
    />
  );
}

export default function MapView({ issues, layer, selected, approvedIds, pulse, apiRef, onVerify, onPopupChange }) {
  const markers = useRef({});
  const pulsed = pulse && issues.find((i) => i.id === pulse.id);
  const compact = typeof window !== 'undefined' && window.innerWidth < 1024;

  return (
    <MapContainer center={SD_CENTER} zoom={12} minZoom={10} className="h-full w-full" zoomControl={false}>
      <TileLayer
        attribution='Tiles &copy; <a href="https://www.esri.com">Esri</a> &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors'
        url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
        maxZoom={16}
      />
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
        maxZoom={16}
      />
      <ZoomControl position="bottomright" />
      <PopupEvents onChange={onPopupChange} />
      {apiRef && <MapApi apiRef={apiRef} />}

      {layer === 'heat' && <HeatLayer issues={issues} />}

      {layer === 'pins' &&
        [...issues]
          .sort((a, b) => b.tier - a.tier) // tier 1 drawn last = on top
          .map((issue) => {
            const t = tierInfo(issue.tier);
            const prelim = issue.status === 'preliminary';
            const approved = approvedIds.has(issue.id) || isApproved(issue);
            return (
              <Fragment key={issue.id}>
                <Halo issue={issue} t={t} prelim={prelim} />
                {approved && (
                  <CircleMarker
                    center={[issue.lat, issue.lng]}
                    radius={markerRadius(issue.call_count) + 4}
                    interactive={false}
                    pathOptions={{ color: APPROVED_RING, weight: 3, fill: false }}
                  />
                )}
                <CircleMarker
                  ref={(m) => { if (m) markers.current[issue.id] = m; }}
                  center={[issue.lat, issue.lng]}
                  radius={markerRadius(issue.call_count)}
                  eventHandlers={untab}
                  pathOptions={{
                    className: 'pin',
                    color: prelim ? t.halo : t.edge,
                    weight: prelim ? 3 : 2.5,
                    dashArray: prelim ? '3 3' : null,
                    fillColor: prelim ? '#ffffff' : t.color,
                    fillOpacity: 1,
                  }}
                >
                  <Tooltip direction="top" offset={[0, -8]} opacity={1}>
                    <span className="font-[500]">{issue.title}</span>
                    <span className="text-ink-2"> · {t.label} · {plural(issue.call_count, 'call')}</span>
                  </Tooltip>
                  <Popup
                    autoPanPaddingTopLeft={compact ? [12, 130] : [24, 190]}
                    autoPanPaddingBottomRight={[24, 24]}
                    maxHeight={compact ? 400 : undefined}
                  >
                    <IssuePopup issue={issue} approved={approved} onVerify={onVerify} />
                  </Popup>
                </CircleMarker>
              </Fragment>
            );
          })}

      {layer === 'pins' && pulsed && (
        <CircleMarker
          key={pulse.nonce}
          center={[pulsed.lat, pulsed.lng]}
          radius={markerRadius(pulsed.call_count) + (pulse.tone === 'approved' ? 4 : 0)}
          interactive={false}
          pathOptions={{
            className: 'pin-pulse',
            color: pulse.tone === 'approved' ? APPROVED_RING : tierInfo(pulsed.tier).halo,
            weight: 3,
            fill: false,
          }}
        />
      )}

      <FitToIssuesOnce issues={issues} />
      <FlyToSelected issue={selected} markers={markers} />
    </MapContainer>
  );
}
