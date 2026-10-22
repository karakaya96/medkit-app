/**
 * Tests for the debrief evaluation schema and the legacy custom-tool
 * registry kept for the renderer.
 *
 * Runs under Node 22+'s built-in test runner with native TypeScript
 * support — zero extra deps. Invoke via `npm test` (or directly with
 * `node --test scripts/test/custom-tools.test.ts`).
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CUSTOM_TOOL_NAMES,
  caseEvaluationInput,
  CUSTOM_TOOL_PERMISSIONS,
  customToolSchemas,
  flagCriticalFindingInput,
  getToolPermission,
  parseCustomToolUse,
  type CustomToolName,
} from '../../src/agents/customTools.ts';

test('every custom tool has a permission entry', () => {
  for (const name of CUSTOM_TOOL_NAMES) {
    const perm = CUSTOM_TOOL_PERMISSIONS[name];
    assert.ok(
      perm === 'auto' || perm === 'confirm',
      `missing or invalid permission for ${name}: ${perm}`,
    );
  }
});

test('every custom tool has a schema', () => {
  for (const name of CUSTOM_TOOL_NAMES) {
    assert.ok(
      customToolSchemas[name as CustomToolName],
      `missing Zod schema for ${name}`,
    );
  }
});

test('render_* tools are auto-allowed', () => {
  for (const name of CUSTOM_TOOL_NAMES) {
    if (name.startsWith('render_')) {
      assert.equal(
        getToolPermission(name),
        'auto',
        `${name} should be auto-allowed`,
      );
    }
  }
});

test('flag_critical_finding requires confirmation', () => {
  assert.equal(getToolPermission('flag_critical_finding'), 'confirm');
});

test('flag_critical_finding input schema accepts a well-formed call', () => {
  const result = flagCriticalFindingInput.safeParse({
    patient_id: 'poly-003',
    severity: 'critical',
    reason: 'systolic BP 70, altered mental status',
  });
  assert.ok(result.success, 'well-formed input should parse');
});

test('flag_critical_finding rejects unknown severity', () => {
  const result = flagCriticalFindingInput.safeParse({
    patient_id: 'poly-003',
    severity: 'maybe-bad',
    reason: 'unclear',
  });
  assert.ok(!result.success);
});

test('flag_critical_finding rejects empty reason', () => {
  const result = flagCriticalFindingInput.safeParse({
    patient_id: 'poly-003',
    severity: 'urgent',
    reason: '',
  });
  assert.ok(!result.success);
});

test('parseCustomToolUse rejects unknown tool name', () => {
  const result = parseCustomToolUse('not_a_tool', {});
  assert.ok(!result.ok);
  if (!result.ok) assert.match(result.error, /unknown tool/);
});

test('parseCustomToolUse surfaces per-field errors', () => {
  const result = parseCustomToolUse('flag_critical_finding', {
    patient_id: '',
    severity: 'critical',
    reason: 'x',
  });
  assert.ok(!result.ok);
  if (!result.ok) assert.match(result.error, /patient_id/);
});

const VALID_EVALUATION = {
  case_id: 'er-01',
  global_rating: 'good',
  domain_scores: {
    data_gathering: { raw: 2, max: 3, verdict: 'good' },
    clinical_management: { raw: 1, max: 1, verdict: 'excellent' },
    interpersonal: { raw: 1, max: 2, verdict: 'borderline' },
  },
  criteria: [
    {
      criterion_id: 'dg-1',
      domain: 'data_gathering',
      verdict: 'met',
      evidence: 'Ağrının başlangıcını ve yayılımını sordu.',
      guideline_ref: null,
    },
  ],
  safety_breach: null,
  highlights: ['Sistematik öykü.'],
  improvements: ['EKG daha erken istenebilirdi.'],
  narrative: 'Genel olarak güvenli bir yaklaşım.',
};

test('caseEvaluationInput accepts a well-formed evaluation', () => {
  const result = caseEvaluationInput.safeParse(VALID_EVALUATION);
  assert.ok(result.success, 'well-formed evaluation should parse');
});

test('caseEvaluationInput rejects an unknown verdict band', () => {
  const result = caseEvaluationInput.safeParse({
    ...VALID_EVALUATION,
    global_rating: 'perfect',
  });
  assert.ok(!result.success);
});

test('caseEvaluationInput requires a narrative', () => {
  const result = caseEvaluationInput.safeParse({
    ...VALID_EVALUATION,
    narrative: '',
  });
  assert.ok(!result.success);
});
