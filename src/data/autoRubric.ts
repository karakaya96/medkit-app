// Fallback rubric derivation for cases that don't ship with an authored
// `rubric` field. The auto-rubric is intentionally minimal and citation-
// free: it gives the medkit-attending agent enough structure to grade
// communication and basic clinical-management coverage, but it cannot
// power the citation-card UX that hero cases get. When a non-hero case
// rolls up with this fallback, the debrief still scores three domains —
// it just won't quote specific society guidelines.

import type { PatientCase, CaseRubric, RubricCriterion } from '../game/types';
import { treatmentById } from './treatments.ts';

const GENERIC_INTERPERSONAL: RubricCriterion[] = [
  {
    criterion_id: 'ip-01',
    label: 'Kendini tanıtma ve gündem belirleme',
    weight: 1,
    framework: 'SEGUE',
    evidence: 'Hastayı selamlar, kendini tanıtır, kimliğini doğrular ve görüşmenin gündemini müzakere eder.',
  },
  {
    criterion_id: 'ip-02',
    label: 'Fikir, endişe ve beklentileri (ICE) keşfetme',
    weight: 2,
    framework: 'ICE',
    evidence: 'Hastanın fikirlerini, endişelerini ve beklentilerini ortaya çıkarır — yalnızca semptom kontrol listesiyle yetinmez.',
  },
  {
    criterion_id: 'ip-03',
    label: 'Empatik yanıt',
    weight: 2,
    framework: 'NURSE',
    evidence: 'Hastanın dile getirdiği duyguyu adlandırır ve doğrular; sıkıntısını küçümsemez.',
  },
  {
    criterion_id: 'ip-04',
    label: 'Jargonsuz açıklama',
    weight: 1,
    framework: 'PLAB2',
    evidence: 'Çalışma tanısını ve planı, açıklanmayan tıbbi kısaltmalar kullanmadan sade bir dille anlatır.',
  },
  {
    criterion_id: 'ip-05',
    label: 'Özetleme ve anlaşılırlığı kontrol etme',
    weight: 1,
    framework: 'SEGUE',
    evidence: 'Planı sonunda özetler ve hastayı tekrar etmeye veya soru sormaya davet eder.',
  },
];

export function deriveAutoRubric(c: PatientCase): CaseRubric {
  const data_gathering: RubricCriterion[] = c.anamnesis
    .filter((q) => q.relevant)
    .slice(0, 8)
    .map((q, i) => ({
      criterion_id: `dg-${String(i + 1).padStart(2, '0')}`,
      label: q.question,
      weight: 1,
      framework: 'RCGP',
      evidence: `Hastaya "${q.question}" sorusunu veya klinik olarak eşdeğer bir soruyu sorar.`,
    }));

  const clinical_management: RubricCriterion[] = c.criticalTreatmentIds
    .slice(0, 6)
    .map((tid, i) => {
      const name = treatmentById(tid)?.name ?? tid;
      return {
        criterion_id: `cm-${String(i + 1).padStart(2, '0')}`,
        label: `Kritik işlemi uygula: ${name}`,
        weight: 3,
        framework: 'PLAB2',
        // No guideline_ref — honest signal to the agent that this is
        // auto-derived. The agent's hard rule is: never fabricate a citation.
        evidence: `Görüşme sırasında "${name}" işlemini kaydeder.`,
      };
    });

  return {
    data_gathering,
    clinical_management,
    interpersonal: GENERIC_INTERPERSONAL,
    safety_netting: {
      required_elements: [
        'Hastaya hangi semptomlarda acilen geri dönmesi gerektiğini söyler',
        'Takip için belirli bir zaman aralığı veya tetikleyici belirtir',
      ],
      weight: 1,
    },
    global_rating: 'borderline-regression',
  };
}

export function getRubricFor(c: PatientCase): CaseRubric {
  return c.rubric ?? deriveAutoRubric(c);
}
