// Session-level bookkeeping for the polyclinic.
//
// A "session" is the run of patients the trainee sees between entering the
// clinic and pressing "Görüşmeyi bitir". Each discharged patient is appended
// to `GameState.sessionEncounters`; the debrief screen grades the whole list
// instead of silently grading only the most recent snapshot.

import type {
  CaseEvaluationInput,
  DomainScore,
  VerdictBand,
} from '../agents/customTools.ts';
import type { ActivePatient, GameState } from './types.ts';
import { treatmentById } from '../data/treatments.ts';

/** A patient counts as engaged once the trainee asks a history question,
 *  orders a test, gives a treatment, writes a prescription or submits a
 *  diagnosis. A freshly auto-loaded patient has none of these. */
export function hasEncounterActivity(p: ActivePatient): boolean {
  return (
    p.askedQuestionIds.length > 0 ||
    p.orderedTestIds.length > 0 ||
    p.givenTreatmentIds.length > 0 ||
    (p.prescriptions?.length ?? 0) > 0 ||
    p.submittedDiagnosisId !== null ||
    (p.transcript ?? []).some((turn) => turn.role === 'trainee')
  );
}

export function setDisposition(p: ActivePatient, id: string): ActivePatient {
  if (treatmentById(id)?.category !== 'disposition') return p;
  const withoutDisposition = p.givenTreatmentIds.filter(
    (tid) => treatmentById(tid)?.category !== 'disposition',
  );
  return {
    ...p,
    status: id === 'discharge' ? 'discharged' : 'treating',
    givenTreatmentIds: [...withoutDisposition, id],
  };
}

export function toggleTreatment(p: ActivePatient, id: string): ActivePatient {
  const treatment = treatmentById(id);
  if (!treatment) return p;
  if (treatment.category === 'disposition') return setDisposition(p, id);
  const has = p.givenTreatmentIds.includes(id);
  return {
    ...p,
    givenTreatmentIds: has
      ? p.givenTreatmentIds.filter((tid) => tid !== id)
      : [...p.givenTreatmentIds, id],
  };
}

export function withDischargeDecision(p: ActivePatient): ActivePatient {
  if (p.givenTreatmentIds.includes('discharge')) return p;
  return setDisposition(p, 'discharge');
}

function isSameEncounter(a: ActivePatient, b: ActivePatient): boolean {
  return a.case.id === b.case.id && a.arrivedAt === b.arrivedAt;
}

/** Append a finished encounter to the session list. Empty auto-loaded
 *  patients are ignored, and the same encounter is never appended twice. */
export function addCompletedEncounter(
  list: ActivePatient[],
  snapshot: ActivePatient,
): ActivePatient[] {
  if (!hasEncounterActivity(snapshot)) return list;
  if (list.some((p) => isSameEncounter(p, snapshot))) return list;
  return [...list, snapshot];
}

/** The encounters that belong in the end-of-session debrief.
 *
 *  Polyclinic sessions use the completed queue. A still-active, engaged
 *  patient is included as a fallback for direct navigation to the debrief
 *  screen. ER sessions stay single-patient and are handled by lastEncounter. */
export function polyclinicSessionPatients(
  state: Pick<GameState, 'encounterMode' | 'sessionEncounters' | 'polyclinic'>,
): ActivePatient[] {
  if (state.encounterMode !== 'polyclinic') return [];
  const completed = state.sessionEncounters;
  const current = state.polyclinic.patient;
  if (!current || !hasEncounterActivity(current)) return completed;
  if (completed.some((p) => isSameEncounter(p, current))) return completed;
  return [...completed, current];
}

/** Percentage of weighted rubric points earned. */
export function evaluationPercent(evaluation: CaseEvaluationInput): number {
  const scores = Object.values(evaluation.domain_scores);
  const raw = scores.reduce((sum, s) => sum + s.raw, 0);
  const max = scores.reduce((sum, s) => sum + s.max, 0);
  return max > 0 ? raw / max : 0;
}

export function averagePercent(evaluations: CaseEvaluationInput[]): number {
  if (evaluations.length === 0) return 0;
  return (
    evaluations.reduce((sum, e) => sum + evaluationPercent(e), 0) /
    evaluations.length
  );
}

/** Same thresholds the backend uses in `_band()`. */
export function verdictFromPercent(pct: number): VerdictBand {
  if (pct >= 0.85) return 'excellent';
  if (pct >= 0.7) return 'good';
  if (pct >= 0.55) return 'satisfactory';
  if (pct >= 0.4) return 'borderline';
  return 'clear-fail';
}

export function aggregateDomainScore(
  evaluations: CaseEvaluationInput[],
  domain: keyof CaseEvaluationInput['domain_scores'],
): DomainScore {
  let raw = 0;
  let max = 0;
  for (const e of evaluations) {
    raw += e.domain_scores[domain].raw;
    max += e.domain_scores[domain].max;
  }
  const pct = max > 0 ? raw / max : 0;
  return { raw, max, verdict: verdictFromPercent(pct) };
}
