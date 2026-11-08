// San Diego "Get It Done" urgency matrix — single source of truth for tiers, colors, and filter groups.
// Muted ramp: only Tier 1 carries colour; Tiers 2–4 step down from ink to light grey.
// color = pin fill / badge, text = badge text (AA on color), edge = pin outline, halo = uncertainty ring.

export const TIERS = {
  1: { label: 'Tier 1', name: 'Safety Hazard', sla: 'Respond within hours', color: '#b42318', text: '#ffffff', edge: '#ffffff', halo: '#b42318' },
  2: { label: 'Tier 2', name: 'High Urgency', sla: 'Respond in 1–3 days', color: '#1a1a1a', text: '#ffffff', edge: '#ffffff', halo: '#1a1a1a' },
  3: { label: 'Tier 3', name: 'Medium Urgency', sla: 'Days to 2 weeks', color: '#6b6b67', text: '#ffffff', edge: '#ffffff', halo: '#6b6b67' },
  4: { label: 'Tier 4', name: 'Low / Routine', sla: 'Routine scheduling', color: '#c8c8c2', text: '#1a1a1a', edge: '#6b6b67', halo: '#8a8a86' },
};

export const CATEGORY_TIER = {
  'Traffic Signal Issue': 1,
  'Tree Maintenance': 1,
  Stormwater: 1,
  Pothole: 2,
  'Street Light Maintenance': 2,
  'Dead Animal': 2,
  'Illegal Dumping': 2,
  Encampment: 2,
  'Sidewalk Repair Issue': 2,
  'ADA Compliance': 2,
  'Environmental Services Code Compliance': 2,
  'Missed Collection': 3,
  'Vegetation Encroachment': 3,
  'ROW Maintenance': 3,
  'Traffic Signal Timing': 3,
  'Parks Issue': 3,
  'Building and Land Use Enforcement': 3,
  'Oversized Vehicle': 3,
  'Parking Violation': 3,
  'Parking - 72-Hours': 4,
  'Street Sweeping': 4,
  'Graffiti - Code Enforcement': 4,
  'Graffiti - Public': 4,
};

// Map filter chips. "preliminary" is status-based, the rest are category groups.
export const FILTER_GROUPS = [
  {
    id: 'roads',
    label: 'Roads & Signals',
    field: 'Infrastructure',
    categories: [
      'Traffic Signal Issue', 'Pothole', 'Sidewalk Repair Issue', 'ADA Compliance', 'Traffic Signal Timing',
      'ROW Maintenance', 'Oversized Vehicle', 'Parking Violation', 'Parking - 72-Hours', 'Street Sweeping',
    ],
  },
  {
    id: 'sanitation',
    label: 'Sanitation & Dumping',
    field: 'Sanitation',
    categories: [
      'Illegal Dumping', 'Missed Collection', 'Dead Animal', 'Environmental Services Code Compliance',
      'Stormwater', 'Encampment', 'Graffiti - Code Enforcement', 'Graffiti - Public',
    ],
  },
  {
    id: 'lighting',
    label: 'Lighting & Parks',
    field: 'Lighting & Parks',
    categories: [
      'Street Light Maintenance', 'Parks Issue', 'Tree Maintenance', 'Vegetation Encroachment',
      'Building and Land Use Enforcement',
    ],
  },
  { id: 'preliminary', label: 'Preliminary Drafts', field: null, categories: [] },
];

export function groupOf(category) {
  return FILTER_GROUPS.find((g) => g.categories.includes(category)) ?? FILTER_GROUPS[0];
}

export function tierInfo(tier) {
  return TIERS[tier] ?? TIERS[4];
}

export const isFlagged = (i) => i.status === 'flagged_for_review' || i.flagged_for_review === true;
export const isVisible = (i) => i.status !== 'resolved';
/** Safety items a person still has to review. Decay never touches these. */
export const isHeld = (i) => i.tier === 1 || isFlagged(i);
export const isApproved = (i) => Boolean(i.forwarded_to_crew_at) && !isFlagged(i);
