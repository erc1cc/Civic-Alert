export default function Header({ summary, live }) {
  const s = summary?.stats;
  const stat = (label, value, cls = 'text-gray-100') => (
    <div className="flex flex-col items-end leading-tight">
      <span className={`text-lg font-bold tabular-nums ${cls}`}>{value ?? '–'}</span>
      <span className="text-[10px] uppercase tracking-wider text-gray-500">{label}</span>
    </div>
  );
  return (
    <header className="flex items-center justify-between gap-4 px-4 py-2.5 border-b border-gray-800 bg-[#0b0f17]">
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-9 w-9 shrink-0 rounded-xl bg-gradient-to-br from-orange-500 to-red-800 grid place-items-center text-lg">🎙️</div>
        <div className="min-w-0">
          <h1 className="font-extrabold tracking-tight text-white truncate">SD Voice Town Hall</h1>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className={`h-2 w-2 rounded-full ${live ? 'bg-emerald-400 live-dot' : 'bg-gray-500'}`} />
            San Diego · {live ? 'Live' : 'Reconnecting…'}
            <span className="hidden md:inline text-gray-600">· Sensorless civic reporting · SDG 10 · 11 · 16</span>
          </div>
        </div>
      </div>
      <div className="hidden sm:flex items-center gap-6">
        {stat('Open issues', s?.open)}
        {stat('Tier 1', s?.tier1, 'text-red-400')}
        {stat('Awaiting review', s?.awaiting_review, 'text-orange-400')}
        {stat('Calls this week', s?.calls_this_week)}
      </div>
    </header>
  );
}
