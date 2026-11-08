// Sensorless geocoding: turn spoken landmarks / cross streets into San Diego
// coordinates plus an honest uncertainty radius. Local gazetteer first (fast,
// works offline for the demo), OpenStreetMap Nominatim as a fallback.

const strip = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const ORDINALS = {
  first: '1st', second: '2nd', third: '3rd', fourth: '4th', fifth: '5th', sixth: '6th', seventh: '7th',
  eighth: '8th', ninth: '9th', tenth: '10th', eleventh: '11th', twelfth: '12th', fourteenth: '14th',
  sixteenth: '16th', twentieth: '20th', thirtieth: '30th', 'thirty second': '32nd',
  primera: '1st', quinta: '5th', septima: '7th', octava: '8th', treinta: '30th',
};

export function normalize(text) {
  let t = ' ' + strip(text).replace(/[,.;:!?¿¡"()]/g, ' ') + ' ';
  for (const [w, n] of Object.entries(ORDINALS)) t = t.replace(new RegExp(` ${w} `, 'g'), ` ${n} `);
  t = t
    .replace(/ (and|y|at|con|esquina|corner of|cross of|with) /g, ' & ')
    .replace(/ (street|calle) /g, ' st ')
    .replace(/ (avenue|avenida) /g, ' ave ')
    .replace(/ (boulevard|bulevar) /g, ' blvd ')
    .replace(/ (drive) /g, ' dr ')
    .replace(/\s+/g, ' ');
  return t;
}

// kind: 'intersection' (≈50 m), 'landmark' (≈150–400 m), 'street' / 'neighborhood' (≈1000 m)
const G = [
  // ── Downtown ──
  { label: '7th & Eighth (7th Ave & Market St)', hood: 'Downtown', kind: 'intersection', lat: 32.71118, lng: -117.15741, streets: ['7th', '8th'] },
  { label: '7th Ave & Market St', hood: 'Downtown', kind: 'intersection', lat: 32.71118, lng: -117.15741, streets: ['7th', 'market'] },
  { label: 'Market St & 10th Ave', hood: 'East Village', kind: 'intersection', lat: 32.71118, lng: -117.15380, streets: ['market', '10th'] },
  { label: 'Park Blvd & C St', hood: 'East Village', kind: 'intersection', lat: 32.71780, lng: -117.15300, streets: ['park blvd', ' c st'] },
  { label: '14th St & Imperial Ave', hood: 'East Village', kind: 'intersection', lat: 32.70660, lng: -117.14850, streets: ['14th', 'imperial'] },
  { label: '5th Ave & G St', hood: 'Gaslamp', kind: 'intersection', lat: 32.71280, lng: -117.16000, streets: ['5th', ' g st'] },
  { label: 'India St & Date St', hood: 'Little Italy', kind: 'intersection', lat: 32.72130, lng: -117.16900, streets: ['india', 'date'] },
  { label: '11th Ave & Island Ave', hood: 'East Village', kind: 'intersection', lat: 32.71010, lng: -117.15270, streets: ['11th', 'island'] },
  { label: 'Broadway & 2nd Ave', hood: 'Downtown', kind: 'intersection', lat: 32.71550, lng: -117.16360, streets: ['broadway', '2nd'] },
  { label: 'Broadway & Pacific Hwy', hood: 'Downtown', kind: 'intersection', lat: 32.71580, lng: -117.17120, streets: ['broadway', 'pacific h'] },
  { label: 'Petco Park', hood: 'East Village', kind: 'landmark', radius: 250, lat: 32.70730, lng: -117.15660, keys: ['petco', 'padres stadium', 'ballpark'] },
  { label: 'City College', hood: 'East Village', kind: 'landmark', radius: 300, lat: 32.71780, lng: -117.15300, keys: ['city college'] },
  { label: 'Santa Fe Depot', hood: 'Downtown', kind: 'landmark', radius: 250, lat: 32.71680, lng: -117.16950, keys: ['santa fe depot', 'train station', 'estacion de tren'] },
  { label: 'Horton Plaza', hood: 'Gaslamp', kind: 'landmark', radius: 250, lat: 32.71340, lng: -117.16170, keys: ['horton plaza', 'horton'] },
  { label: 'Gaslamp Quarter', hood: 'Gaslamp', kind: 'landmark', radius: 400, lat: 32.71150, lng: -117.16000, keys: ['gaslamp'] },
  { label: 'Convention Center', hood: 'Downtown', kind: 'landmark', radius: 400, lat: 32.70640, lng: -117.16190, keys: ['convention center', 'centro de convenciones'] },
  { label: 'Little Italy', hood: 'Little Italy', kind: 'neighborhood', lat: 32.72300, lng: -117.16850, keys: ['little italy'] },
  { label: 'East Village', hood: 'East Village', kind: 'neighborhood', lat: 32.71100, lng: -117.15300, keys: ['east village'] },
  { label: 'Downtown San Diego', hood: 'Downtown', kind: 'neighborhood', lat: 32.71570, lng: -117.16110, keys: ['downtown', 'centro'] },
  // ── North Park / Hillcrest ──
  { label: 'University Ave & 30th St', hood: 'North Park', kind: 'intersection', lat: 32.74862, lng: -117.13018, streets: ['university', '30th'] },
  { label: 'University Ave & Texas St', hood: 'North Park', kind: 'intersection', lat: 32.74860, lng: -117.13550, streets: ['university', 'texas'] },
  { label: 'University Ave & Ray St', hood: 'North Park', kind: 'intersection', lat: 32.74860, lng: -117.12940, streets: ['university', 'ray'] },
  { label: 'University Ave & Park Blvd', hood: 'Hillcrest', kind: 'intersection', lat: 32.74860, lng: -117.14620, streets: ['university', 'park blvd'] },
  { label: 'University Ave & 5th Ave', hood: 'Hillcrest', kind: 'intersection', lat: 32.74840, lng: -117.16040, streets: ['university', '5th'] },
  { label: '30th St & North Park Way', hood: 'North Park', kind: 'intersection', lat: 32.74690, lng: -117.13020, streets: ['30th', 'north park way'] },
  { label: 'Upas St & 28th St', hood: 'North Park', kind: 'intersection', lat: 32.73800, lng: -117.13350, streets: ['upas', '28th'] },
  { label: 'El Cajon Blvd & 30th St', hood: 'North Park', kind: 'intersection', lat: 32.75530, lng: -117.13020, streets: ['el cajon', '30th'] },
  { label: 'North Park Observatory', hood: 'North Park', kind: 'landmark', radius: 200, lat: 32.74890, lng: -117.12970, keys: ['observatory', 'north park theatre', 'north park theater'] },
  { label: 'North Park Community Park', hood: 'North Park', kind: 'landmark', radius: 250, lat: 32.75300, lng: -117.13240, keys: ['north park community park', 'community park', 'idaho'] },
  { label: 'Morley Field', hood: 'North Park', kind: 'landmark', radius: 400, lat: 32.73900, lng: -117.13600, keys: ['morley field', 'morley'] },
  { label: 'Balboa Park', hood: 'Balboa Park', kind: 'landmark', radius: 600, lat: 32.73410, lng: -117.14460, keys: ['balboa park', 'balboa', 'zoo'] },
  { label: 'University Ave (North Park)', hood: 'North Park', kind: 'street', lat: 32.74860, lng: -117.13500, keys: ['university ave', 'university'] },
  { label: 'North Park', hood: 'North Park', kind: 'neighborhood', lat: 32.74800, lng: -117.13000, keys: ['north park'] },
  { label: 'Hillcrest', hood: 'Hillcrest', kind: 'neighborhood', lat: 32.74800, lng: -117.16400, keys: ['hillcrest'] },
  { label: 'City Heights', hood: 'City Heights', kind: 'neighborhood', lat: 32.74870, lng: -117.10030, keys: ['city heights'] },
  // ── Mission Valley ──
  { label: 'Hotel Circle N', hood: 'Mission Valley', kind: 'landmark', radius: 300, lat: 32.76050, lng: -117.17350, keys: ['hotel circle'] },
  { label: 'Friars Rd & Mission Center Rd', hood: 'Mission Valley', kind: 'intersection', lat: 32.77030, lng: -117.15470, streets: ['friars', 'mission center'] },
  { label: 'Camino de la Reina & Mission Center Rd', hood: 'Mission Valley', kind: 'intersection', lat: 32.76520, lng: -117.15470, streets: ['camino de la reina', 'mission center'] },
  { label: 'Texas St & Camino del Rio S', hood: 'Mission Valley', kind: 'intersection', lat: 32.76170, lng: -117.13730, streets: ['texas', 'camino del rio'] },
  { label: 'Fashion Valley Mall', hood: 'Mission Valley', kind: 'landmark', radius: 300, lat: 32.76780, lng: -117.16750, keys: ['fashion valley'] },
  { label: 'Westfield Mission Valley', hood: 'Mission Valley', kind: 'landmark', radius: 300, lat: 32.76800, lng: -117.15200, keys: ['westfield', 'mission valley mall', 'target in mission valley'] },
  { label: 'Snapdragon Stadium', hood: 'Mission Valley', kind: 'landmark', radius: 400, lat: 32.78310, lng: -117.11960, keys: ['snapdragon', 'qualcomm stadium', 'sdsu stadium', 'estadio'] },
  { label: 'San Diego River Trail @ Qualcomm Way', hood: 'Mission Valley', kind: 'landmark', radius: 350, lat: 32.76600, lng: -117.13800, keys: ['river trail', 'san diego river', 'qualcomm way', 'rio san diego'] },
  { label: 'Mission Valley', hood: 'Mission Valley', kind: 'neighborhood', lat: 32.76900, lng: -117.15500, keys: ['mission valley'] },
  // ── Pacific Beach ──
  { label: 'Crystal Pier', hood: 'Pacific Beach', kind: 'landmark', radius: 150, lat: 32.79660, lng: -117.25580, keys: ['crystal pier', 'the pier', 'el muelle', 'muelle'] },
  { label: 'Garnet Ave & Mission Blvd', hood: 'Pacific Beach', kind: 'intersection', lat: 32.79730, lng: -117.25360, streets: ['garnet', 'mission blvd'] },
  { label: 'Garnet Ave & Ingraham St', hood: 'Pacific Beach', kind: 'intersection', lat: 32.79830, lng: -117.24200, streets: ['garnet', 'ingraham'] },
  { label: 'Garnet Ave & Cass St', hood: 'Pacific Beach', kind: 'intersection', lat: 32.79760, lng: -117.25060, streets: ['garnet', 'cass'] },
  { label: 'Pacific Beach Dr & Mission Blvd', hood: 'Pacific Beach', kind: 'intersection', lat: 32.78880, lng: -117.25380, streets: ['pacific beach dr', 'mission blvd'] },
  { label: 'Grand Ave & Lamont St', hood: 'Pacific Beach', kind: 'intersection', lat: 32.79450, lng: -117.24100, streets: ['grand', 'lamont'] },
  { label: 'Mission Blvd & Hornblend St', hood: 'Pacific Beach', kind: 'intersection', lat: 32.79950, lng: -117.25330, streets: ['mission blvd', 'hornblend'] },
  { label: 'Mission Bay Dr & Garnet Ave', hood: 'Pacific Beach', kind: 'intersection', lat: 32.80050, lng: -117.22350, streets: ['mission bay dr', 'garnet'] },
  { label: 'Kate Sessions Park', hood: 'Pacific Beach', kind: 'landmark', radius: 300, lat: 32.80770, lng: -117.24000, keys: ['kate sessions'] },
  { label: 'Garnet Ave (Pacific Beach)', hood: 'Pacific Beach', kind: 'street', lat: 32.79800, lng: -117.24600, keys: ['garnet'] },
  { label: 'Pacific Beach', hood: 'Pacific Beach', kind: 'neighborhood', lat: 32.79700, lng: -117.24000, keys: ['pacific beach', ' pb '] },
  // ── Elsewhere ──
  { label: 'Chicano Park', hood: 'Barrio Logan', kind: 'landmark', radius: 250, lat: 32.70030, lng: -117.14250, keys: ['chicano park', 'barrio logan'] },
  { label: 'Old Town', hood: 'Old Town', kind: 'landmark', radius: 500, lat: 32.75430, lng: -117.19770, keys: ['old town'] },
  { label: 'Ocean Beach Pier', hood: 'Ocean Beach', kind: 'landmark', radius: 300, lat: 32.74880, lng: -117.25360, keys: ['ocean beach', 'ob pier'] },
  { label: 'La Jolla Cove', hood: 'La Jolla', kind: 'landmark', radius: 400, lat: 32.85040, lng: -117.27130, keys: ['la jolla'] },
  { label: 'SDSU', hood: 'College Area', kind: 'landmark', radius: 600, lat: 32.77570, lng: -117.07190, keys: ['sdsu', 'san diego state'] },
  { label: 'UCSD', hood: 'University City', kind: 'landmark', radius: 700, lat: 32.88010, lng: -117.23400, keys: ['ucsd', 'uc san diego'] },
];

const RADIUS = { intersection: 50, landmark: 400, street: 1000, neighborhood: 1000 };

function has(t, token) {
  // tokens like ' c st' carry their own leading space for single-letter streets
  if (token.startsWith(' ')) return t.includes(token);
  return new RegExp(`(^|[^a-z0-9])${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(t);
}

/** Local gazetteer lookup. Returns best match or null. */
export function lookupLocal(text) {
  const t = normalize(text);
  if (!t.trim()) return null;
  const rank = { intersection: 0, landmark: 1, street: 2, neighborhood: 3 };
  let best = null;
  for (const e of G) {
    let ok = false;
    if (e.streets) ok = e.streets.every((s) => has(t, s));
    else if (e.keys) ok = e.keys.some((k) => has(t, k));
    if (!ok) continue;
    if (!best || rank[e.kind] < rank[best.kind] || (rank[e.kind] === rank[best.kind] && (e.radius ?? 9e9) < (best.radius ?? 9e9))) best = e;
  }
  if (!best) return null;
  return {
    lat: best.lat, lng: best.lng, label: best.label, neighborhood: best.hood, kind: best.kind,
    radius: best.kind === 'landmark' ? Math.max(best.radius ?? 400, 150) : RADIUS[best.kind],
    source: 'gazetteer',
  };
}

// San Diego bounding box (lng/lat) for the fallback geocoder.
const VIEWBOX = '-117.30,32.95,-116.90,32.53';

async function lookupNominatim(text) {
  if (process.env.DISABLE_NOMINATIM === '1') return null;
  try {
    const q = encodeURIComponent(`${text}, San Diego, CA`);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2500);
    const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&bounded=1&viewbox=${VIEWBOX}&q=${q}`, {
      headers: { 'User-Agent': 'SDVoiceTownHall/1.0 (hackathon demo)' }, signal: ctrl.signal,
    });
    clearTimeout(timer);
    const j = await r.json();
    if (!j?.[0]) return null;
    return { lat: +j[0].lat, lng: +j[0].lon, label: j[0].display_name.split(',').slice(0, 2).join(','), neighborhood: '', kind: 'landmark', radius: 400, source: 'nominatim' };
  } catch {
    return null;
  }
}

/** Geocode a spoken location description. */
export async function geocode(text) {
  if (!text || !text.trim()) return null;
  const local = lookupLocal(text);
  // Prefer local unless it's only a vague neighborhood hit — then try OSM for something tighter.
  if (local && local.kind !== 'neighborhood' && local.kind !== 'street') return local;
  const osm = await lookupNominatim(text);
  return osm || local;
}
