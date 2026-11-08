const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

export function timeAgo(iso, now = Date.now()) {
  const diff = (new Date(iso).getTime() - now) / 1000;
  const abs = Math.abs(diff);
  if (abs < 60) return 'just now';
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
  return rtf.format(Math.round(diff / 86400), 'day');
}

export function radiusLabel(m) {
  if (m <= 60) return 'Pinpointed';
  if (m <= 400) return 'Neighborhood';
  return 'Approximate';
}

/** "±40 m" with a no-break space so the unit never wraps onto its own line. */
export function fmtRadius(m) {
  return `±${Math.round(m)} m`;
}

export function plural(n, one, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}
