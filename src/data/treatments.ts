import type { Treatment } from '../game/types';

export const TREATMENTS: Treatment[] = [
  { id: 'aspirin', name: 'Aspirin 325 mg PO', category: 'medication' },
  { id: 'nitro', name: 'Nitrogliserin SL', category: 'medication' },
  { id: 'heparin', name: 'Heparin infüzyonu', category: 'medication' },
  { id: 'cath-lab', name: 'Kateter laboratuvarını aktive et', category: 'procedure' },
  { id: 'tpa', name: 'tPA (alteplaz)', category: 'medication' },
  { id: 'epi-im', name: 'Epinefrin 0.3 mg IM', category: 'medication' },
  { id: 'antihistamine', name: 'Difenhidramin IV', category: 'medication' },
  { id: 'steroids-iv', name: 'Metilprednizolon IV', category: 'medication' },
  { id: 'neb-albuterol', name: 'Nebülize albuterol', category: 'medication' },
  { id: 'o2', name: 'Ek oksijen', category: 'procedure' },
  { id: 'iv-fluids', name: 'IV sıvı (SF bolusu)', category: 'procedure' },
  { id: 'abx-broad', name: 'Geniş spektrumlu antibiyotikler', category: 'medication' },
  { id: 'analgesia', name: 'Analjezi (morfin)', category: 'medication' },
  { id: 'ondansetron', name: 'Ondansetron 4 mg IV', category: 'medication' },
  { id: 'surgery-consult', name: 'Cerrahi konsültasyon', category: 'disposition' },
  { id: 'admit-icu', name: 'Yoğun bakım ünitesine kabul', category: 'disposition' },
  { id: 'admit-floor', name: 'Servise yatış', category: 'disposition' },
  { id: 'observe', name: 'Gözlem ünitesi', category: 'disposition' },
  { id: 'discharge', name: 'Eve taburcu', category: 'disposition' },
];

export const treatmentById = (id: string) => TREATMENTS.find((t) => t.id === id);
