import { useRef, useState } from 'react';
import { ConversationProvider, useConversation } from '@elevenlabs/react';
import { Mic, PhoneOff, Loader2, AudioLines, Phone } from 'lucide-react';
import SampleCall from './SampleCall';
import { submitReport } from '../lib/api';

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
  // Per-call state lives in refs so the SDK's callbacks always see the current call.
  const submitted = useRef(false);
  const userText = useRef([]);
  const agentText = useRef([]);
  const convoId = useRef(null);

  const conv = useConversation({
    clientTools: {
      // The agent calls this once it has a problem + a location clue. Its return string is spoken to the caller.
      submit_report: async (params) => {
        submitted.current = true;
        try {
          const r = await submitReport({
            ...params,
            conversation_id: convoId.current || undefined,
            transcript: userText.current.join(' '),
          });
          return r.message;
        } catch {
          return 'Sorry, the city system is unreachable right now. Please try again in a few minutes.';
        }
      },
    },
    onConnect: (p) => {
      submitted.current = false;
      userText.current = [];
      agentText.current = [];
      try { convoId.current = p?.conversationId || conv.getId(); } catch { convoId.current = null; }
    },
    onMessage: (m) => {
      if ((m.role || m.source) === 'user') userText.current.push(m.message);
      else if (m.message) agentText.current.push(m.message);
    },
    onDisconnect: () => {
      // Caller hung up before the agent filed it: send what we heard; the backend files it with a wide radius
      // if it can find a problem type and a location, using the agent's read-backs as backup context.
      const transcript = userText.current.join(' ').trim();
      if (!submitted.current && transcript.length > 8) {
        submitReport({
          transcript,
          ended_early: true,
          conversation_id: convoId.current || undefined,
          agent_context: agentText.current.slice(-4).join(' '),
        })
          .then((r) => { if (r.action === 'rejected') onError?.('Call ended before the report was filed, and the problem or location was unclear.'); })
          .catch(() => {});
      }
      onCallEnded?.();
    },
    onError: (msg) => onError?.(typeof msg === 'string' ? msg : 'Voice call failed'),
    onUnhandledClientToolCall: (call) => {
      const name = call?.tool_name || call?.toolName || call?.name || 'unknown';
      onError?.(`The agent called a tool named "${name}", but this page handles "submit_report". Rename the tool in ElevenLabs.`);
    },
  });
  const connected = conv.status === 'connected';
  const connecting = starting || conv.status === 'connecting';

  async function toggle() {
    if (connected) return conv.endSession();
    setStarting(true);
    try {
      // Ask for the mic, then release it so the SDK gets a clean stream.
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      s.getTracks().forEach((t) => t.stop());
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
            {connected ? (conv.isSpeaking ? 'Agent is speaking' : 'Listening. Describe the issue and a landmark.') : 'No GPS needed. Just describe where you are.'}
          </span>
        </span>
        {connected && <AudioLines className={`ml-auto size-5 ${conv.isSpeaking ? 'animate-pulse' : ''}`} aria-hidden />}
      </button>
    </div>
  );
}
