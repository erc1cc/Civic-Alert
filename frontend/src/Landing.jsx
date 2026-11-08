import { MapContainer, TileLayer, Circle, CircleMarker } from 'react-leaflet';
import { ArrowRight, ArrowUpRight, Map as MapIcon, Mic } from 'lucide-react';
import seed from '../../data/issues.json';
import { TIERS } from './lib/categories';
import { fmtRadius } from './lib/time';

const open = seed.filter((i) => i.status !== 'resolved');
const totalCalls = open.reduce((n, i) => n + i.call_count, 0);

function Mark({ className = 'size-6' }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" strokeOpacity=".35" strokeWidth="1.5" strokeDasharray="3 3" />
      <circle cx="16" cy="16" r="8" fill="none" stroke="currentColor" strokeOpacity=".75" strokeWidth="1.5" />
      <circle cx="16" cy="16" r="3.5" fill="currentColor" />
    </svg>
  );
}

/** The hero ground: the real seed issues on a dark San Diego basemap, drawn as halos. Not interactive. */
function NightMap() {
  // Wide screens: offset the city so its pin cluster sits in the right third, beside the copy, not behind it.
  const wide = typeof window !== 'undefined' && window.innerWidth >= 1024;
  return (
    <MapContainer
      center={wide ? [32.752, -117.322] : [32.79, -117.175]}
      zoom={12}
      zoomControl={false}
      attributionControl={false}
      dragging={false}
      scrollWheelZoom={false}
      doubleClickZoom={false}
      touchZoom={false}
      boxZoom={false}
      keyboard={false}
      className="absolute inset-0 h-full w-full"
      style={{ background: '#0d0f12' }}
    >
      <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}" maxZoom={16} />
      {open.map((i) => {
        const hazard = i.tier === 1;
        const c = hazard ? '#ff5a5f' : '#a9c4ef';
        return (
          <Circle
            key={i.id}
            center={[i.lat, i.lng]}
            radius={i.uncertainty_radius_meters}
            interactive={false}
            pathOptions={{
              color: c,
              weight: 1.25,
              opacity: hazard ? 0.95 : 0.7,
              dashArray: i.uncertainty_radius_meters >= 400 || i.status === 'preliminary' ? '4 5' : null,
              fillColor: c,
              fillOpacity: hazard ? 0.2 : 0.1,
            }}
          />
        );
      })}
      {open.map((i) => (
        <CircleMarker
          key={`p-${i.id}`}
          center={[i.lat, i.lng]}
          radius={3 + Math.min(i.call_count, 17) * 0.22}
          interactive={false}
          pathOptions={{ stroke: false, fillColor: i.tier === 1 ? '#ff7a7e' : '#eef3fb', fillOpacity: 1 }}
        />
      ))}
    </MapContainer>
  );
}

function FloatCard({ label, children, className = '', delay = '0s' }) {
  return (
    <div
      className={`drift absolute rounded-[var(--radius-card)] border border-white/12 bg-[#16191e]/80 px-4 py-3 text-[15px] leading-snug text-white shadow-[0_16px_40px_rgb(0_0_0/0.4)] backdrop-blur-md ${className}`}
      style={{ animationDelay: delay }}
    >
      <p className="meta mb-1.5 text-white/55">{label}</p>
      {children}
    </div>
  );
}

function Nav() {
  return (
    <header className="absolute inset-x-0 top-0 z-20">
      <nav aria-label="Main" className="mx-auto flex h-16 max-w-[1240px] items-center gap-8 px-4 text-white sm:px-6">
        <a href="/" className="flex items-center gap-2.5 text-[17px] tracking-[-0.02em]">
          <Mark /> SD Voice Town Hall
        </a>
        <ul className="hidden items-center gap-6 text-[14px] text-white/80 md:flex">
          <li><a className="hover:text-white" href="#how">How it works</a></li>
          <li><a className="hover:text-white" href="#what">What it does</a></li>
          <li><a className="hover:text-white" href="#honest">Prototype notes</a></li>
        </ul>
        <a
          href="/map"
          className="ml-auto inline-flex min-h-10 items-center rounded-[var(--radius-ctl)] bg-white px-3.5 text-[14px] font-[450] text-ink transition-colors hover:bg-white/85"
        >
          Open the live map
        </a>
      </nav>
    </header>
  );
}

function Hero() {
  return (
    <section aria-labelledby="hero-h" className="relative isolate flex min-h-[760px] items-center overflow-hidden bg-night text-white lg:min-h-[100svh]">
      {/* Own stacking context: Leaflet's panes use z-index 400+, which would otherwise sit above the copy */}
      <div className="night-map absolute inset-0 z-0" aria-hidden><NightMap /></div>
      {/* Vignette keeps the headline legible over the map, and the bottom fades into the paper below */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_42%_38%_at_50%_52%,rgb(13_15_18/0.9)_0%,rgb(13_15_18/0.6)_55%,rgb(13_15_18/0)_100%)]" aria-hidden />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-ground" aria-hidden />

      <FloatCard label="Caller · ES · listening" className="left-[6%] top-[22%] hidden w-[300px] lg:block">
        <span lang="es">“La banqueta está levantada enfrente de la primaria en Logan Avenue.”</span>
      </FloatCard>
      <FloatCard label="SD-135 · location" className="right-[6%] top-[26%] hidden w-[280px] lg:block" delay="-2s">
        <span>Palm frond across Laurel St</span>
        <span className="mt-1 flex items-center gap-2 font-mono text-[13px] text-white/80">
          {fmtRadius(800)} <ArrowRight className="size-3.5" aria-hidden /> {fmtRadius(90)}
        </span>
      </FloatCard>
      <FloatCard label="Review · Tier 1" className="bottom-[20%] right-[10%] hidden w-[300px] lg:block" delay="-4s">
        Dark traffic signal at University &amp; 30th. Waiting for an official.
      </FloatCard>
      <div className="drift absolute bottom-[22%] left-[10%] hidden items-center gap-2 rounded-[var(--radius-card)] border border-white/12 bg-[#16191e]/80 px-3.5 py-2 text-[14px] text-white backdrop-blur-md lg:flex" style={{ animationDelay: '-5s' }}>
        17 calls <ArrowRight className="size-3.5 text-white/60" aria-hidden /> 1 pothole
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1240px] px-4 pt-16 text-center sm:px-6">
        <h1 id="hero-h" className="display mx-auto text-[44px] sm:text-[60px] lg:text-[72px]">
          <span className="block">Report it out loud.</span>
          <span className="block text-white/55">The map works out where.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-[56ch] text-[17px] leading-relaxed text-white/75">
          SD Voice Town Hall turns phone calls about potholes, dark signals and dumped furniture into one honest pin
          each: merged across callers, sized by how sure we are of the spot, and checked by a person before a crew is sent.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <a
            href="/map?call=1"
            className="inline-flex min-h-12 items-center gap-2 rounded-[var(--radius-ctl)] bg-white px-5 text-[16px] font-[450] text-ink transition-colors hover:bg-white/85"
          >
            <Mic className="size-4" aria-hidden /> Play a sample call
          </a>
          <a
            href="/map"
            className="inline-flex min-h-12 items-center gap-2 rounded-[var(--radius-ctl)] border border-white/20 bg-white/5 px-5 text-[16px] font-[450] text-white backdrop-blur transition-colors hover:bg-white/12"
          >
            <MapIcon className="size-4" aria-hidden /> Open the live map
          </a>
        </div>
        <p className="meta mt-6 text-white/50">English / Español · no app · no GPS · hackathon prototype</p>
      </div>
    </section>
  );
}

function Problem() {
  return (
    <section aria-label="Why voice" className="mx-auto max-w-[1240px] px-4 py-28 sm:px-6 lg:py-36">
      <p className="title max-w-[30ch] text-[30px] sm:text-[40px] lg:ml-[33%] lg:text-[44px]">
        Reporting a broken street shouldn’t need an app, an account, or a GPS fix.{' '}
        <span className="text-ink-3">
          Most people who notice a dark signal or a dumped couch have a phone and a minute. Voice Town Hall takes the call
          in English or Spanish, asks for a landmark, and does the locating itself.
        </span>
      </p>
    </section>
  );
}

const STEPS = [
  ['Call', 'Describe it out loud', 'The voice agent asks what’s wrong and what’s nearby. No address, no form.'],
  ['Pin', 'One issue, many callers', 'Calls about the same thing merge. Every landmark narrows the halo.'],
  ['Verify', 'Neighbors keep it honest', 'Anyone can mark a pin still there or gone. Three “gone” votes clear it.'],
  ['Review', 'A person approves hazards', 'Tier 1 reports wait for an official before a crew is sent.'],
];

function How() {
  return (
    <section id="how" aria-labelledby="how-h" className="border-t border-line">
      <div className="mx-auto max-w-[1240px] px-4 pt-14 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 id="how-h" className="title text-[34px] sm:text-[40px]">How a call becomes a fix</h2>
          <p className="text-[14px] text-ink-2">Four steps, in the order the live map plays them</p>
        </div>
      </div>
      <ol className="mx-auto mt-10 grid max-w-[1240px] border-t border-line sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map(([name, title, body], k) => (
          <li key={name} className="border-b border-line px-4 py-6 sm:px-6 lg:border-b-0 lg:border-r lg:last:border-r-0">
            <span className="block text-right font-mono text-[12px] text-ink-2" aria-hidden>{String(k + 1).padStart(2, '0')}</span>
            <h3 className="title mt-14 text-[26px]">{name}. <span className="text-ink-3">{title}.</span></h3>
            <p className="mt-3 max-w-[34ch] text-[15px] leading-relaxed text-ink-2">{body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function HaloDemo() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[420px]">
      {/* Only the drawing is clipped to the circle; the card sits above it, unclipped */}
      <div className="absolute inset-0 overflow-hidden rounded-full bg-[radial-gradient(circle,#ffffff_0%,#f8f8f7_70%)]">
      <svg viewBox="0 0 400 400" className="absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M20 0H0V20" fill="none" stroke="#e6e6e2" strokeWidth="1" />
          </pattern>
          <radialGradient id="fade"><stop offset="60%" stopColor="#fff" stopOpacity="0" /><stop offset="100%" stopColor="#f8f8f7" /></radialGradient>
        </defs>
        <rect width="400" height="400" fill="url(#grid)" />
        <path d="M0 236 C120 230 180 200 400 170" stroke="#d4d4cf" strokeWidth="10" fill="none" />
        <path d="M150 0 C170 120 200 260 230 400" stroke="#d4d4cf" strokeWidth="7" fill="none" />
        <path d="M0 90 L400 120" stroke="#e0e0db" strokeWidth="4" fill="none" />
        <circle className="halo-demo" cx="194" cy="208" r="22" fill="#b42318" fillOpacity=".07" stroke="#b42318" strokeOpacity=".6" strokeWidth="1.5" />
        <circle cx="194" cy="208" r="8" fill="#b42318" stroke="#fff" strokeWidth="2.5" />
        <rect width="400" height="400" fill="url(#fade)" />
      </svg>
      </div>
      <div className="absolute inset-x-[10%] bottom-[6%] rounded-[var(--radius-card)] border border-line bg-white/90 px-4 py-3 shadow-[var(--shadow-card)] backdrop-blur">
        <p className="meta text-ink-2">SD-135 · 2 callers</p>
        <p className="mt-1 text-[15px]">Laurel St at the Cabrillo Bridge</p>
        <p className="mt-0.5 flex items-center gap-2 font-mono text-[13px] text-ink-2">
          {fmtRadius(800)} <ArrowRight className="size-3.5" aria-hidden /> {fmtRadius(90)}
        </p>
      </div>
    </div>
  );
}

function TranscriptDemo() {
  const lines = [
    ['Agent', 'What’s the problem, and what’s near it?', 'en'],
    ['Caller', 'There’s a pothole on Grand Avenue, right in front of the taco shop at Ingraham.', 'en'],
    ['Agent', 'Which lane is it in?', 'en'],
    ['Caller', 'Eastbound, the right lane. My whole car jolted.', 'en'],
  ];
  return (
    <div className="mx-auto w-full max-w-[420px] space-y-3">
      <div className="rounded-[var(--radius-card)] border border-line bg-white p-4 shadow-[var(--shadow-card)]">
        <p className="meta flex justify-between text-ink-2"><span>Sample call · EN</span><span>00:41</span></p>
        <ol className="mt-3 space-y-2.5 text-[15px] leading-snug">
          {lines.map(([who, text], k) => (
            <li key={k} className="flex gap-3">
              <span className="meta w-14 shrink-0 pt-0.5 text-ink-2">{who}</span>
              <span className={who === 'Caller' ? 'text-ink' : 'text-ink-2'}>{text}</span>
            </li>
          ))}
        </ol>
      </div>
      <div className="ml-10 rounded-[var(--radius-card)] border border-line bg-white px-4 py-3 shadow-[var(--shadow-card)]">
        <p className="meta text-ink-2">Filed · SD-130</p>
        <p className="mt-1 text-[15px]">Draft confirmed by a second caller. {fmtRadius(1000)} → {fmtRadius(60)}</p>
      </div>
    </div>
  );
}

function DecayDemo() {
  const rows = [
    [1, 6, 6, 'held'],
    [2, 17, 0, ''],
    [3, 7, 17, ''],
    [4, 5, 7, ''],
  ];
  return (
    <div className="mx-auto w-full max-w-[420px] rounded-[var(--radius-card)] border border-line bg-white p-5 shadow-[var(--shadow-card)]">
      <p className="meta flex justify-between text-ink-2"><span>Two weeks, no new calls</span><span>Demo data</span></p>
      <ul className="mt-4 space-y-3">
        {rows.map(([t, a, b, note]) => (
          <li key={t} className="grid grid-cols-[72px_1fr_64px] items-center gap-3 text-[14px]">
            <span className="flex items-center gap-2">
              <span className="size-2.5 rounded-full" style={{ background: TIERS[t].color, boxShadow: `0 0 0 1px ${TIERS[t].edge === '#ffffff' ? TIERS[t].color : TIERS[t].edge}` }} aria-hidden />
              {TIERS[t].label}
            </span>
            <span className="relative h-1.5 rounded-full bg-wash">
              <span className="absolute inset-y-0 left-0 rounded-full bg-line-strong" style={{ width: `${(a / 17) * 100}%` }} />
              <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${(b / 17) * 100}%`, background: TIERS[t].color }} />
            </span>
            <span className="text-right font-mono text-[13px] text-ink-2">{note || `${a} → ${b}`}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 border-t border-line pt-3 text-[14px] text-ink-2">5 routine issues resolved. 6 safety hazards held for a person.</p>
    </div>
  );
}

const FEATURES = [
  {
    id: 'loc',
    title: 'Honest location.',
    body: 'Every pin carries a halo sized to how sure we are of the spot. It tightens as more callers name landmarks, and it stays dashed while we are guessing.',
    visual: <HaloDemo />,
    facts: [`Pinpointed · ${fmtRadius(60)} or less`, `Neighborhood · up to ${fmtRadius(400)}`, 'Approximate · wider, dashed', 'Draft · hollow pin'],
  },
  {
    id: 'talk',
    title: 'A conversation, not a form.',
    body: 'The agent asks one question at a time, in English or Spanish. Callers who can’t name a cross street get a PIN to confirm the report later.',
    visual: <TranscriptDemo />,
    facts: ['English', 'Español', 'Caller PIN for drafts', 'No GPS, no app'],
  },
  {
    id: 'quiet',
    title: 'Silence isn’t proof.',
    body: 'With no new calls, routine issues drop a tier and eventually resolve. Safety hazards are held until a person has looked at them.',
    visual: <DecayDemo />,
    facts: Object.values(TIERS).map((t) => `${t.label} · ${t.name}`),
  },
];

function What() {
  return (
    <section id="what" aria-labelledby="what-h" className="border-t border-line">
      <div className="mx-auto max-w-[1240px] px-4 py-24 sm:px-6 lg:py-28">
        <h2 id="what-h" className="title max-w-[24ch] text-[34px] sm:text-[40px] lg:ml-[33%]">
          Everything a good dispatcher does, <span className="text-ink-3">out loud and on the map.</span>
        </h2>
      </div>
      {FEATURES.map((f, k) => (
        <article key={f.id} aria-labelledby={`f-${f.id}`} className="border-t border-line">
          <div className="mx-auto grid max-w-[1240px] items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_1.3fr_1fr] lg:gap-12 lg:py-20">
            <div className={k % 2 ? 'lg:col-start-3 lg:row-start-1' : ''}>
              <h3 id={`f-${f.id}`} className="title text-[26px]">{f.title}</h3>
              <p className="mt-3 max-w-[40ch] text-[16px] leading-relaxed text-ink-2">{f.body}</p>
            </div>
            <div className={`flex items-center justify-center rounded-[24px] bg-[radial-gradient(ellipse_at_center,#ffffff_0%,#f3f3f1_60%,#f8f8f7_100%)] px-4 py-10 ${k % 2 ? 'lg:col-start-2 lg:row-start-1' : ''}`}>
              {f.visual}
            </div>
            <ul className={`text-[15px] ${k % 2 ? 'lg:col-start-1 lg:row-start-1' : ''}`}>
              {f.facts.map((x) => (
                <li key={x} className="border-t border-line py-3 last:border-b">{x}</li>
              ))}
            </ul>
          </div>
        </article>
      ))}
    </section>
  );
}

function Honest() {
  const notes = [
    ['Demo data', `With no backend connected, the map runs on ${open.length} fictional San Diego issues (${totalCalls} calls) in your browser.`],
    ['Simulated dispatch', '“Approve for crew” moves an issue into a simulated crew queue. No real crew is sent.'],
    ['Modeled categories', 'Urgency tiers follow the categories San Diego’s Get It Done uses. There is no City partnership.'],
  ];
  return (
    <section id="honest" aria-labelledby="honest-h" className="border-t border-line">
      <div className="mx-auto max-w-[1240px] px-4 py-24 sm:px-6">
        <h2 id="honest-h" className="title max-w-[26ch] text-[34px] sm:text-[40px]">
          A prototype, labelled as one. <span className="text-ink-3">Built at a hackathon to show the loop end to end.</span>
        </h2>
        <ul className="mt-12 grid border-t border-line md:grid-cols-3">
          {notes.map(([t, d]) => (
            <li key={t} className="border-b border-line py-6 md:border-b-0 md:border-r md:px-6 md:first:pl-0 md:last:border-r-0">
              <h3 className="text-[17px]">{t}</h3>
              <p className="mt-2 max-w-[38ch] text-[15px] leading-relaxed text-ink-2">{d}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="relative overflow-hidden bg-night text-white">
      <div className="mx-auto grid max-w-[1240px] gap-12 px-4 pb-10 pt-20 sm:px-6 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <p className="title text-[34px]">Bring a problem. <span className="text-white/50">Watch it become a pin.</span></p>
          <a href="/map?call=1" className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-ctl)] bg-white px-4 text-[15px] font-[450] text-ink hover:bg-white/85">
            <Mic className="size-4" aria-hidden /> Play a sample call
          </a>
        </div>
        <nav aria-label="Product" className="text-[15px]">
          <p className="meta text-white/50">Product</p>
          <ul className="mt-4 space-y-2.5 text-white/80">
            <li><a className="hover:text-white" href="/map">Live map</a></li>
            <li><a className="hover:text-white" href="/map?layer=heat">Call heatmap</a></li>
            <li><a className="hover:text-white" href="#how">How it works</a></li>
          </ul>
        </nav>
        <div className="text-[15px]">
          <p className="meta text-white/50">Built with</p>
          <ul className="mt-4 space-y-2.5 text-white/80">
            <li>ElevenLabs voice agent</li>
            <li>React · Leaflet</li>
            <li className="flex items-center gap-1">Esri basemaps <ArrowUpRight className="size-3.5 text-white/50" aria-hidden /></li>
          </ul>
        </div>
        <div className="text-[15px]">
          <p className="meta text-white/50">Goals</p>
          <ul className="mt-4 space-y-2.5 text-white/80">
            <li>UN SDG 10 · Reduced inequalities</li>
            <li>UN SDG 11 · Sustainable cities</li>
            <li>UN SDG 16 · Strong institutions</li>
          </ul>
        </div>
      </div>
      <div className="mx-auto flex max-w-[1240px] flex-wrap justify-between gap-2 border-t border-white/10 px-4 py-6 text-[13px] text-white/50 sm:px-6">
        <span>SD Voice Town Hall · San Diego, CA</span>
        <span>Hackathon prototype · not affiliated with the City of San Diego</span>
      </div>
      <p aria-hidden className="display pointer-events-none -mb-[0.18em] select-none whitespace-nowrap text-center text-[18vw] leading-none text-white/[0.04]">
        town hall
      </p>
    </footer>
  );
}

export default function Landing() {
  return (
    <>
      <a href="#how" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-[2000] focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:text-ink">
        Skip to content
      </a>
      <Nav />
      <main>
        <Hero />
        <Problem />
        <How />
        <What />
        <Honest />
      </main>
      <Footer />
    </>
  );
}
