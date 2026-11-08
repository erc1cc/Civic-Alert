import { useRef, useState } from 'react';
import { useConversation } from '@elevenlabs/react';
import { api, AGENT_ID } from '../api.js';

export default function CallWidget({ toast }) {
  const [lines, setLines] = useState([]);
  const submitted = useRef(false);
  const userText = useRef([]);
  const convoId = useRef(null);

  const convo = useConversation({
    clientTools: {
      // The agent calls this once it has a problem + location. Its return string is spoken to the caller.
      submit_report: async (params) => {
        submitted.current = true;
        try {
          const r = await api.submit({ ...params, conversation_id: convoId.current || undefined, transcript: userText.current.join(' ') });
          return r.message;
        } catch {
          return 'Sorry, the city system is unreachable right now. Please try again in a few minutes.';
        }
      },
    },
    onConnect: (p) => {
      submitted.current = false;
      userText.current = [];
      setLines([]);
      try { convoId.current = p?.conversationId || convo.getId(); } catch { convoId.current = null; }
    },
    onMessage: (m) => {
      const role = m.role || m.source;
      if (role === 'user') userText.current.push(m.message);
      setLines((l) => [...l.slice(-5), { role, text: m.message }]);
    },
    onDisconnect: () => {
      // Case 2: caller hung up before the agent filed the report — salvage what we heard.
      const transcript = userText.current.join(' ').trim();
      if (!submitted.current && transcript.length > 8) {
        api.submit({ transcript, ended_early: true, conversation_id: convoId.current || undefined })
          .then((r) => r.action === 'rejected' && toast('Call ended early — not enough detail to file a report', 'rejected'))
          .catch(() => {});
      }
    },
    onError: (e) => toast(`Voice error: ${e?.message || e}`, 'error'),
  });

  const status = convo.status;
  const connected = status === 'connected';
  const connecting = status === 'connecting';

  const start = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      toast('Microphone permission is needed to call', 'error');
      return;
    }
    try {
      convo.startSession({ agentId: AGENT_ID, connectionType: 'webrtc' });
    } catch (e) {
      toast(`Could not start call: ${e?.message || e}`, 'error');
    }
  };

  if (!connected && !connecting) {
    return (
      <div>
        <button
          onClick={start}
          disabled={!AGENT_ID}
          title={AGENT_ID ? '' : 'Set VITE_ELEVENLABS_AGENT_ID — or use "Simulate a call" below'}
          className="group w-full rounded-2xl bg-gradient-to-r from-orange-600 to-red-700 px-4 py-3.5 text-left font-bold text-white shadow-lg shadow-red-950/50 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <div className="text-base">🎙️ Call San Diego Voice Town Hall</div>
          <div className="text-xs font-medium text-orange-100/90">English / Español · no GPS needed: just describe where you are</div>
        </button>
        {!AGENT_ID && <p className="mt-1.5 text-[11px] text-gray-500">No agent configured (VITE_ELEVENLABS_AGENT_ID). Use the call simulator below.</p>}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-red-800/60 bg-red-950/30 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <span className={`h-2.5 w-2.5 rounded-full ${connected ? 'bg-red-500 live-dot' : 'bg-gray-400'}`} />
          {connecting ? 'Connecting…' : convo.isSpeaking ? 'Agent speaking…' : 'Listening…'}
        </div>
        <button onClick={() => convo.endSession()} className="rounded-lg bg-gray-800 px-3 py-1 text-xs font-semibold text-white hover:bg-gray-700">End call</button>
      </div>
      <div className="mt-2 max-h-36 space-y-1 overflow-y-auto scroll-thin text-xs">
        {lines.length === 0 && <div className="text-gray-500">Say what's wrong and where, e.g. “there's a pothole by Petco Park”.</div>}
        {lines.map((l, k) => (
          <div key={k} className={l.role === 'user' ? 'text-gray-100' : 'text-orange-200/90'}>
            <b className="mr-1 text-[10px] uppercase tracking-wider text-gray-500">{l.role === 'user' ? 'You' : 'Agent'}</b>{l.text}
          </div>
        ))}
      </div>
    </div>
  );
}
