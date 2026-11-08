import { useState } from 'react';
import { ConversationProvider, useConversation } from '@elevenlabs/react';
import { Mic, PhoneOff, Loader2, AudioLines, Phone } from 'lucide-react';
import SampleCall from './SampleCall';

const AGENT_ID = import.meta.env.VITE_ELEVENLABS_AGENT_ID;

export default function VoiceCall({ mode, onCallEnded, onError, onSampleStart, onSampleFiled }) {
  if (AGENT_ID) {
    return (
      <ConversationProvider agentId={AGENT_ID}>
        <LiveCall onCallEnded={onCallEnded} onError={onError} />
      </ConversationProvider>
    );
  }
  if (mode === 'demo') return <SampleCall onStart={onSampleStart} onFiled={onSampleFiled} />;
  if (mode === 'live') {
    return (
      <p className="flex gap-2 rounded-[var(--radius-card)] border border-line bg-card p-4 text-[14px] text-ink-2">
        <Phone className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>
          Calls reach this map through the ElevenLabs voice agent. To place one from this screen, set{' '}
          <code className="rounded-[3px] bg-wash px-1 font-mono text-[12px] text-ink">VITE_ELEVENLABS_AGENT_ID</code>.
        </span>
      </p>
    );
  }
  return <div className="h-[74px] animate-pulse rounded-[var(--radius-card)] bg-wash" aria-hidden />;
}

function LiveCall({ onCallEnded, onError }) {
  const [starting, setStarting] = useState(false);
  const conv = useConversation({
    onDisconnect: () => onCallEnded?.(),
    onError: (msg) => onError?.(typeof msg === 'string' ? msg : 'Voice call failed'),
  });
  const connected = conv.status === 'connected';
  const connecting = starting || conv.status === 'connecting';

  async function toggle() {
    if (connected) return conv.endSession();
    setStarting(true);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      conv.startSession();
    } catch {
      onError?.('Microphone access is needed to call the Voice Town Hall.');
    } finally {
      setStarting(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        disabled={connecting}
        aria-describedby="call-status"
        className={`flex min-h-[74px] w-full cursor-pointer items-center gap-3 rounded-[var(--radius-card)] px-4 text-left text-[17px] text-white transition-colors duration-150 disabled:cursor-wait ${
          connected ? 'bg-tier-1 hover:bg-tier-1/90' : 'bg-ink hover:bg-ink/88'
        }`}
      >
        {connecting ? (
          <Loader2 className="size-5 animate-spin" aria-hidden />
        ) : connected ? (
          <PhoneOff className="size-5" aria-hidden />
        ) : (
          <Mic className="size-5" aria-hidden />
        )}
        <span className="flex flex-col leading-tight">
          <span>{connected ? 'End call' : connecting ? 'Connecting…' : 'Call San Diego Voice Town Hall'}</span>
          <span id="call-status" role="status" className="text-[13px] text-white/70">
            {connected ? (conv.isSpeaking ? 'Agent is speaking' : 'Listening. Describe the issue and a landmark.') : 'English / Español · no GPS needed'}
          </span>
        </span>
        {connected && <AudioLines className={`ml-auto size-5 ${conv.isSpeaking ? 'animate-pulse' : ''}`} aria-hidden />}
      </button>
    </div>
  );
}
