// End-of-encounter debrief backed by the free NVIDIA/OpenRouter grader.
//
// The browser posts the rubric, guideline slice and encounter log to
// `/agent/debrief`. The backend makes one structured call and returns the
// evaluation with server-computed domain scores. No Anthropic key, no
// Managed Agent session, no streaming.

import { useEffect, useState } from 'react';
import { caseEvaluationInput, type CaseEvaluationInput } from './customTools';
import type { DebriefRequest } from './debriefRequest';

export type DebriefStatus =
  | 'idle'
  | 'starting'
  | 'streaming'
  | 'got-evaluation'
  | 'error'
  | 'aborted';

export interface UseAttendingDebriefResult {
  status: DebriefStatus;
  evaluation: CaseEvaluationInput | null;
  error: string | null;
  partialNarration: string;
  reset: () => void;
}

interface Options {
  enabled?: boolean;
}

const DEBRIEF_URL = '/agent/debrief';

export function useAttendingDebrief(
  request: DebriefRequest | null,
  opts: Options = {},
): UseAttendingDebriefResult {
  const enabled = opts.enabled !== false;
  const [status, setStatus] = useState<DebriefStatus>('idle');
  const [evaluation, setEvaluation] = useState<CaseEvaluationInput | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !request) return;

    const ctrl = new AbortController();
    let cancelled = false;
    setStatus('starting');
    setError(null);
    setEvaluation(null);

    void (async () => {
      try {
        setStatus('streaming');
        const res = await fetch(DEBRIEF_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
          signal: ctrl.signal,
        });
        if (!res.ok) {
          const detail = await res.text().catch(() => '');
          throw new Error(
            detail
              ? `Değerlendirme başarısız (${res.status}): ${detail.slice(0, 300)}`
              : `Değerlendirme başarısız (${res.status}).`,
          );
        }
        const body = (await res.json()) as { evaluation?: unknown };
        const parsed = caseEvaluationInput.safeParse(body.evaluation);
        if (!parsed.success) {
          throw new Error('Değerlendirme yanıtı beklenen biçimde değil.');
        }
        if (cancelled) return;
        setEvaluation(parsed.data);
        setStatus('got-evaluation');
      } catch (e) {
        if (cancelled || ctrl.signal.aborted) return;
        setStatus('error');
        setError(e instanceof Error ? e.message : String(e));
      }
    })();

    return () => {
      cancelled = true;
      ctrl.abort();
    };
  }, [enabled, request]);

  return {
    status,
    evaluation,
    error,
    partialNarration: '',
    reset: () => {
      setStatus('idle');
      setEvaluation(null);
      setError(null);
    },
  };
}
