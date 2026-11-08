import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Mic, AudioLines, CheckCircle2, X } from 'lucide-react';
import { SAMPLE_CALLS, nextSampleIndex } from '../lib/api';
import { fmtRadius } from '../lib/time';

const LINE_MS = 1100;
const CARD_LINGER_MS = 9000;
const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function outcomeText(r) {
  if (r.kind === 'merged') return <>Added to “{r.title}”. Location narrowed from {fmtRadius(r.before)} to {fmtRadius(r.after)}.</>;
  if (r.kind === 'promoted') return <>Second caller confirmed “{r.title}”. Draft became an active issue, {fmtRadius(r.before)} → {fmtRadius(r.after)}.</>;
  return <>New preliminary draft: “{r.title}” ({fmtRadius(r.after)}). Caller can confirm with PIN {r.pin}.</>;
}

function Lines({ call, count, dark }) {
  return (
    <ol aria-live="polite" aria-label="Call transcript" className="space-y-2.5 text-[15px] leading-snug">
      {call.lines.slice(0, count).map(([who, text], k) => (
        <li key={k} className="transcript-line flex gap-3">
          <span className={`meta w-12 shrink-0 pt-0.5 ${dark ? 'text-white/50' : 'text-ink-2'}`}>{who === 'caller' ? 'Caller' : 'Agent'}</span>
          <span lang={call.language} className={who === 'caller' ? (dark ? 'text-white' : 'text-ink') : (dark ? 'text-white/65' : 'text-ink-2')}>{text}</span>
        </li>
      ))}
    </ol>
  );
}

/**
 * Plays a scripted call transcript line by line, then files it into the demo store.
 * Stands in for the live ElevenLabs call so the call → pin step is visible without an agent id.
 * On wide screens the transcript floats over the map edge as a call card; on phones it sits inline.
 */
export default function SampleCall({ onStart, onFiled }) {
  const [index, setIndex] = useState(() => nextSampleIndex());
  const [shown, setShown] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [result, setResult] = useState(null);
  const [cardOpen, setCardOpen] = useState(false);
  const [slot, setSlot] = useState(null);
  const timer = useRef(null);
  const linger = useRef(null);

  useEffect(() => {
    setSlot(document.getElementById('call-card-slot'));
    return () => { clearInterval(timer.current); clearTimeout(linger.current); };
  }, []);

  const call = index != null ? SAMPLE_CALLS[index] : null;
  const total = SAMPLE_CALLS.length;
  const played = index == null ? total : index;
  const transcript = playing || result ? SAMPLE_CALLS[playing ? index : played - 1] : null;
  const count = playing ? shown : transcript?.lines.length ?? 0;

  async function finish() {
    clearInterval(timer.current);
    setPlaying(false);
    const r = await onFiled();
    setResult(r ?? null);
    setIndex(nextSampleIndex());
    clearTimeout(linger.current);
    linger.current = setTimeout(() => setCardOpen(false), CARD_LINGER_MS);
  }

  function play() {
    if (!call || playing) return;
    clearTimeout(linger.current);
    setResult(null);
    setPlaying(true);
    setCardOpen(true);
    onStart?.(index);
    if (reduceMotion()) {
      setShown(call.lines.length);
      finish();
      return;
    }
    let n = 1;
    setShown(1);
    timer.current = setInterval(() => {
      n += 1;
      setShown(n);
      if (n >= call.lines.length) {
        clearInterval(timer.current);
        timer.current = setTimeout(finish, 700);
      }
    }, LINE_MS);
  }

  // /map?call=1 (the landing page's "Play a sample call") starts the first call once the map has settled.
  const playRef = useRef(play);
  playRef.current = play;
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('call') !== '1' || index !== 0) return;
    params.delete('call');
    const qs = params.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`);
    const t = setTimeout(() => playRef.current(), 1400);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const label = transcript
    ? `${playing ? 'Live' : 'Filed'} · ${transcript.language === 'es' ? 'Español' : 'English'}`
    : '';

  const floating = slot && cardOpen && transcript && createPortal(
    <section aria-label="Sample call" className="rise pointer-events-auto rounded-[var(--radius-card)] border border-white/10 bg-[#16191e]/90 p-4 text-white shadow-[0_16px_40px_rgb(0_0_0/0.35)] backdrop-blur-md">
      <div className="flex items-center gap-2">
        {playing ? <AudioLines className="size-4 animate-pulse text-white/70" aria-hidden /> : <CheckCircle2 className="size-4 text-[#8fd3a8]" aria-hidden />}
        <p className="meta text-white/55">{label}</p>
        <button
          type="button"
          onClick={() => setCardOpen(false)}
          aria-label="Hide call card"
          className="-my-2 -mr-2 ml-auto grid size-9 cursor-pointer place-items-center rounded-[var(--radius-ctl)] text-white/60 hover:bg-white/10 hover:text-white"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
      <div className="mt-3"><Lines call={transcript} count={count} dark /></div>
      {result && (
        <p className="mt-3 border-t border-white/10 pt-3 text-[14px] leading-snug text-white/85">{outcomeText(result)}</p>
      )}
    </section>,
    slot,
  );

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={play}
        disabled={!call || playing}
        className="group w-full cursor-pointer rounded-[var(--radius-card)] bg-ink px-4 py-3.5 text-left text-white transition-colors hover:bg-ink/88 disabled:cursor-default disabled:bg-wash disabled:text-ink-2"
      >
        <span className={`meta block ${call && !playing ? 'text-white/55' : ''}`}>
          {call ? `Sample call · ${call.language === 'es' ? 'ES' : 'EN'} · ${played + 1} of ${total}` : `${total} of ${total} played`}
        </span>
        <span className="mt-1.5 flex items-center gap-2.5 text-[17px] tracking-[-0.01em]">
          {playing ? <AudioLines className="size-4 animate-pulse" aria-hidden /> : <Mic className="size-4" aria-hidden />}
          {playing ? 'Call in progress…' : !call ? 'All sample calls played' : played === 0 ? 'Play a sample call' : 'Play the next sample call'}
        </span>
      </button>

      {transcript && (
        <div className="rounded-[var(--radius-card)] border border-line bg-card p-4 lg:hidden">
          <p className="meta mb-3 text-ink-2">{label}</p>
          <Lines call={transcript} count={count} />
        </div>
      )}

      {result && (
        <p role="status" className="flex gap-2 text-[14px] leading-snug text-ink">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
          <span>{outcomeText(result)}</span>
        </p>
      )}

      <p className="text-[13px] text-ink-2" title="Set VITE_ELEVENLABS_AGENT_ID in frontend/.env to take real calls">
        {call
          ? 'Scripted calls from the demo data. Real callers talk to the ElevenLabs voice agent.'
          : 'Reset the demo under Presenter controls to replay the calls.'}
      </p>
      {floating}
    </div>
  );
}
