import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import { HeatLayer as LHeatLayer } from 'leaflet.heat';

// Call volume is drawn in blueprint blue so it never reads as an urgency tier (red and greys mean tiers).
export const HEAT_GRADIENT = { 0.15: '#dbe5f4', 0.35: '#9db6de', 0.55: '#5b82c2', 0.75: '#2f5ea8', 1: '#173a73' };
const HOTSPOT_CALLS = 17;

export default function HeatLayer({ issues }) {
  const map = useMap();
  const layer = useRef(null);

  useEffect(() => {
    layer.current = new LHeatLayer([], { radius: 40, blur: 30, maxZoom: 12, max: 1.6, minOpacity: 0.3, gradient: HEAT_GRADIENT });
    layer.current.addTo(map);
    return () => layer.current.remove();
  }, [map]);

  useEffect(() => {
    layer.current?.setLatLngs(issues.map((i) => [i.lat, i.lng, Math.min(1, 0.15 + i.call_count / HOTSPOT_CALLS)]));
  }, [issues]);

  return null;
}
