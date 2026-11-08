// San Diego "Get It Done" categories, urgency tiers, and the keyword classifier
// used when the voice agent doesn't hand us a clean category.

export const TIER_COLORS = { 1: '#991b1b', 2: '#ea580c', 3: '#d97706', 4: '#eab308' };

export const CATEGORIES = {
  // Tier 1 — Safety hazard
  'Traffic Signal Issue': { tier: 1, group: 'roads', short: 'Dark traffic signal', dept: 'Police / DOT' },
  'Tree Maintenance': { tier: 1, group: 'lighting_parks', short: 'Tree down', dept: 'Urban Forestry' },
  'Stormwater': { tier: 1, group: 'sanitation', short: 'Street flooding', dept: 'Stormwater Dept' },
  // Tier 2 — High urgency
  'Pothole': { tier: 2, group: 'roads', short: 'Pothole', dept: 'Transportation' },
  'Street Light Maintenance': { tier: 2, group: 'lighting_parks', short: 'Street light out', dept: 'Transportation' },
  'Dead Animal': { tier: 2, group: 'sanitation', short: 'Dead animal', dept: 'Environmental Services' },
  'Illegal Dumping': { tier: 2, group: 'sanitation', short: 'Illegal dumping', dept: 'Environmental Services' },
  'Encampment': { tier: 2, group: 'sanitation', short: 'Encampment', dept: 'Homeless Strategies / SDPD' },
  'Sidewalk Repair Issue': { tier: 2, group: 'roads', short: 'Broken sidewalk', dept: 'Transportation' },
  'ADA Compliance': { tier: 2, group: 'roads', short: 'Accessibility barrier', dept: 'ADA Compliance' },
  'Environmental Services Code Compliance': { tier: 2, group: 'sanitation', short: 'Pollution / runoff', dept: 'Environmental Services' },
  // Tier 3 — Medium urgency
  'Missed Collection': { tier: 3, group: 'sanitation', short: 'Missed trash collection', dept: 'Environmental Services' },
  'Vegetation Encroachment': { tier: 3, group: 'lighting_parks', short: 'Overgrown vegetation', dept: 'Transportation' },
  'ROW Maintenance': { tier: 3, group: 'roads', short: 'Right-of-way issue', dept: 'Transportation' },
  'Traffic Signal Timing': { tier: 3, group: 'roads', short: 'Signal timing problem', dept: 'Transportation' },
  'Parks Issue': { tier: 3, group: 'lighting_parks', short: 'Park maintenance', dept: 'Parks & Recreation' },
  'Building and Land Use Enforcement': { tier: 3, group: 'lighting_parks', short: 'Building / land use violation', dept: 'Development Services' },
  'Oversized Vehicle': { tier: 3, group: 'roads', short: 'Oversized vehicle', dept: 'Parking Enforcement' },
  'Parking Violation': { tier: 3, group: 'roads', short: 'Parking violation', dept: 'Parking Enforcement' },
  // Tier 4 — Low urgency
  'Parking - 72-Hours': { tier: 4, group: 'roads', short: 'Abandoned vehicle (72 hr)', dept: 'Parking Enforcement' },
  'Street Sweeping': { tier: 4, group: 'sanitation', short: 'Street sweeping', dept: 'Transportation' },
  'Graffiti - Code Enforcement': { tier: 4, group: 'sanitation', short: 'Graffiti (private property)', dept: 'Code Enforcement' },
  'Graffiti - Public': { tier: 4, group: 'sanitation', short: 'Graffiti', dept: 'Transportation' },
};

// Keyword rules. Order matters for ties: more specific first.
const RULES = [
  ['Traffic Signal Timing', ['signal timing', 'light takes forever', 'red light too long', 'green too short', 'timing']],
  ['Traffic Signal Issue', ['traffic light', 'traffic signal', 'signal is out', 'signal out', 'light is out at the intersection', 'stoplight', 'stop light', 'signal dark', 'flashing red']],
  ['Street Light Maintenance', ['street light', 'streetlight', 'lamp post', 'light pole', 'dark street', 'lights are out']],
  ['Pothole', ['pothole', 'pot hole', 'hole in the road', 'crater', 'sinkhole']],
  ['Tree Maintenance', ['tree', 'limb', 'branch', 'fallen palm', 'palm frond']],
  ['Stormwater', ['flood', 'flooding', 'storm drain', 'drain is blocked', 'clogged drain', 'water everywhere']],
  ['Dead Animal', ['dead animal', 'dead dog', 'dead cat', 'dead raccoon', 'dead possum', 'dead coyote', 'roadkill', 'carcass']],
  ['Illegal Dumping', ['dumped', 'dumping', 'mattress', 'couch', 'furniture', 'tires', 'pile of junk', 'construction debris']],
  ['Encampment', ['encampment', 'tent', 'tents', 'homeless camp', 'unhoused']],
  ['Sidewalk Repair Issue', ['sidewalk', 'trip hazard', 'uplifted', 'cracked pavement on the walk']],
  ['ADA Compliance', ['wheelchair', 'curb ramp', 'ada', 'accessible', 'accessibility']],
  ['Environmental Services Code Compliance', ['oil', 'chemical', 'runoff', 'contamination', 'pollution', 'smell of gas', 'sewage']],
  ['Missed Collection', ['trash pickup', 'missed collection', 'garbage pickup', 'recycling', 'trash cans overflowing', 'overflowing', 'bins']],
  ['Vegetation Encroachment', ['overgrown', 'bushes', 'hedge', 'vegetation', 'blocking the sign', 'weeds']],
  ['ROW Maintenance', ['right of way', 'median', 'shoulder', 'guardrail', 'road sign down', 'sign is down']],
  ['Parks Issue', ['park', 'playground', 'swing', 'slide', 'restroom', 'bathroom']],
  ['Building and Land Use Enforcement', ['construction without permit', 'unpermitted', 'illegal construction', 'building code', 'land use']],
  ['Oversized Vehicle', ['rv', 'motorhome', 'oversized', 'boat trailer', 'camper']],
  ['Parking - 72-Hours', ['72 hour', '72-hour', 'abandoned car', 'abandoned vehicle', 'has not moved', "hasn't moved"]],
  ['Parking Violation', ['parked', 'parking', 'hydrant', 'double parked', 'red curb']],
  ['Street Sweeping', ['street sweeping', 'sweeper', 'leaves in the gutter', 'debris on the street']],
  ['Graffiti - Code Enforcement', ['graffiti on my', 'graffiti on the business', 'graffiti on a house', 'tagged the store']],
  ['Graffiti - Public', ['graffiti', 'tagging', 'tagged', 'spray paint']],
];

const strip = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Resolve a free-form category string (from the agent) to an official category. */
export function matchCategory(name) {
  if (!name) return null;
  const n = strip(name).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  for (const official of Object.keys(CATEGORIES)) {
    const o = strip(official).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
    if (o === n) return official;
  }
  for (const official of Object.keys(CATEGORIES)) {
    const o = strip(official).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
    if (n.includes(o) || o.includes(n)) return official;
  }
  return classifyText(name)?.category ?? null;
}

/** Keyword classifier over a transcript. Returns { category, score } or null. */
export function classifyText(text) {
  // Place names that contain category words ("North Park", "Park Blvd") shouldn't vote.
  const t = strip(text)
    .replace(/(north|balboa|petco|morley field|kate sessions|chicano|community|mission bay)\s+park/g, ' ')
    .replace(/park\s+(blvd|boulevard|ave|avenue|way)/g, ' ');
  let best = null;
  RULES.forEach(([category, kws], idx) => {
    let score = 0;
    for (const kw of kws) {
      const k = strip(kw);
      const re = new RegExp(`(^|[^a-z])${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`);
      if (re.test(t)) score += k.length > 6 ? 2 : 1;
    }
    if (score > 0 && (!best || score > best.score)) best = { category, score, idx };
  });
  return best ? { category: best.category, score: best.score } : null;
}

/** Tier with the context-sensitive escalations from the city matrix. */
export function tierFor(category, text = '') {
  const base = CATEGORIES[category]?.tier ?? 3;
  const t = strip(text);
  if (category === 'Parking Violation' && /(hydrant|fire lane|emergency|ambulance|fire truck)/.test(t)) return 1;
  if (category === 'Parks Issue' && /(playground|swing|slide)/.test(t) && /(broken|sharp|dangerous|exposed|collapsed)/.test(t)) {
    return /(injur|hurt|bleeding|cut his|cut her)/.test(t) ? 1 : 2;
  }
  return base;
}

export const isUrgentWord = (text) => /(huge|massive|giant|enormous|deep)/.test(strip(text));
