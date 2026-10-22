/**
 * Every abnormal imaging result should resolve to a tagged reference image
 * for its diagnosis. Without a tag match `getImagingExamples` silently falls
 * back to a random image from the test's pool — which can show the wrong
 * pathology. This check keeps the tag pools honest.
 *
 * Run directly:
 *   node scripts/verify/imaging-coverage.ts
 */

import fs from 'node:fs';

const IMAGING_TESTS = [
  'cxr',
  'kub',
  'xr-extrem',
  'xr-spine',
  'xr-pelvis',
  'us-abdomen',
  'us-pelvis',
  'echo',
  'ct-head',
  'ct-chest',
  'ct-angio',
  'ct-abdomen',
  'ct-cspine',
  'mri-brain',
  'mri-cspine',
  'mri-lspine',
  'mri-abd',
  'ecg',
];

type Violation = { case: string; rule: string; detail: string };

function readPools(): Record<string, Set<string>> {
  const radSrc = fs.readFileSync('src/data/radiologyImages.ts', 'utf8');
  const abnBlock = radSrc.slice(radSrc.indexOf('ABNORMAL_BY_TEST'));
  const pools: Record<string, Set<string>> = {};

  for (const testId of IMAGING_TESTS) {
    const keyRe = new RegExp(`(?:^|\\n)\\s+(?:'${testId}'|${testId})\\s*:\\s*\\[`, 'm');
    const match = abnBlock.match(keyRe);
    if (!match || match.index === undefined) {
      pools[testId] = new Set();
      continue;
    }

    const start = match.index + match[0].length;
    let depth = 1;
    let i = start;
    while (i < abnBlock.length && depth > 0) {
      const ch = abnBlock[i];
      if (ch === '[') depth++;
      else if (ch === ']') depth--;
      i++;
    }

    const block = abnBlock.slice(start, i - 1);
    pools[testId] = new Set(
      [...block.matchAll(/'([a-z0-9][a-z0-9-]*)'/g)].map((m) => m[1]),
    );
  }
  return pools;
}

export function verifyImagingCoverage(): Violation[] {
  const src =
    fs.readFileSync('src/data/polyclinicPatients.ts', 'utf8') +
    '\n' +
    fs.readFileSync('src/data/patients.ts', 'utf8');
  const pools = readPools();
  const violations: Violation[] = [];

  const caseRe =
    /\{\s*id:\s*'([^']+)',[\s\S]*?testResults:\s*\[([\s\S]*?)\],\s*correctDiagnosisId:\s*'([^']+)'/g;

  let match: RegExpExecArray | null;
  while ((match = caseRe.exec(src))) {
    const [, caseId, testResults, diagnosis] = match;
    const tests = [
      ...testResults.matchAll(/testId:\s*'([^']+)'[^}]*?abnormal:\s*(true|false)/g),
    ];
    for (const [, testId, abnormal] of tests) {
      if (!IMAGING_TESTS.includes(testId) || abnormal !== 'true') continue;
      const tags = pools[testId] ?? new Set<string>();
      const dx = diagnosis.toLowerCase();
      const matched = [...tags].some(
        (tag) => dx === tag || dx.includes(tag) || tag.includes(dx),
      );
      if (!matched) {
        violations.push({
          case: caseId,
          rule: 'unmatched-imaging',
          detail: `${testId}: no tagged reference for "${diagnosis}"`,
        });
      }
    }
  }

  return violations;
}

if (process.argv[1]?.endsWith('imaging-coverage.ts')) {
  const violations = verifyImagingCoverage();
  if (violations.length === 0) {
    console.log('PASS  imaging-coverage');
  } else {
    console.log(`FAIL  imaging-coverage  (${violations.length})`);
    for (const v of violations) {
      console.log(`      [${v.case}] ${v.rule}: ${v.detail}`);
    }
    process.exit(1);
  }
}
