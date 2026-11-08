const ICON = { created: '📍', merged: '🎯', preliminary: '📝', reopened: '🔓', resolved: '✅', approved: '🚧', decay: '⏱️', rejected: '⚠️', error: '⚠️', info: 'ℹ️' };

export default function Toasts({ toasts }) {
  return (
    <div className="pointer-events-none absolute right-3 top-3 z-[1000] flex w-80 max-w-[calc(100%-1.5rem)] flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} className="toast-in rounded-xl border border-gray-700 bg-gray-900/95 px-3 py-2.5 text-sm text-gray-100 shadow-xl backdrop-blur">
          <span className="mr-1.5">{ICON[t.kind] || 'ℹ️'}</span>{t.text}
        </div>
      ))}
    </div>
  );
}

export { ICON };
