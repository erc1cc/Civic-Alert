// 35 realistic pre-seeded San Diego calls clustered around Downtown (7th & Eighth),
// North Park (University Ave), Mission Valley and Pacific Beach.
// Timestamps are relative to "now" so the demo always looks fresh.

import { tierFor } from './categories.js';

const H = 3600 * 1000;

function mk(id, category, title, lat, lng, radius, calls, firstDaysAgo, lastHoursAgo, descriptions, opts = {}) {
  const now = Date.now();
  const tier = opts.tier ?? tierFor(category, descriptions.join(' '));
  const status = opts.status ?? (tier === 1 && !opts.forwarded ? 'flagged_for_review' : 'active');
  return {
    id,
    pin_code: status === 'preliminary' ? opts.pin : null,
    status,
    category,
    tier,
    title,
    descriptions,
    lat,
    lng,
    uncertainty_radius_meters: radius,
    call_count: calls,
    first_reported_at: new Date(now - firstDaysAgo * 24 * H).toISOString(),
    last_reported_at: new Date(now - lastHoursAgo * H).toISOString(),
    still_there_yes: opts.yes ?? Math.max(0, Math.floor(calls / 3)),
    still_there_no: opts.no ?? 0,
    neighborhood: opts.hood,
    location_label: opts.place,
    flagged_for_review: status === 'flagged_for_review',
    forwarded_to_crew: !!opts.forwarded,
    conversation_ids: [],
  };
}

export function buildSeed() {
  return [
    // ── Downtown / East Village / Gaslamp ──
    mk('SD-101', 'Pothole', 'Huge pothole at 7th & Eighth', 32.71118, -117.15741, 200, 17, 4, 2, [
      'There is a huge pothole right at 7th and Eighth, my tire blew out last night.',
      'Pothole near the corner by the parking garage on 7th, cars are swerving into the bike lane.',
      'Big crater in the road on 7th by Market, a scooter rider almost went down.',
      'Massive pothole on 7th right by the parking structure entrance, it is getting deeper every day.',
    ], { hood: 'Downtown', place: '7th & Eighth (7th Ave & Market St)', yes: 9 }),
    mk('SD-102', 'Street Light Maintenance', 'Street lights out along Market & 10th', 32.71118, -117.15380, 120, 5, 6, 10, [
      'Whole block of Market by 10th is pitch black at night.',
      'Street lights near the East Village library are out, feels unsafe walking home.',
    ], { hood: 'East Village', place: 'Market St & 10th Ave' }),
    mk('SD-103', 'Encampment', 'Encampment blocking sidewalk near City College', 32.71780, -117.15300, 150, 8, 9, 5, [
      'Tents are blocking the whole sidewalk on Park Blvd by City College, people walking in the street.',
      'Encampment by the trolley stop near City College, there was a small fire last night.',
    ], { hood: 'East Village', place: 'Park Blvd & C St' }),
    mk('SD-104', 'Illegal Dumping', 'Mattresses & furniture dumped at 14th & Imperial', 32.70660, -117.14850, 90, 6, 3, 7, [
      'Somebody dumped three mattresses and a couch at 14th and Imperial.',
      'Pile of junk furniture in the alley off Imperial, it is attracting rats.',
    ], { hood: 'East Village', place: '14th St & Imperial Ave' }),
    mk('SD-105', 'Graffiti - Public', 'Graffiti on Petco Park parking structure wall', 32.70650, -117.15550, 250, 3, 5, 30, [
      'Fresh graffiti tagging on the parking structure wall by Petco Park.',
    ], { hood: 'East Village', place: 'Petco Park' }),
    mk('SD-106', 'Sidewalk Repair Issue', 'Uplifted sidewalk at 5th & G (trip hazard)', 32.71280, -117.16000, 50, 4, 12, 20, [
      'Sidewalk is uplifted by tree roots at 5th and G, my mom tripped on it.',
      'Big crack in the sidewalk in the Gaslamp, hard to get a wheelchair over.',
    ], { hood: 'Gaslamp', place: '5th Ave & G St' }),
    mk('SD-107', 'Parking Violation', 'Car blocking fire hydrant at India & Date', 32.72130, -117.16900, 50, 2, 0.3, 1, [
      'A car is parked right in front of the fire hydrant at India and Date, been there all day.',
      'Same car still blocking the hydrant in Little Italy, a fire truck could not get in there.',
    ], { hood: 'Little Italy', place: 'India St & Date St' }),
    mk('SD-108', 'Stormwater', 'Street flooding — blocked drain near Santa Fe Depot', 32.71600, -117.17080, 200, 3, 0.5, 3, [
      'Storm drain is clogged and Broadway near the train station is flooding into the crosswalk.',
      'Water everywhere by Santa Fe Depot, cars are stalling.',
    ], { hood: 'Downtown', place: 'Broadway & Pacific Hwy' }),
    mk('SD-109', 'Missed Collection', 'Missed trash pickup at 11th & Island', 32.71010, -117.15270, 50, 2, 3, 26, [
      'Our building trash pickup was missed twice this week on Island Ave.',
    ], { hood: 'East Village', place: '11th Ave & Island Ave' }),
    mk('SD-110', 'Dead Animal', 'Dead animal in roadway at Broadway & 2nd', 32.71550, -117.16360, 50, 1, 1, 22, [
      'There is a dead raccoon in the right lane on Broadway at 2nd.',
    ], { hood: 'Downtown', place: 'Broadway & 2nd Ave' }),

    // ── North Park / Hillcrest ──
    mk('SD-201', 'Traffic Signal Issue', 'Dark traffic signal at University & 30th', 32.74862, -117.13018, 150, 9, 1, 1, [
      'The traffic light at University and 30th is completely dark, people are just going through.',
      'Signal is out by the North Park sign, almost got T-boned.',
      'Traffic light at University and 30th is still out this morning, total chaos at rush hour.',
    ], { hood: 'North Park', place: 'University Ave & 30th St' }),
    mk('SD-202', 'Pothole', 'Deep pothole on University Ave at Texas St', 32.74860, -117.13550, 60, 6, 7, 9, [
      'Deep pothole on University at Texas, eastbound lane.',
      'Pothole in front of the bus stop on University, buses are slamming through it.',
    ], { hood: 'North Park', place: 'University Ave & Texas St' }),
    mk('SD-203', 'Street Light Maintenance', 'Street light out at 30th & North Park Way', 32.74690, -117.13020, 50, 4, 5, 14, [
      'Street light has been out at 30th and North Park Way for a week.',
    ], { hood: 'North Park', place: '30th St & North Park Way' }),
    mk('SD-204', 'Tree Maintenance', 'Large limb down across Upas St near Morley Field', 32.73800, -117.13350, 80, 2, 0.8, 18, [
      'A big eucalyptus limb fell across Upas by 28th, blocking one lane.',
    ], { hood: 'North Park', place: 'Upas St & 28th St', forwarded: true }),
    mk('SD-205', 'Graffiti - Code Enforcement', 'Graffiti on storefront at University & Ray', 32.74860, -117.12940, 50, 2, 6, 40, [
      'Someone tagged the store front on University near Ray Street.',
    ], { hood: 'North Park', place: 'University Ave & Ray St' }),
    mk('SD-206', 'Parking - 72-Hours', 'Abandoned car on Utah St (72+ hrs)', 32.74950, -117.13200, 400, 1, 8, 190, [
      'A silver sedan has not moved from Utah Street in over a week.',
    ], { hood: 'North Park', place: 'Utah St, North Park' }),
    mk('SD-207', 'Parks Issue', 'Broken playground slide at North Park Community Park', 32.75300, -117.13240, 120, 3, 2, 12, [
      'The slide at the North Park Community Park playground is broken with sharp exposed edges.',
      'Playground equipment at the park is broken, it is dangerous for the kids.',
    ], { hood: 'North Park', place: 'North Park Community Park' }),
    mk('SD-208', 'Illegal Dumping', 'Construction debris dumped off El Cajon & 30th', 32.75530, -117.13020, 100, 4, 4, 8, [
      'Construction debris and tires dumped in the alley off El Cajon Blvd and 30th.',
    ], { hood: 'North Park', place: 'El Cajon Blvd & 30th St' }),
    mk('SD-209', 'Sidewalk Repair Issue', 'Possible sidewalk hazard near North Park Observatory', 32.74890, -117.12970, 1000, 1, 0.2, 4, [
      "I'm in a hurry — something's broken on the sidewalk near the Observatory, I'll call back.",
    ], { hood: 'North Park', place: 'North Park Observatory (approx.)', status: 'preliminary', pin: '402', yes: 0 }),

    // ── Mission Valley ──
    mk('SD-301', 'Stormwater', 'Active flooding on Hotel Circle N', 32.76050, -117.17350, 120, 7, 0.6, 2, [
      'Hotel Circle North is flooded near the river, two lanes under water.',
      'Storm drain by the hotels on Hotel Circle is blocked and water is rising.',
    ], { hood: 'Mission Valley', place: 'Hotel Circle N' }),
    mk('SD-302', 'Pothole', 'Pothole cluster at Friars Rd & Mission Center Rd', 32.77030, -117.15470, 40, 11, 10, 3, [
      'Several potholes on Friars at Mission Center, my rim is bent.',
      'Potholes on Friars Road by the mall entrance, getting worse after the rain.',
    ], { hood: 'Mission Valley', place: 'Friars Rd & Mission Center Rd' }),
    mk('SD-303', 'Traffic Signal Timing', 'Left-turn signal too short at Camino de la Reina', 32.76520, -117.15470, 50, 3, 14, 50, [
      'The left turn arrow at Camino de la Reina and Mission Center only lets two cars through.',
    ], { hood: 'Mission Valley', place: 'Camino de la Reina & Mission Center Rd' }),
    mk('SD-304', 'Encampment', 'Encampment along San Diego River trail', 32.76600, -117.13800, 300, 5, 11, 16, [
      'Large encampment along the river trail near Qualcomm Way, blocking the path.',
    ], { hood: 'Mission Valley', place: 'San Diego River Trail @ Qualcomm Way' }),
    mk('SD-305', 'Oversized Vehicle', 'RV parked long-term near Fashion Valley Rd', 32.76500, -117.16900, 300, 2, 6, 60, [
      'An RV has been parked on Fashion Valley Road for days taking up three spots.',
    ], { hood: 'Mission Valley', place: 'Fashion Valley Rd' }),
    mk('SD-306', 'Street Light Maintenance', 'Street lights out on Rio San Diego Dr', 32.76900, -117.14500, 400, 2, 4, 30, [
      'Lights are out along Rio San Diego Drive near the trolley.',
    ], { hood: 'Mission Valley', place: 'Rio San Diego Dr' }),
    mk('SD-307', 'Vegetation Encroachment', 'Bushes blocking stop sign at Texas & Camino del Rio S', 32.76170, -117.13730, 50, 2, 9, 70, [
      'Overgrown bushes are blocking the stop sign at Texas and Camino del Rio South.',
    ], { hood: 'Mission Valley', place: 'Texas St & Camino del Rio S' }),
    mk('SD-308', 'Illegal Dumping', 'Possible dumping near Snapdragon Stadium', 32.78310, -117.11960, 1000, 1, 0.1, 2, [
      "I'm in a rush, there's a pile of trash dumped somewhere by Snapdragon, I'll call back.",
    ], { hood: 'Mission Valley', place: 'Snapdragon Stadium (approx.)', status: 'preliminary', pin: '718', yes: 0 }),

    // ── Pacific Beach ──
    mk('SD-401', 'Missed Collection', 'Overflowing trash cans at Crystal Pier', 32.79660, -117.25580, 80, 8, 3, 4, [
      'Trash cans at the entrance to Crystal Pier are overflowing onto the boardwalk.',
      'Bins by the pier are full and trash is blowing onto the sand.',
    ], { hood: 'Pacific Beach', place: 'Crystal Pier' }),
    mk('SD-402', 'Graffiti - Public', 'Graffiti on lifeguard-area wall at Garnet & Mission', 32.79730, -117.25360, 50, 4, 6, 28, [
      'Graffiti on the public wall at Garnet and Mission Blvd.',
    ], { hood: 'Pacific Beach', place: 'Garnet Ave & Mission Blvd' }),
    mk('SD-403', 'Pothole', 'Pothole on Garnet Ave at Ingraham St', 32.79830, -117.24200, 60, 5, 5, 11, [
      'Pothole on Garnet at Ingraham westbound, right before the light.',
    ], { hood: 'Pacific Beach', place: 'Garnet Ave & Ingraham St' }),
    mk('SD-404', 'Parking Violation', 'Cars parked in red zone at PB Dr & Mission Blvd', 32.78880, -117.25380, 50, 2, 2, 20, [
      'People keep parking on the red curb at Pacific Beach Drive and Mission.',
    ], { hood: 'Pacific Beach', place: 'Pacific Beach Dr & Mission Blvd' }),
    mk('SD-405', 'Dead Animal', 'Dead animal at Grand Ave & Lamont St', 32.79450, -117.24100, 50, 1, 0.7, 15, [
      'Dead cat on Grand Ave at Lamont, in the bike lane.',
    ], { hood: 'Pacific Beach', place: 'Grand Ave & Lamont St' }),
    mk('SD-406', 'ADA Compliance', 'Broken curb ramp at Garnet & Cass', 32.79760, -117.25060, 50, 2, 8, 45, [
      'The curb ramp at Garnet and Cass is broken, my wheelchair cannot get up onto the sidewalk.',
    ], { hood: 'Pacific Beach', place: 'Garnet Ave & Cass St' }),
    mk('SD-407', 'Street Light Maintenance', 'Street light out at Mission Blvd & Hornblend', 32.79950, -117.25330, 50, 3, 4, 19, [
      'The street light at Mission and Hornblend is out, really dark by the bars at closing.',
    ], { hood: 'Pacific Beach', place: 'Mission Blvd & Hornblend St' }),
    mk('SD-408', 'Environmental Services Code Compliance', 'Oil runoff into storm drain at Mission Bay Dr', 32.80050, -117.22350, 120, 2, 2, 27, [
      'Someone is washing oil into the storm drain at Mission Bay Drive and Garnet, it goes right into the bay.',
    ], { hood: 'Pacific Beach', place: 'Mission Bay Dr & Garnet Ave' }),
  ];
}
