---
name: SD Voice Town Hall
description: Sensorless civic reporting · San Diego, CA
colors:
  ground: "#f8f8f7"
  card: "#ffffff"
  ink: "#1a1a1a"
  ink-2: "#5c5c59"
  ink-3: "#8a8a86"
  line: "#e6e6e2"
  line-strong: "#d4d4cf"
  wash: "#efefec"
  night: "#0d0f12"
  night-card: "#16191e"
  success: "#2f6b4a"
  tier-1: "#b42318"
  tier-2: "#1a1a1a"
  tier-3: "#6b6b67"
  tier-4: "#c8c8c2"
  heat: "#2f5ea8"
typography:
  display:
    fontFamily: "Inter Tight Variable, Inter Tight, ui-sans-serif, system-ui, sans-serif"
    fontSize: "72px"
    fontWeight: 400
    lineHeight: 1.08
    letterSpacing: "-0.04em"
    fontFeature: "'ss01', 'cv11'"
  headline:
    fontFamily: "Inter Tight Variable, Inter Tight, ui-sans-serif, system-ui, sans-serif"
    fontSize: "40px"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Inter Tight Variable, Inter Tight, ui-sans-serif, system-ui, sans-serif"
    fontSize: "26px"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "-0.03em"
  body:
    fontFamily: "Inter Tight Variable, Inter Tight, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.625
  control:
    fontFamily: "Inter Tight Variable, Inter Tight, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 450
    lineHeight: 1.25
  label:
    fontFamily: "Geist Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "0.06em"
  data:
    fontFamily: "Geist Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  tag: "3px"
  ctl: "4px"
  card: "8px"
  stage: "24px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "24px"
  gutter: "24px"
  section: "112px"
  container: "1240px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.card}"
    typography: "{typography.control}"
    rounded: "{rounded.ctl}"
    padding: "0 12px"
    height: "44px"
  button-secondary:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    rounded: "{rounded.ctl}"
    padding: "0 12px"
    height: "44px"
  button-quiet-hover:
    backgroundColor: "{colors.wash}"
    textColor: "{colors.ink}"
    rounded: "{rounded.ctl}"
  button-night-primary:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.ctl}"
    padding: "0 20px"
    height: "48px"
  filter-chip:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    rounded: "{rounded.ctl}"
    padding: "0 12px"
    height: "44px"
  filter-chip-on:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.card}"
  tier-badge:
    typography: "{typography.label}"
    rounded: "{rounded.tag}"
    padding: "1px 6px"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "16px"
  night-card:
    backgroundColor: "{colors.night-card}"
    textColor: "{colors.card}"
    rounded: "{rounded.card}"
    padding: "16px"
  call-button:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.card}"
    rounded: "{rounded.card}"
    padding: "14px 16px"
    height: "74px"
---

# Design System: SD Voice Town Hall

## Overview

**Creative North Star: "The Honest Pin"**

A voice report becomes one honest pin. The system is a quiet paper-and-ink world modelled on clarte.io: an off-white ground, near-black ink, hairline rules on a column grid, and Inter Tight set at a single regular weight with tight tracking. Headlines are spoken in two tones: an ink clause that names the thing, then a grey continuation that explains it. Data and metadata (issue IDs, radii, call counts, speaker labels, timestamps) switch to Geist Mono, so anything measured reads as measured.

Colour does one job. Urgency is a muted ramp where only Tier 1 is red and the rest step down through ink and greys; call volume is blueprint blue; a single muted green marks the done state. Everything else is neutral, which is why the red pin is the loudest thing on any screen.

Two grounds alternate. Paper (ground and white cards with hairlines) carries the working surfaces; night (blue-black) carries the landing hero, the footer, and the live call card, with translucent dark cards floating over a darkened map. The map is a first-class surface and is restyled into the same vocabulary rather than left as a stock widget.

**Key Characteristics:**
- Off-white ground, near-black ink, grey continuation text.
- Inter Tight 400 for every heading; weight never carries hierarchy, size and tone do.
- Geist Mono only for data and metadata.
- Hairline rules and column dividers instead of boxes and fills.
- 4px controls, 8px cards; translucent floating cards on night sections.
- Colour reserved for urgency (Tier 1 red), call volume (blue) and done (green).

## Colors

A near-monochrome paper palette in which three hues each own exactly one meaning.

### Primary
- **Signal Red** (tier-1): Tier 1 Safety Hazard only. Pin fill, tier badge, uncertainty halo, the hazard count in the sidebar summary, the live-call button while connected, and the confirm state of the destructive decay action. It is also the status dot for an unreachable backend.

### Secondary
- **Blueprint Blue** (heat): call volume. The heatmap runs a five-step blue gradient (#dbe5f4 → #9db6de → #5b82c2 → #2f5ea8 → #173a73) so density never reads as urgency.

### Tertiary
- **Field Green** (success): the done state only: approved for crew, resolved, every hazard reviewed, the approved-pin ring and the "Live" status dot.

### Neutral
- **Paper** (ground): page background and sidebar; also the attribution strip and selection text.
- **Sheet** (card): cards, popups, controls, chips at rest.
- **Ink** (ink): body text, primary buttons, active chips and segments, focus ring, Tier 2 pins, selection background. Errors are ink with a red mark, so red keeps meaning Tier 1.
- **Graphite** (ink-2): secondary text, metadata, quiet button text (6.2:1 on ground).
- **Pencil** (ink-3): the grey continuation of two-tone headlines; large text only (3.3:1).
- **Hairline** (line): every divider, card border, column rule.
- **Strong Hairline** (line-strong): secondary-button and vote-button borders, dashed disclosure borders, small mono tags, scrollbar thumb.
- **Wash** (wash): quiet hover fill, loading placeholders, track backgrounds.
- **Night** (night): landing hero and footer ground.
- **Night Card** (night-card): translucent floating cards on night (80 to 90% opacity with background blur), including the live sample-call card over the map.
- **Tier 3 Stone** (tier-3) and **Tier 4 Ash** (tier-4): the lower steps of the urgency ramp. Tier 4 carries an inset tier-3 edge so it holds on the grey basemap.

### Named Rules
**The One Job Rule.** Red means Tier 1, blue means call volume, green means done. No hue is ever borrowed for decoration, emphasis or branding.

**The Muted Ramp Rule.** Urgency below Tier 1 is expressed in ink and greys (Tier 2 ink, Tier 3 stone, Tier 4 ash), never with additional hues.

**The Ink Error Rule.** Error messages are ink text with a red mark, not red text, so red stays reserved for hazards.

## Typography

**Display Font:** Inter Tight Variable (with ui-sans-serif, system-ui)
**Body Font:** Inter Tight Variable
**Label/Mono Font:** Geist Mono (with ui-monospace, SFMono-Regular, Menlo)

**Character:** One tightly tracked grotesque at regular weight does everything sentence-shaped; a mono face does everything measured. Both faces are self-hosted so a venue with no internet still gets the real type. Stylistic sets ss01 and cv11 are on globally.

### Hierarchy
- **Display** (400, 44 / 60 / 72px by breakpoint, 1.08, -0.04em): the landing hero headline only; also the oversized ghost wordmark in the footer.
- **Headline** (400, 34 to 44px, 1.2, -0.03em): landing section statements, always two-tone.
- **Title** (400, 18 to 26px, 1.2, -0.03em): feature and step titles (26px), sidebar section headings (22px), popup titles (19px), toast titles (18px).
- **Body** (400, 15 to 17px, 1.625): running text. Lead paragraphs 16 to 17px capped at 40 to 56ch; card and list text 15px capped at 34 to 38ch.
- **Control** (450, 14px; 16px for hero buttons): buttons, chips, segments, nav.
- **Label** (Geist Mono 400, 11px, 0.06em, uppercase): metadata lines on cards and popups (ID · category, speaker labels, call state), the status pill, the legend header.
- **Data** (Geist Mono 400, 12 to 13px, tabular figures): counts, radii (±800 m → ±90 m), timestamps, PINs.

### Named Rules
**The Two-Tone Rule.** A heading is one clause in ink followed by a continuation in grey (ink-3 on paper, white at 50 to 55% on night). The grey half explains; it never repeats.

**The Regular Weight Rule.** Headings are 400. Hierarchy comes from size, tracking and tone, never bold. The only heavier text is 450 on controls and 500 on queue-card titles.

**The Measured-Means-Mono Rule.** If it is an ID, a count, a radius, a time or a speaker label, it is Geist Mono. Sentences are never mono.

## Layout

A 1240px container with 16px gutters (24px from 640px). Landing sections breathe at 96 to 144px vertical padding and are separated by full-width hairlines. Statements are offset onto the column grid at large widths (indented to the second third, `33%`), and feature rows use a three-column 1 / 1.3 / 1 grid that alternates sides row by row. Step and note lists are hairline-divided columns (four, then three) that collapse to stacked rows with bottom rules.

The map dashboard is a 56px hairline header over a split: map left, sidebar right (30% wide, 380 to 520px) with a left hairline; below 1024px the map takes the top 64vh and the sidebar stacks under it. Map controls float centred at the top (segmented layer switch, then a horizontally scrolling chip row with edge fades); the legend floats bottom-left; the live call card docks to the map's right edge on desktop. Sidebar sections use 20px side padding, 24px vertical, divided by hairlines.

Breakpoints are 640px, 768px and 1024px. Touch targets are at least 40px, usually 44px.

## Elevation & Depth

Mostly flat paper with hairlines; shadows are soft, low-contrast and ambient, and exist mainly to lift things off the map. On night sections depth comes from translucency and blur over a darkened map rather than from shadows.

### Shadow Vocabulary
- **Card** (`0 1px 2px rgb(0 0 0 / .04), 0 8px 24px rgb(0 0 0 / .06)`): floating map controls, legend, tooltips, demo cards on the landing.
- **Float** (`0 2px 6px rgb(0 0 0 / .06), 0 16px 40px rgb(0 0 0 / .12)`): popups and toasts.
- **Night float** (`0 16px 40px rgb(0 0 0 / .35 to .4)`): dark translucent cards over the night map.
- **Rest** (`0 1px 2px rgb(0 0 0 / .03 to .05)`): queue cards and filter chips sitting on paper.
- **Pin lift** (`drop-shadow(0 1px 1.5px rgb(0 0 0 / .4))`): map pins, so light tiers hold on the grey basemap.

### Named Rules
**The Hairline First Rule.** Separate with a 1px line before reaching for a fill or a shadow. Shadows belong to things that float over the map or over other content.

## Shapes

Small, consistent corners: 3px for mono tags and tier badges, 4px for every control, 8px for every card, popup and toast, 24px only for the soft radial stage that frames each landing feature visual. Circles are reserved for pins, halos, status dots and the halo demo. Dashed strokes carry a meaning: an uncertain location (halo ≥ 400 m or a preliminary draft) and the optional decay disclosure. The mark is three concentric rings (dashed outer, solid middle, filled centre), the halo idea drawn as a logo.

## Components

### Buttons
Quiet, rectangular and confident; weight 450, no uppercase.
- **Shape:** gently squared (4px), at least 44px tall in the app, 48px on the landing hero.
- **Primary:** ink fill, white text, 12px side padding; hover drops to 85% ink.
- **Secondary:** white sheet with a strong hairline border; hover turns the border ink.
- **Quiet:** no border, ink text; hover fills with wash.
- **On night:** primary is white with ink text (hover 85% white); ghost is a 20% white border over 5% white with blur (hover 12% white).
- **Focus:** a 2px ink outline, 2px offset, on every interactive element.

### Chips
- **Style:** filter chips are white with a hairline border, a 16px line icon at 70% opacity, the label, and a mono count in graphite.
- **State:** pressed chips invert to ink with white text and a 75% white count; hover at rest turns the border ink. The layer switch is a segmented control inside a white bordered tray (6px) with an ink active segment.

### Tier Badge
A 3px-cornered tag in the tier's fill, Geist Mono 11px uppercase ("TIER 1"), optionally followed by the tier name in sentence case. Tier 4 adds an inset stone edge.

### Cards / Containers
- **Corner Style:** 8px.
- **Background:** white sheet on paper; night card at 80 to 90% with blur on night.
- **Shadow Strategy:** rest shadow in lists, card shadow when floating, float shadow for popups and toasts.
- **Border:** hairline (12% white on night).
- **Internal Padding:** 16px; 12px vertical for compact cards.
- **Anatomy:** a mono label line (ID · category, or speaker · language), then a title, then body, then a mono data line.

### Navigation
Landing: transparent over the night hero, 64px tall, wordmark with the ring mark at 17px, links at 14px in 80% white, a white primary button at the right. App: 56px paper header with a bottom hairline, graphite links with the current page in ink, and a mono status pill (dot plus "DEMO DATA" or "LIVE").

### Map Pins and Halos (signature)
Pins are tier-filled circles with a white edge (stone edge for Tier 4), sized by call count (7px + 0.55px per call, capped at 17 calls). Preliminary drafts are hollow with a dashed edge. Each pin carries an uncertainty halo in the tier's halo colour: solid at 14% fill when the location is good, dashed (6 6) at 7% fill when approximate. Approved pins gain a 3px green ring. A changed pin pulses outward three times; tier changes fade over 0.6s.

### Live Call Card (signature)
A dark night card that docks to the map edge during a sample call: mono state label, transcript lines that rise in one by one (speaker label in mono, caller in white, agent in 65% white), and an outcome line under a hairline.

### Approval Undo Row
After approval the card becomes an ink bar with a countdown, an outlined Undo button and a 1px white bar that drains left; on commit it shows a green check row that holds, then folds closed so the list never jumps.

## Do's and Don'ts

### Do:
- **Do** set every heading in Inter Tight 400 with negative tracking (-0.03em to -0.04em) and write it as two tones: ink clause, grey continuation.
- **Do** put IDs, counts, radii, timestamps and speaker labels in Geist Mono; use tabular figures for anything that changes.
- **Do** keep controls at 4px and cards at 8px; 3px only for small mono tags.
- **Do** divide with 1px hairlines (#e6e6e2 on paper, 10 to 12% white on night) before using fills or shadows.
- **Do** use ink-3 grey only at 24px and above; use ink-2 for any smaller secondary text.
- **Do** let things arrive: rise-in (0.32s, cubic-bezier(.16, 1, .3, 1)) for cards, toasts and transcript lines; respect reduced motion.
- **Do** show location uncertainty honestly: dashed halos for approximate or draft locations, never a precise pin for a guess.

### Don't:
- **Don't** use red for anything but Tier 1, blue for anything but call volume, or green for anything but done.
- **Don't** add hues to the urgency ramp; Tiers 2 to 4 stay ink and greys.
- **Don't** colour error text red; errors are ink with a red mark.
- **Don't** bold headings or carry hierarchy with weight.
- **Don't** set sentences in mono, or use mono uppercase labels as headings above headlines.
- **Don't** fall back to the navy civic-dashboard shell or a centred-hero-plus-card-row landing.
