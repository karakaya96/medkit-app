// Single source of truth for human-readable diagnosis names.
//
// Two data sets historically carried their own label maps: the polyclinic
// library (`POLYCLINIC_DIAGNOSIS_LABELS`) and the ER cases (`DIAGNOSIS_LABELS`).
// Screens that only consulted one of them fell back to the raw slug and
// rendered English-looking names ("Asthma Exacerbation", "Panic Attack", …).
// Both maps are Turkish, so merging them here keeps every surface translated.

import { DIAGNOSIS_LABELS } from './patients.ts';
import { POLYCLINIC_DIAGNOSIS_LABELS } from './polyclinicPatients.ts';

export function diagnosisLabel(id: string): string {
  return (
    POLYCLINIC_DIAGNOSIS_LABELS[id] ??
    DIAGNOSIS_LABELS[id] ??
    // Unknown id: show the raw slug rather than inventing a title-cased
    // English name that looks like a real diagnosis.
    id
  );
}
