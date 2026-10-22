/**
 * Tests for polyclinic session bookkeeping: completed encounters must
 * accumulate across auto-loaded patients, empty snapshots must be ignored,
 * and the debrief must not fall back to a stale patient from an older
 * session.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import type { CaseEvaluationInput } from '../../src/agents/customTools.ts';
import type { ActivePatient, GameState, PatientCase } from '../../src/game/types.ts';
import {
  addCompletedEncounter,
  aggregateDomainScore,
  averagePercent,
  evaluationPercent,
  hasEncounterActivity,
  polyclinicSessionPatients,
  setDisposition,
  toggleTreatment,
  verdictFromPercent,
  withDischargeDecision,
} from '../../src/game/session.ts';

function active(
  caseId = 'case-1',
  arrivedAt = 1000,
  patch: Partial<ActivePatient> = {},
): ActivePatient {
  return {
    case: { id: caseId } as PatientCase,
    bedIndex: -10,
    status: 'discharged',
    askedQuestionIds: [],
    orderedTestIds: [],
    testOrderedAt: {},
    completedTestIds: [],
    givenTreatmentIds: [],
    submittedDiagnosisId: null,
    arrivedAt,
    deadlineMs: arrivedAt + 1000,
    ...patch,
  };
}

test('hasEncounterActivity ignores a fresh auto-loaded patient', () => {
  assert.equal(hasEncounterActivity(active()), false);
});

test('hasEncounterActivity recognises every kind of engagement', () => {
  assert.equal(hasEncounterActivity(active('a', 1, { askedQuestionIds: ['q1'] })), true);
  assert.equal(hasEncounterActivity(active('b', 1, { orderedTestIds: ['t1'] })), true);
  assert.equal(hasEncounterActivity(active('c', 1, { givenTreatmentIds: ['x1'] })), true);
  assert.equal(hasEncounterActivity(active('d', 1, { submittedDiagnosisId: 'dx' })), true);
  assert.equal(
    hasEncounterActivity(active('e', 1, { prescriptions: [{ medicationId: 'm', dose: '1', duration: '1g', prescribedAt: 1 }] })),
    true,
  );
  assert.equal(
    hasEncounterActivity(active('f', 1, { transcript: [{ role: 'trainee', content: 'Merhaba.' }] })),
    true,
  );
});

test('withDischargeDecision records discharge exactly once', () => {
  const first = withDischargeDecision(active('a', 1, { askedQuestionIds: ['q1'] }));
  assert.equal(first.status, 'discharged');
  assert.deepEqual(first.givenTreatmentIds, ['discharge']);

  const second = withDischargeDecision(first);
  assert.equal(second, first);
  assert.deepEqual(second.givenTreatmentIds, ['discharge']);
});

test('setDisposition replaces the previous disposition', () => {
  const admitted = setDisposition(active('a', 1), 'admit-icu');
  assert.equal(admitted.status, 'treating');
  assert.deepEqual(admitted.givenTreatmentIds, ['admit-icu']);

  const discharged = setDisposition(admitted, 'discharge');
  assert.equal(discharged.status, 'discharged');
  assert.deepEqual(discharged.givenTreatmentIds, ['discharge']);
});

test('toggleTreatment keeps treatments and does not duplicate them', () => {
  const withAspirin = toggleTreatment(active('a', 1), 'aspirin');
  assert.deepEqual(withAspirin.givenTreatmentIds, ['aspirin']);

  const withCath = toggleTreatment(withAspirin, 'cath-lab');
  assert.deepEqual(withCath.givenTreatmentIds, ['aspirin', 'cath-lab']);

  const withoutAspirin = toggleTreatment(withCath, 'aspirin');
  assert.deepEqual(withoutAspirin.givenTreatmentIds, ['cath-lab']);
});

test('toggleTreatment routes disposition ids through setDisposition', () => {
  const p = toggleTreatment(active('a', 1, { givenTreatmentIds: ['aspirin'] }), 'admit-icu');
  assert.deepEqual(p.givenTreatmentIds, ['aspirin', 'admit-icu']);
});

test('addCompletedEncounter appends real encounters and ignores empty ones', () => {
  const first = active('a', 1, { askedQuestionIds: ['q1'] });
  const empty = active('b', 2);
  const second = active('c', 3, { orderedTestIds: ['t1'] });

  let list = addCompletedEncounter([], empty);
  assert.deepEqual(list, []);

  list = addCompletedEncounter(list, first);
  list = addCompletedEncounter(list, second);
  assert.deepEqual(list.map((p) => p.case.id), ['a', 'c']);
});

test('addCompletedEncounter never duplicates the same snapshot', () => {
  const first = active('a', 1, { askedQuestionIds: ['q1'] });
  const once = addCompletedEncounter([], first);
  const twice = addCompletedEncounter(once, first);
  assert.equal(twice.length, 1);
});

test('polyclinicSessionPatients returns the whole completed queue', () => {
  const first = active('a', 1, { askedQuestionIds: ['q1'] });
  const second = active('b', 2, { askedQuestionIds: ['q2'] });
  const state = {
    encounterMode: 'polyclinic',
    sessionEncounters: [first, second],
    polyclinic: { clinic: 'all-specialties', patient: null },
  } as Pick<GameState, 'encounterMode' | 'sessionEncounters' | 'polyclinic'>;

  assert.deepEqual(
    polyclinicSessionPatients(state).map((p) => p.case.id),
    ['a', 'b'],
  );
});

test('polyclinicSessionPatients does not grade an empty auto-loaded patient', () => {
  const state = {
    encounterMode: 'polyclinic',
    sessionEncounters: [active('a', 1, { askedQuestionIds: ['q1'] })],
    polyclinic: { clinic: 'all-specialties', patient: active('fresh', 2) },
  } as Pick<GameState, 'encounterMode' | 'sessionEncounters' | 'polyclinic'>;

  assert.deepEqual(
    polyclinicSessionPatients(state).map((p) => p.case.id),
    ['a'],
  );
});

test('polyclinicSessionPatients ignores stale lastEncounter in a new session', () => {
  const state = {
    encounterMode: 'polyclinic',
    sessionEncounters: [],
    polyclinic: { clinic: 'all-specialties', patient: null },
  } as Pick<GameState, 'encounterMode' | 'sessionEncounters' | 'polyclinic'>;

  assert.deepEqual(polyclinicSessionPatients(state), []);
});

const EVAL = {
  case_id: 'a',
  global_rating: 'good',
  domain_scores: {
    data_gathering: { raw: 2, max: 4, verdict: 'satisfactory' },
    clinical_management: { raw: 3, max: 4, verdict: 'good' },
    interpersonal: { raw: 1, max: 2, verdict: 'satisfactory' },
  },
  criteria: [],
  safety_breach: null,
  highlights: [],
  improvements: [],
  narrative: 'Test.',
} as CaseEvaluationInput;

test('evaluationPercent and averagePercent use weighted domain scores', () => {
  assert.equal(evaluationPercent(EVAL), 0.6);
  assert.equal(averagePercent([EVAL, EVAL]), 0.6);
  assert.equal(averagePercent([]), 0);
});

test('verdictFromPercent matches the backend thresholds', () => {
  assert.equal(verdictFromPercent(0.85), 'excellent');
  assert.equal(verdictFromPercent(0.7), 'good');
  assert.equal(verdictFromPercent(0.55), 'satisfactory');
  assert.equal(verdictFromPercent(0.4), 'borderline');
  assert.equal(verdictFromPercent(0.39), 'clear-fail');
});

test('aggregateDomainScore sums raw and max across patients', () => {
  const agg = aggregateDomainScore([EVAL, EVAL], 'clinical_management');
  assert.deepEqual(agg, { raw: 6, max: 8, verdict: 'good' });
});
