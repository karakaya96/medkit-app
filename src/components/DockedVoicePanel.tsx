import { useEffect, useRef, useState } from 'react';
import { getExistingConversation } from '../voice/conversationStore';
import type { ConversationStatus, SubtitleEvent } from '../voice/conversation';

/** Compact, fixed-position voice transcript card. Used while the Examine
 *  overlay is open so the doctor can still hear/read what the patient is
 *  saying without the in-scene speech bubble bleeding through the modal.
 *
 *  This does NOT own the conversation — it subscribes to whatever the
 *  encounter screen has already booted via FloatingVoicePanel /
 *  conversationStore. When the dock unmounts, the voice keeps running. */

interface Props {
  patientName: string;
  patientLabel: string; // e.g. "34F"
  /** Conversation cache key: -10 for polyclinic, 0–3 for ER beds. */
  bedIndex: number;
}

export function DockedVoicePanel({ patientName, patientLabel, bedIndex }: Props) {
  const [status, setStatus] = useState<ConversationStatus>('uninitialized');
  const [subtitle, setSubtitle] = useState<SubtitleEvent>({ who: 'patient', text: '…' });

  // Hook into the live conversation. We resync on mount AND poll for the
  // first 2s in case the conversation hasn't been created yet (e.g. the
  // doctor opened Examine before voice connected).
  useEffect(() => {
    let disposed = false;
    let stopMessages: (() => void) | null = null;

    setStatus('uninitialized');
    setSubtitle({ who: 'patient', text: '…' });

    const tryAttach = () => {
      if (disposed || stopMessages) return;
      const conv = getExistingConversation(bedIndex);
      if (!conv) return;
      // Pull current state and subscribe to future updates. The in-scene
      // panel owns the conversation; this dock is a read-only second view.
      setStatus(conv.getStatus());
      const msgs = conv.getMessages();
      const last = [...msgs].reverse().find((m) => m.role === 'assistant' || m.role === 'user');
      if (last) {
        setSubtitle({ who: last.role === 'user' ? 'you' : 'patient', text: last.content });
      }
      stopMessages = conv.subscribeMessages((all) => {
        const lastMsg = [...all].reverse().find((m) => m.role === 'assistant' || m.role === 'user');
        if (lastMsg) {
          setSubtitle({ who: lastMsg.role === 'user' ? 'you' : 'patient', text: lastMsg.content });
        }
      });
    };
    tryAttach();

    // Voice connection can take longer than the first render (especially
    // while Whisper warms up). Poll until the conversation exists, then
    // keep polling status because Conversation has no status subscriber.
    const tick = window.setInterval(() => {
      if (disposed) return;
      const conv = getExistingConversation(bedIndex);
      if (!conv) return;
      setStatus(conv.getStatus());
      tryAttach();
    }, 250);

    return () => {
      disposed = true;
      window.clearInterval(tick);
      stopMessages?.();
    };
  }, [bedIndex]);

  const firstName = patientName.split(' ')[0];
  const statusLabel =
    status === 'listening' ? 'DİNLİYOR…' :
    status === 'thinking' ? 'DÜŞÜNÜYOR…' :
    status === 'speaking' ? `${firstName.toUpperCase()} KONUŞUYOR` :
    status === 'loading' ? 'BAĞLANIYOR…' :
    status === 'ready' ? 'CANLI' :
    'ÇEVRİMDIŞI';

  const live = status === 'listening' || status === 'speaking' || status === 'thinking' || status === 'ready';
  const statusColor =
    status === 'speaking' ? 'var(--peach-deep)' :
    status === 'listening' ? 'var(--mint-deep)' :
    status === 'thinking' ? 'var(--butter-deep)' :
    live ? 'var(--mint-deep)' : 'var(--ink-soft)';

  const showSubtitle = !!subtitle.text && subtitle.text !== '…';
  const speakerLabel = subtitle.who === 'you' ? 'Sen' : firstName;

  // Auto-scroll to bottom when subtitle changes.
  const scrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [subtitle.text]);

  return (
    <div
      style={{
        position: 'fixed',
        top: 18,
        right: 18,
        zIndex: 60,
        width: 260,
        background: 'white',
        border: '3px solid var(--line)',
        borderRadius: 'var(--r-md)',
        boxShadow: '0 6px 0 var(--line), 0 14px 28px rgba(43,30,22,0.18)',
        padding: '12px 14px',
        fontFamily: 'Nunito, system-ui, sans-serif',
        color: 'var(--ink)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          marginBottom: 8,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 900 }}>
          {patientName}
          <span style={{ fontSize: 10, color: 'var(--ink-soft)', marginLeft: 6, fontWeight: 700 }}>
            {patientLabel}
          </span>
        </div>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            fontSize: 9,
            letterSpacing: '0.12em',
            color: statusColor,
            textTransform: 'uppercase',
            fontWeight: 900,
            whiteSpace: 'nowrap',
            padding: '3px 7px',
            borderRadius: 'var(--r-pill)',
            background: 'var(--cream)',
            border: '2px solid var(--line)',
          }}
        >
          <span
            className={live ? 'breathe' : undefined}
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: statusColor,
              display: 'inline-block',
            }}
          />
          {statusLabel}
        </div>
      </div>

      <div
        ref={scrollRef}
        style={{
          fontStyle: showSubtitle ? 'italic' : 'normal',
          fontSize: 12,
          lineHeight: 1.4,
          color: showSubtitle ? 'var(--ink)' : 'var(--ink-soft)',
          fontWeight: 600,
          maxHeight: 110,
          overflowY: 'auto',
          background: 'var(--cream-2)',
          border: '2px solid var(--line)',
          borderRadius: 10,
          padding: '8px 10px',
        }}
      >
        {showSubtitle ? (
          <>
            <div
              style={{
                fontSize: 9,
                fontWeight: 800,
                color: 'var(--ink-2)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                marginBottom: 2,
                fontStyle: 'normal',
              }}
            >
              {speakerLabel}
            </div>
            "{subtitle.text}"
          </>
        ) : (
          'Ses canlı · sadece konuş'
        )}
      </div>
    </div>
  );
}
