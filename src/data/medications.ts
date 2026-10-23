/**
 * Medication catalog for the polyclinic prescription workflow.
 *
 * Each entry lists the diagnosis IDs (from `polyclinicPatients.ts` /
 * `patients.ts`) for which the drug is clinically appropriate, plus an
 * explicit contraindications list when the drug would be dangerous or
 * medically inappropriate.  Grading uses these lists to award bonuses for
 * correct prescribing and penalties for wrong/dangerous choices.
 *
 * This is a TRAINING catalogue — doses and indications reflect common
 * real-world outpatient practice but must NOT be used as clinical guidance
 * outside the simulator.
 */

import type { ClinicId } from '../game/clinic';

/**
 * High-level therapeutic category used to group the prescription pad.
 * Finer-grained `class` (e.g. "SSRI", "ACE inhibitor") nests under this.
 */
export type MedicationCategory =
  | 'antibiotic'
  | 'antiviral'
  | 'antifungal'
  | 'cardiovascular'
  | 'antiplatelet-anticoagulant'
  | 'lipid-lowering'
  | 'endocrine'
  | 'analgesic'
  | 'gastrointestinal'
  | 'respiratory'
  | 'allergy'
  | 'neurology'
  | 'psychiatry'
  | 'rheumatology'
  | 'dermatology'
  | 'ophthalmic'
  | 'urology'
  | 'obgyn'
  | 'hematology-nutrition';

export interface Medication {
  id: string;
  name: string;
  form: 'tablet' | 'capsule' | 'solution' | 'cream' | 'spray' | 'injection';
  category: MedicationCategory;
  class: string;
  defaultDose: string;
  defaultDuration: string;
  /** Diagnosis IDs for which this drug is an appropriate outpatient choice. */
  indications: string[];
  /** Diagnosis IDs where this drug is explicitly wrong / dangerous. */
  contraindications?: string[];
}

/* ------------------------------------------------------------------ */
/*  Catalog                                                            */
/* ------------------------------------------------------------------ */

export const MEDICATIONS: Medication[] = [
  // ─────────── Antibiotics ───────────
  {
    id: 'amoxicillin-clavulanate-1g',
    name: 'Amoksisilin/Klavulanat 1 g',
    form: 'tablet',
    category: 'antibiotic',
    class: 'Penisilin + β-laktamaz inhibitörü',
    defaultDose: '1 tablet, 2×1, PO',
    defaultDuration: '7 gün',
    indications: [
      'acute-sinusitis-bacterial',
      'otitis-media-adult',
      'acute-otitis-media-child',
      'community-acquired-pna',
      'pneumonia',
      'cellulitis-non-limb-threatening',
      'dental-abscess',
      'pid-outpatient',
    ],
    contraindications: ['drug-allergy-penicillin', 'viral-uri', 'viral-gastroenteritis'],
  },
  {
    id: 'azithromycin-500',
    name: 'Azitromisin 500 mg',
    form: 'tablet',
    category: 'antibiotic',
    class: 'Makrolid antibiyotik',
    defaultDose: '1 tablet, 1×1, PO (1. gün: 2 tablet)',
    defaultDuration: '5 gün',
    indications: [
      'community-acquired-pna',
      'pneumonia',
      'chronic-bronchitis',
      'pid-outpatient',
      'pid-gonococcal',
    ],
    contraindications: ['viral-uri'],
  },
  {
    id: 'ciprofloxacin-500',
    name: 'Siprofloksasin 500 mg',
    form: 'tablet',
    category: 'antibiotic',
    class: 'Florokinolon antibiyotik',
    defaultDose: '1 tablet, 2×1, PO',
    defaultDuration: '7 gün',
    indications: [
      'uti-uncomplicated',
      'recurrent-uti-female',
      'uti',
      'pyelonephritis',
      'prostatitis-chronic',
      'brucellosis',
    ],
    contraindications: ['viral-uri', 'viral-gastroenteritis', 'atopic-dermatitis'],
  },
  {
    id: 'cefuroxime-500',
    name: 'Sefuroksim Aksetil 500 mg',
    form: 'tablet',
    category: 'antibiotic',
    class: '2. kuşak sefalosporin',
    defaultDose: '1 tablet, 2×1, PO',
    defaultDuration: '7 gün',
    indications: [
      'acute-sinusitis-bacterial',
      'otitis-media-adult',
      'community-acquired-pna',
      'cellulitis-non-limb-threatening',
    ],
  },
  {
    id: 'doxycycline-100',
    name: 'Doksisiklin 100 mg',
    form: 'tablet',
    category: 'antibiotic',
    class: 'Tetrasiklin antibiyotik',
    defaultDose: '1 tablet, 2×1, PO',
    defaultDuration: '14 gün',
    indications: [
      'acne-vulgaris',
      'rosacea',
      'lyme-disease',
      'brucellosis',
      'pid-outpatient',
      'chronic-bronchitis',
      'community-acquired-pna',
    ],
    contraindications: ['normal-pregnancy-2nd-tri', 'gestational-dm'],
  },
  {
    id: 'penicillin-v-500',
    name: 'Penisilin V 500 mg',
    form: 'tablet',
    category: 'antibiotic',
    class: 'Doğal penisilin',
    defaultDose: '1 tablet, 4×1, PO',
    defaultDuration: '10 gün',
    indications: ['tonsillitis-strep', 'strep-pharyngitis-child'],
    contraindications: ['drug-allergy-penicillin', 'viral-uri'],
  },
  {
    id: 'metronidazole-500',
    name: 'Metronidazol 500 mg',
    form: 'tablet',
    category: 'antibiotic',
    class: 'Nitroimidazol antibiyotik',
    defaultDose: '1 tablet, 2×1, PO',
    defaultDuration: '7 gün',
    indications: ['bacterial-vaginosis', 'pid-outpatient', 'trichomoniasis'],
    contraindications: ['alcohol-use-disorder'],
  },
  {
    id: 'nitrofurantoin-100',
    name: 'Nitrofurantoin 100 mg',
    form: 'capsule',
    category: 'antibiotic',
    class: 'Üriner antibiyotik',
    defaultDose: '1 kapsül, 2×1, PO',
    defaultDuration: '5 gün',
    indications: ['uti-uncomplicated', 'recurrent-uti-female', 'uti'],
    contraindications: ['ckd-stage3a', 'pyelonephritis', 'diabetic-nephropathy'],
  },
  {
    id: 'tmp-smx-ds',
    name: 'Trimetoprim/Sülfametoksazol DS',
    form: 'tablet',
    category: 'antibiotic',
    class: 'Folat antagonisti antibiyotik',
    defaultDose: '1 tablet, 2×1, PO',
    defaultDuration: '5 gün',
    indications: ['uti-uncomplicated', 'recurrent-uti-female', 'prostatitis-chronic'],
    contraindications: ['ckd-stage3a', 'normal-pregnancy-2nd-tri'],
  },
  {
    id: 'clotrimazole-vag',
    name: 'Klotrimazol Vajinal Krem',
    form: 'cream',
    category: 'antifungal',
    class: 'Topikal azol antifungal',
    defaultDose: 'Yatmadan önce 1 aplikatör',
    defaultDuration: '7 gün',
    indications: ['candida-vulvovaginitis'],
  },
  {
    id: 'acyclovir-800',
    name: 'Asiklovir 800 mg',
    form: 'tablet',
    category: 'antiviral',
    class: 'Antiviral (nükleozid analogu)',
    defaultDose: '1 tablet, 5×1, PO',
    defaultDuration: '7 gün',
    indications: ['shingles', 'herpes-simplex-keratitis', 'varicella'],
  },

  // ─────────── Antihypertensives ───────────
  {
    id: 'amlodipine-5',
    name: 'Amlodipin 5 mg',
    form: 'tablet',
    category: 'cardiovascular',
    class: 'Kalsiyum kanal blokeri',
    defaultDose: '1 tablet, 1×1, PO',
    defaultDuration: 'sürekli',
    indications: [
      'essential-hypertension',
      'htn-uncontrolled',
      'hypertensive-nephrosclerosis',
      'stable-angina',
      'renal-artery-stenosis',
    ],
    contraindications: ['orthostatic-hypotension', 'chf-nyha2'],
  },
  {
    id: 'ramipril-5',
    name: 'Ramipril 5 mg',
    form: 'tablet',
    category: 'cardiovascular',
    class: 'ACE inhibitörü',
    defaultDose: '1 tablet, 1×1, PO',
    defaultDuration: 'sürekli',
    indications: [
      'essential-hypertension',
      'htn-uncontrolled',
      'chf-nyha2',
      'chf',
      'diabetic-nephropathy',
      'iga-nephropathy',
      'ckd-stage3a',
      'type2-diabetes',
      'type2-dm-uncontrolled',
      'hypertensive-nephrosclerosis',
    ],
    contraindications: [
      'hereditary-angioedema',
      'angioedema-ace',
      'renal-artery-stenosis',
      'normal-pregnancy-2nd-tri',
      'aki-pre-renal',
    ],
  },
  {
    id: 'losartan-50',
    name: 'Losartan 50 mg',
    form: 'tablet',
    category: 'cardiovascular',
    class: 'Anjiyotensin reseptör blokeri',
    defaultDose: '1 tablet, 1×1, PO',
    defaultDuration: 'sürekli',
    indications: [
      'essential-hypertension',
      'htn-uncontrolled',
      'diabetic-nephropathy',
      'chf-nyha2',
      'hypertensive-nephrosclerosis',
    ],
    contraindications: ['normal-pregnancy-2nd-tri', 'aki-pre-renal'],
  },
  {
    id: 'metoprolol-50',
    name: 'Metoprolol Süksinat 50 mg',
    form: 'tablet',
    category: 'cardiovascular',
    class: 'Kardiyoselektif β-bloker',
    defaultDose: '1 tablet, 1×1, PO',
    defaultDuration: 'sürekli',
    indications: [
      'paroxysmal-afib',
      'stable-angina',
      'chf-nyha2',
      'chf',
      'ventricular-pvcs',
      'hcm',
      'essential-hypertension',
      'htn-uncontrolled',
    ],
    contraindications: ['asthma-chronic', 'asthma-allergic', 'copd-gold2'],
  },
  {
    id: 'bisoprolol-5',
    name: 'Bisoprolol 5 mg',
    form: 'tablet',
    category: 'cardiovascular',
    class: 'Kardiyoselektif β-bloker',
    defaultDose: '1 tablet, 1×1, PO',
    defaultDuration: 'sürekli',
    indications: [
      'chf-nyha2',
      'chf',
      'paroxysmal-afib',
      'stable-angina',
      'essential-hypertension',
    ],
    contraindications: ['asthma-chronic', 'asthma-allergic'],
  },
  {
    id: 'hctz-25',
    name: 'Hidroklorotiyazid 25 mg',
    form: 'tablet',
    category: 'cardiovascular',
    class: 'Tiyazid diüretik',
    defaultDose: '1 tablet, 1×1, PO',
    defaultDuration: 'sürekli',
    indications: ['essential-hypertension', 'htn-uncontrolled'],
    contraindications: ['gout', 'nephrolithiasis-recurrent'],
  },
  {
    id: 'indapamide-15',
    name: 'Indapamid SR 1,5 mg',
    form: 'tablet',
    category: 'cardiovascular',
    class: 'Tiyazid benzeri diüretik',
    defaultDose: '1 tablet, 1×1, PO',
    defaultDuration: 'sürekli',
    indications: ['essential-hypertension', 'htn-uncontrolled'],
    contraindications: ['gout'],
  },
  {
    id: 'spironolactone-25',
    name: 'Spironolakton 25 mg',
    form: 'tablet',
    category: 'cardiovascular',
    class: 'Aldosteron antagonisti',
    defaultDose: '1 tablet, 1×1, PO',
    defaultDuration: 'sürekli',
    indications: ['chf-nyha2', 'chf', 'htn-uncontrolled', 'pcos', 'pcos-obgyn'],
    contraindications: ['ckd-stage3a', 'aki-pre-renal'],
  },

  // ─────────── Antidiabetics ───────────
  {
    id: 'metformin-500',
    name: 'Metformin 500 mg',
    form: 'tablet',
    category: 'endocrine',
    class: 'Biguanid',
    defaultDose: '1 tablet, 2×1, PO (yemekle)',
    defaultDuration: 'sürekli',
    indications: [
      'type2-diabetes',
      'type2-dm-uncontrolled',
      'pcos',
      'pcos-obgyn',
      'gestational-dm',
    ],
    contraindications: ['ckd-stage3a', 'aki-pre-renal', 'type1-dm-new'],
  },
  {
    id: 'gliclazide-30',
    name: 'Gliklazid MR 30 mg',
    form: 'tablet',
    category: 'endocrine',
    class: 'Sülfonilüre',
    defaultDose: '1 tablet, 1×1, PO',
    defaultDuration: 'sürekli',
    indications: ['type2-diabetes', 'type2-dm-uncontrolled'],
    contraindications: ['type1-dm-new', 'hypoglycemia'],
  },
  {
    id: 'empagliflozin-10',
    name: 'Empagliflozin 10 mg',
    form: 'tablet',
    category: 'endocrine',
    class: 'SGLT2 inhibitörü',
    defaultDose: '1 tablet, 1×1, PO',
    defaultDuration: 'sürekli',
    indications: [
      'type2-diabetes',
      'type2-dm-uncontrolled',
      'chf-nyha2',
      'chf',
      'diabetic-nephropathy',
    ],
    contraindications: ['type1-dm-new', 'aki-pre-renal'],
  },
  {
    id: 'insulin-glargine',
    name: 'İnsülin Glarjin (bazal)',
    form: 'injection',
    category: 'endocrine',
    class: 'Uzun etkili bazal insülin',
    defaultDose: '10 IU gece SC',
    defaultDuration: 'sürekli',
    indications: [
      'type1-dm-new',
      'type2-dm-uncontrolled',
      'gestational-dm',
      'diabetic-nephropathy',
    ],
  },
  {
    id: 'insulin-aspart',
    name: 'İnsülin Aspart (bolus)',
    form: 'injection',
    category: 'endocrine',
    class: 'Hızlı etkili prandiyal insülin',
    defaultDose: 'Yemekten önce 4-6 IU SC',
    defaultDuration: 'sürekli',
    indications: ['type1-dm-new', 'type2-dm-uncontrolled'],
  },

  // ─────────── Analgesics / NSAIDs ───────────
  {
    id: 'paracetamol-500',
    name: 'Parasetamol 500 mg',
    form: 'tablet',
    category: 'analgesic',
    class: 'Analjezik / antipiretik',
    defaultDose: '1-2 tablet, 3×1, PO',
    defaultDuration: '5 gün',
    indications: [
      'tension-headache',
      'migraine-without-aura',
      'osteoarthritis-knee',
      'osteoarthritis-hand',
      'hip-oa-moderate',
      'viral-uri',
      'viral-gastroenteritis',
      'febrile-seizure',
      'hand-foot-mouth',
      'varicella',
      'influenza',
      'plantar-fasciitis',
      'lateral-epicondylitis',
      'frozen-shoulder',
      'tmj-dysfunction',
    ],
    contraindications: ['chronic-hepatitis-b', 'chronic-hepatitis-c', 'alcoholic-hepatitis'],
  },
  {
    id: 'ibuprofen-400',
    name: 'İbuprofen 400 mg',
    form: 'tablet',
    category: 'analgesic',
    class: 'NSAİİ',
    defaultDose: '1 tablet, 3×1, PO',
    defaultDuration: '5 gün',
    indications: [
      'tension-headache',
      'migraine-without-aura',
      'osteoarthritis-knee',
      'hip-oa-moderate',
      'lateral-epicondylitis',
      'plantar-fasciitis',
      'achilles-tendinopathy',
      'ankle-sprain-gr2',
      'subacromial-bursitis',
      'menorrhagia-fibroids',
      'pericarditis',
      'gout',
    ],
    contraindications: [
      'peptic-ulcer-disease',
      'ckd-stage3a',
      'chf-nyha2',
      'gerd',
      'aki-pre-renal',
      'asthma-allergic',
    ],
  },
  {
    id: 'naproxen-500',
    name: 'Naproksen 500 mg',
    form: 'tablet',
    category: 'analgesic',
    class: 'NSAİİ',
    defaultDose: '1 tablet, 2×1, PO',
    defaultDuration: '10 gün',
    indications: [
      'gout',
      'ankylosing-spondylitis',
      'rheumatoid-arthritis-early',
      'osteoarthritis-knee',
      'hip-oa-moderate',
      'migraine-without-aura',
      'meniscal-tear',
      'pericarditis',
    ],
    contraindications: ['peptic-ulcer-disease', 'ckd-stage3a', 'chf-nyha2', 'gerd'],
  },
  {
    id: 'diclofenac-75',
    name: 'Diklofenak 75 mg',
    form: 'tablet',
    category: 'analgesic',
    class: 'NSAİİ',
    defaultDose: '1 tablet, 2×1, PO',
    defaultDuration: '7 gün',
    indications: [
      'kidney-stone-5mm',
      'nephrolithiasis-recurrent',
      'kidney-stone',
      'gallstones-biliary-colic',
      'gallstones-cholelithiasis',
      'lumbar-disc-herniation',
      'sciatica-l5',
      'gout',
    ],
    contraindications: ['peptic-ulcer-disease', 'ckd-stage3a'],
  },
  {
    id: 'tramadol-50',
    name: 'Tramadol 50 mg',
    form: 'capsule',
    category: 'analgesic',
    class: 'Zayıf opioid analjezik',
    defaultDose: '1 kapsül, 3×1, PO',
    defaultDuration: '5 gün',
    indications: [
      'hip-oa-moderate',
      'osteoarthritis-knee',
      'lumbar-disc-herniation',
      'meniscal-tear',
      'sciatica-l5',
    ],
    contraindications: [
      'mdd-moderate',
      'ptsd',
      'alcohol-use-disorder',
      'insomnia-chronic',
      'epilepsy',
    ],
  },
  {
    id: 'colchicine-05',
    name: 'Kolşisin 0,5 mg',
    form: 'tablet',
    category: 'analgesic',
    class: 'Anti-gut ajanı',
    defaultDose: '1 tablet, 2-3×1, PO',
    defaultDuration: '7 gün',
    indications: ['gout', 'pericarditis'],
    contraindications: ['ckd-stage3a'],
  },
  {
    id: 'allopurinol-300',
    name: 'Allopurinol 300 mg',
    form: 'tablet',
    category: 'analgesic',
    class: 'Ksantin oksidaz inhibitörü',
    defaultDose: '1 tablet, 1×1, PO',
    defaultDuration: 'sürekli',
    indications: ['gout'],
  },

  // ─────────── PPIs / antacids / GI ───────────
  {
    id: 'pantoprazole-40',
    name: 'Pantoprazol 40 mg',
    form: 'tablet',
    category: 'gastrointestinal',
    class: 'Proton pompası inhibitörü',
    defaultDose: '1 tablet, 1×1, PO (kahvaltıdan 30 dk önce)',
    defaultDuration: '8 hafta',
    indications: [
      'gerd',
      'peptic-ulcer-disease',
      'laryngopharyngeal-reflux',
      'eosinophilic-esophagitis',
      'gerd-infant',
    ],
  },
  {
    id: 'esomeprazole-40',
    name: 'Esomeprazol 40 mg',
    form: 'tablet',
    category: 'gastrointestinal',
    class: 'Proton pompası inhibitörü',
    defaultDose: '1 tablet, 1×1, PO',
    defaultDuration: '8 hafta',
    indications: ['gerd', 'peptic-ulcer-disease', 'laryngopharyngeal-reflux'],
  },
  {
    id: 'famotidine-40',
    name: 'Famotidin 40 mg',
    form: 'tablet',
    category: 'gastrointestinal',
    class: 'H2 reseptör antagonisti',
    defaultDose: '1 tablet, gece, PO',
    defaultDuration: '4 hafta',
    indications: ['gerd', 'peptic-ulcer-disease'],
  },
  {
    id: 'loperamide-2',
    name: 'Loperamid 2 mg',
    form: 'capsule',
    category: 'gastrointestinal',
    class: 'Opioid reseptörlü antidiyareik',
    defaultDose: 'Başlangıçta 1-2 kapsül, sonra her dışkılamadan sonra 1 kapsül',
    defaultDuration: '2 gün',
    indications: ['viral-gastroenteritis', 'ibs-c'],
    contraindications: ['crohns-disease', 'ulcerative-colitis'],
  },
  {
    id: 'ondansetron-8',
    name: 'Ondansetron 8 mg',
    form: 'tablet',
    category: 'gastrointestinal',
    class: '5-HT3 antagonisti',
    defaultDose: '1 tablet, 2×1, PO',
    defaultDuration: '3 gün',
    indications: ['viral-gastroenteritis', 'migraine-without-aura'],
  },
  {
    id: 'metoclopramide-10',
    name: 'Metoklopramid 10 mg',
    form: 'tablet',
    category: 'gastrointestinal',
    class: 'Dopamin antagonisti antiemetik',
    defaultDose: '1 tablet, 3×1, PO',
    defaultDuration: '5 gün',
    indications: ['viral-gastroenteritis', 'migraine-without-aura', 'gerd'],
    contraindications: ['idiopathic-parkinsons-early', 'essential-tremor'],
  },
  {
    id: 'lactulose-syrup',
    name: 'Laktuloz Şurup',
    form: 'solution',
    category: 'gastrointestinal',
    class: 'Ozmotik laksatif',
    defaultDose: '15 mL, 2×1, PO',
    defaultDuration: '14 gün',
    indications: ['ibs-c', 'constipation-functional', 'hemorrhoids', 'hemorrhoids-grade2'],
  },
  {
    id: 'mesalazine-1g',
    name: 'Mesalazin 1 g',
    form: 'tablet',
    category: 'gastrointestinal',
    class: '5-ASA',
    defaultDose: '1 tablet, 3×1, PO',
    defaultDuration: 'sürekli',
    indications: ['ulcerative-colitis', 'crohns-disease'],
  },

  // ─────────── Antihistamines ───────────
  {
    id: 'cetirizine-10',
    name: 'Setirizin 10 mg',
    form: 'tablet',
    category: 'allergy',
    class: '2. kuşak H1 antihistaminik',
    defaultDose: '1 tablet, 1×1, PO',
    defaultDuration: '30 gün',
    indications: [
      'allergic-rhinitis-seasonal',
      'allergic-rhinitis-ent',
      'allergic-rhinitis-asthma',
      'urticaria-chronic',
      'chronic-urticaria',
      'atopic-dermatitis',
      'atopic-dermatitis-child',
      'contact-dermatitis',
    ],
  },
  {
    id: 'levocetirizine-5',
    name: 'Levosetirizin 5 mg',
    form: 'tablet',
    category: 'allergy',
    class: '2. kuşak H1 antihistaminik',
    defaultDose: '1 tablet, 1×1, PO',
    defaultDuration: '30 gün',
    indications: [
      'allergic-rhinitis-seasonal',
      'allergic-rhinitis-ent',
      'chronic-urticaria',
      'urticaria-chronic',
    ],
  },
  {
    id: 'desloratadine-5',
    name: 'Desloratadin 5 mg',
    form: 'tablet',
    category: 'allergy',
    class: '2. kuşak H1 antihistaminik',
    defaultDose: '1 tablet, 1×1, PO',
    defaultDuration: '30 gün',
    indications: ['allergic-rhinitis-seasonal', 'urticaria-chronic', 'chronic-urticaria'],
  },
  {
    id: 'fexofenadine-180',
    name: 'Feksofenadin 180 mg',
    form: 'tablet',
    category: 'allergy',
    class: '2. kuşak H1 antihistaminik',
    defaultDose: '1 tablet, 1×1, PO',
    defaultDuration: '30 gün',
    indications: [
      'allergic-rhinitis-seasonal',
      'allergic-rhinitis-ent',
      'chronic-urticaria',
      'urticaria-chronic',
    ],
  },

  // ─────────── Asthma / COPD ───────────
  {
    id: 'salbutamol-inh',
    name: 'Salbutamol İnhaler 100 mcg',
    form: 'spray',
    category: 'respiratory',
    class: 'Kısa etkili β2 agonist',
    defaultDose: 'Gerektiğinde 2 puf',
    defaultDuration: 'sürekli',
    indications: [
      'asthma-chronic',
      'asthma-allergic',
      'pediatric-asthma-exacerbation',
      'asthma-exacerbation',
      'copd-gold2',
      'chronic-bronchitis',
    ],
  },
  {
    id: 'budesonide-inh',
    name: 'Budesonid İnhaler 200 mcg',
    form: 'spray',
    category: 'respiratory',
    class: 'İnhaler kortikosteroid',
    defaultDose: '2 puf, 2×1',
    defaultDuration: 'sürekli',
    indications: [
      'asthma-chronic',
      'asthma-allergic',
      'pediatric-asthma-exacerbation',
      'allergic-rhinitis-asthma',
    ],
  },
  {
    id: 'formoterol-budesonide-inh',
    name: 'Formoterol/Budesonid İnhaler',
    form: 'spray',
    category: 'respiratory',
    class: 'Uzun etkili β2 agonist + inhale kortikosteroid',
    defaultDose: '2 puf, 2×1',
    defaultDuration: 'sürekli',
    indications: ['asthma-chronic', 'asthma-allergic', 'copd-gold2'],
  },
  {
    id: 'tiotropium-inh',
    name: 'Tiotropium İnhaler 18 mcg',
    form: 'spray',
    category: 'respiratory',
    class: 'Uzun etkili muskarinik antagonist',
    defaultDose: '1 inhalasyon, 1×1',
    defaultDuration: 'sürekli',
    indications: ['copd-gold2', 'chronic-bronchitis'],
  },
  {
    id: 'montelukast-10',
    name: 'Montelukast 10 mg',
    form: 'tablet',
    category: 'respiratory',
    class: 'Lökotrien reseptör antagonisti',
    defaultDose: '1 tablet, gece, PO',
    defaultDuration: 'sürekli',
    indications: [
      'asthma-chronic',
      'asthma-allergic',
      'allergic-rhinitis-asthma',
      'allergic-rhinitis-seasonal',
    ],
  },
  {
    id: 'fluticasone-nasal',
    name: 'Flutikazon Nazal Sprey',
    form: 'spray',
    category: 'respiratory',
    class: 'İntranazal kortikosteroid',
    defaultDose: 'Her burun deliğine 2 puf, 1×1',
    defaultDuration: 'sürekli',
    indications: [
      'allergic-rhinitis-seasonal',
      'allergic-rhinitis-ent',
      'allergic-rhinitis-asthma',
      'nasal-polyps',
      'chronic-rhinosinusitis',
    ],
  },

  // ─────────── Thyroid ───────────
  {
    id: 'levothyroxine-50',
    name: 'Levotiroksin 50 mcg',
    form: 'tablet',
    category: 'endocrine',
    class: 'Tiroid hormonu',
    defaultDose: '1 tablet, 1×1, PO, aç karnına',
    defaultDuration: 'sürekli',
    indications: ['hypothyroidism-hashimoto'],
    contraindications: ['graves-disease'],
  },
  {
    id: 'methimazole-5',
    name: 'Metimazol 5 mg',
    form: 'tablet',
    category: 'endocrine',
    class: 'Antitiroid (tiyoamid)',
    defaultDose: '2 tablet, 3×1, PO',
    defaultDuration: '18 ay',
    indications: ['graves-disease'],
    contraindications: ['hypothyroidism-hashimoto'],
  },
  {
    id: 'propylthiouracil-50',
    name: 'Propiltiyourasil 50 mg',
    form: 'tablet',
    category: 'endocrine',
    class: 'Antitiroid (tiyoamid)',
    defaultDose: '2 tablet, 3×1, PO',
    defaultDuration: '12 ay',
    indications: ['graves-disease'],
    contraindications: ['hypothyroidism-hashimoto'],
  },

  // ─────────── Statins / Lipids ───────────
  {
    id: 'atorvastatin-20',
    name: 'Atorvastatin 20 mg',
    form: 'tablet',
    category: 'lipid-lowering',
    class: 'HMG-CoA redüktaz inhibitörü',
    defaultDose: '1 tablet, gece, PO',
    defaultDuration: 'sürekli',
    indications: [
      'stable-angina',
      'type2-diabetes',
      'type2-dm-uncontrolled',
      'diabetic-nephropathy',
      'essential-hypertension',
      'ckd-stage3a',
    ],
    contraindications: ['statin-myalgia', 'chronic-hepatitis-b', 'chronic-hepatitis-c'],
  },
  {
    id: 'rosuvastatin-10',
    name: 'Rosuvastatin 10 mg',
    form: 'tablet',
    category: 'lipid-lowering',
    class: 'HMG-CoA redüktaz inhibitörü',
    defaultDose: '1 tablet, gece, PO',
    defaultDuration: 'sürekli',
    indications: ['stable-angina', 'type2-diabetes', 'essential-hypertension'],
    contraindications: ['statin-myalgia'],
  },
  {
    id: 'simvastatin-20',
    name: 'Simvastatin 20 mg',
    form: 'tablet',
    category: 'lipid-lowering',
    class: 'HMG-CoA redüktaz inhibitörü',
    defaultDose: '1 tablet, gece, PO',
    defaultDuration: 'sürekli',
    indications: ['stable-angina', 'type2-diabetes'],
    contraindications: ['statin-myalgia'],
  },
  {
    id: 'ezetimibe-10',
    name: 'Ezetimib 10 mg',
    form: 'tablet',
    category: 'lipid-lowering',
    class: 'Kolesterol emilim inhibitörü',
    defaultDose: '1 tablet, 1×1, PO',
    defaultDuration: 'sürekli',
    indications: ['stable-angina', 'statin-myalgia', 'type2-diabetes'],
  },

  // ─────────── Cardiology (other) ───────────
  {
    id: 'aspirin-100',
    name: 'Aspirin 100 mg',
    form: 'tablet',
    category: 'antiplatelet-anticoagulant',
    class: 'Antiplatelet',
    defaultDose: '1 tablet, 1×1, PO',
    defaultDuration: 'sürekli',
    indications: ['stable-angina', 'stemi', 'ischemic-stroke', 'paroxysmal-afib'],
    contraindications: ['peptic-ulcer-disease', 'hemorrhagic-stroke', 'warfarin-bleeding-workup'],
  },
  {
    id: 'clopidogrel-75',
    name: 'Klopidogrel 75 mg',
    form: 'tablet',
    category: 'antiplatelet-anticoagulant',
    class: 'Antiplatelet (P2Y12 inhibitörü)',
    defaultDose: '1 tablet, 1×1, PO',
    defaultDuration: 'sürekli',
    indications: ['stable-angina', 'stemi', 'ischemic-stroke'],
    contraindications: ['peptic-ulcer-disease', 'hemorrhagic-stroke'],
  },
  {
    id: 'apixaban-5',
    name: 'Apiksaban 5 mg',
    form: 'tablet',
    category: 'antiplatelet-anticoagulant',
    class: 'Direkt oral antikoagülan (Xa)',
    defaultDose: '1 tablet, 2×1, PO',
    defaultDuration: 'sürekli',
    indications: ['paroxysmal-afib', 'dvt'],
    contraindications: ['peptic-ulcer-disease', 'hemorrhagic-stroke', 'warfarin-bleeding-workup'],
  },
  {
    id: 'nitroglycerin-sl',
    name: 'Nitrogliserin Sublingual 0,4 mg',
    form: 'spray',
    category: 'cardiovascular',
    class: 'Nitrat',
    defaultDose: 'Gerektiğinde 1 puf sublingual',
    defaultDuration: 'sürekli',
    indications: ['stable-angina'],
  },
  {
    id: 'furosemide-40',
    name: 'Furosemid 40 mg',
    form: 'tablet',
    category: 'cardiovascular',
    class: 'Loop diüretik',
    defaultDose: '1 tablet, 1×1, PO',
    defaultDuration: 'sürekli',
    indications: ['chf-nyha2', 'chf', 'pleural-effusion-parapneumonic'],
    contraindications: ['aki-pre-renal', 'orthostatic-hypotension'],
  },

  // ─────────── Antidepressants / anxiolytics ───────────
  {
    id: 'sertraline-50',
    name: 'Sertralin 50 mg',
    form: 'tablet',
    category: 'psychiatry',
    class: 'SSRI',
    defaultDose: '1 tablet, 1×1, PO (sabah)',
    defaultDuration: 'sürekli',
    indications: [
      'mdd-moderate',
      'generalized-anxiety',
      'panic-disorder',
      'ptsd',
      'ocd-moderate',
      'social-anxiety',
      'postpartum-depression',
    ],
    contraindications: ['bipolar-2-hypomanic', 'bipolar-1'],
  },
  {
    id: 'escitalopram-10',
    name: 'Essitalopram 10 mg',
    form: 'tablet',
    category: 'psychiatry',
    class: 'SSRI',
    defaultDose: '1 tablet, 1×1, PO',
    defaultDuration: 'sürekli',
    indications: [
      'mdd-moderate',
      'generalized-anxiety',
      'panic-disorder',
      'social-anxiety',
      'menopause-vasomotor',
    ],
    contraindications: ['bipolar-2-hypomanic', 'bipolar-1'],
  },
  {
    id: 'fluoxetine-20',
    name: 'Fluoksetin 20 mg',
    form: 'capsule',
    category: 'psychiatry',
    class: 'SSRI',
    defaultDose: '1 kapsül, 1×1, PO',
    defaultDuration: 'sürekli',
    indications: ['mdd-moderate', 'ocd-moderate', 'panic-disorder'],
    contraindications: ['bipolar-2-hypomanic'],
  },
  {
    id: 'mirtazapine-30',
    name: 'Mirtazapin 30 mg',
    form: 'tablet',
    category: 'psychiatry',
    class: 'Atipik antidepresan',
    defaultDose: '1 tablet, gece, PO',
    defaultDuration: 'sürekli',
    indications: ['mdd-moderate', 'insomnia-chronic'],
  },
  {
    id: 'lorazepam-1',
    name: 'Lorazepam 1 mg',
    form: 'tablet',
    category: 'psychiatry',
    class: 'Benzodiazepin',
    defaultDose: 'Gerektiğinde 1 tablet (günde en fazla 3×)',
    defaultDuration: '14 gün',
    indications: ['generalized-anxiety', 'panic-disorder'],
    contraindications: [
      'alcohol-use-disorder',
      'obstructive-sleep-apnea',
      'insomnia-chronic',
      'copd-gold2',
    ],
  },
  {
    id: 'quetiapine-25',
    name: 'Ketiyapin 25 mg',
    form: 'tablet',
    category: 'psychiatry',
    class: 'Atipik antipsikotik',
    defaultDose: '1 tablet, gece, PO',
    defaultDuration: 'sürekli',
    indications: ['bipolar-2-hypomanic', 'bipolar-1'],
  },
  {
    id: 'methylphenidate-18',
    name: 'Metilfenidat OROS 18 mg',
    form: 'tablet',
    category: 'psychiatry',
    class: 'MSS stimülanı',
    defaultDose: '1 tablet, sabah, PO',
    defaultDuration: 'sürekli',
    indications: ['adhd-adult'],
    contraindications: ['generalized-anxiety', 'panic-disorder', 'insomnia-chronic'],
  },
  {
    id: 'zolpidem-10',
    name: 'Zolpidem 10 mg',
    form: 'tablet',
    category: 'psychiatry',
    class: 'Non-benzodiazepin hipnotik',
    defaultDose: '1 tablet, gece, PO',
    defaultDuration: '14 gün',
    indications: ['insomnia-chronic'],
    contraindications: ['obstructive-sleep-apnea', 'alcohol-use-disorder'],
  },

  // ─────────── Migraine / Neuro ───────────
  {
    id: 'propranolol-40',
    name: 'Propranolol 40 mg',
    form: 'tablet',
    category: 'cardiovascular',
    class: 'Non-selektif β-bloker',
    defaultDose: '1 tablet, 2×1, PO',
    defaultDuration: 'sürekli',
    indications: ['migraine-without-aura', 'essential-tremor', 'graves-disease'],
    contraindications: ['asthma-chronic', 'asthma-allergic', 'copd-gold2'],
  },
  {
    id: 'topiramate-50',
    name: 'Topiramat 50 mg',
    form: 'tablet',
    category: 'neurology',
    class: 'Antiepileptik / migren profilaksisi',
    defaultDose: '1 tablet, 2×1, PO',
    defaultDuration: 'sürekli',
    indications: ['migraine-without-aura', 'cluster-headache', 'epilepsy'],
    contraindications: ['nephrolithiasis-recurrent'],
  },
  {
    id: 'sumatriptan-50',
    name: 'Sumatriptan 50 mg',
    form: 'tablet',
    category: 'neurology',
    class: '5-HT1B/1D agonisti (triptan)',
    defaultDose: 'Başlangıçta 1 tablet',
    defaultDuration: 'gerektiğinde',
    indications: ['migraine-without-aura', 'cluster-headache'],
    contraindications: ['stable-angina', 'stemi', 'ischemic-stroke', 'htn-uncontrolled'],
  },
  {
    id: 'amitriptyline-25',
    name: 'Amiltriptilin 25 mg',
    form: 'tablet',
    category: 'neurology',
    class: 'Trisiklik antidepresan',
    defaultDose: '1 tablet, gece, PO',
    defaultDuration: 'sürekli',
    indications: [
      'tension-headache',
      'migraine-without-aura',
      'fibromyalgia',
      'insomnia-chronic',
    ],
    contraindications: ['bph-moderate', 'primary-open-angle-glaucoma'],
  },
  {
    id: 'gabapentin-300',
    name: 'Gabapentin 300 mg',
    form: 'capsule',
    category: 'neurology',
    class: 'Antikonvülzan / nöropatik ağrı',
    defaultDose: '1 kapsül, 3×1, PO',
    defaultDuration: 'sürekli',
    indications: [
      'sciatica-l5',
      'trigeminal-neuralgia',
      'carpal-tunnel',
      'lumbar-disc-herniation',
      'fibromyalgia',
      'shingles',
    ],
  },
  {
    id: 'carbamazepine-200',
    name: 'Karbamazepin 200 mg',
    form: 'tablet',
    category: 'neurology',
    class: 'Antikonvülzan',
    defaultDose: '1 tablet, 2×1, PO',
    defaultDuration: 'sürekli',
    indications: ['trigeminal-neuralgia', 'epilepsy'],
  },
  {
    id: 'levodopa-carbidopa',
    name: 'Levodopa/Karbidopa 100/25',
    form: 'tablet',
    category: 'neurology',
    class: 'Dopamin öncüsü',
    defaultDose: '1 tablet, 3×1, PO',
    defaultDuration: 'sürekli',
    indications: ['idiopathic-parkinsons-early'],
  },
  {
    id: 'donepezil-5',
    name: 'Donepezil 5 mg',
    form: 'tablet',
    category: 'neurology',
    class: 'Kolinesteraz inhibitörü',
    defaultDose: '1 tablet, gece, PO',
    defaultDuration: 'sürekli',
    indications: ['mild-cognitive-impairment'],
  },
  {
    id: 'prednisone-burst',
    name: 'Prednizon 1 mg/kg',
    form: 'tablet',
    category: 'endocrine',
    class: 'Sistemik kortikosteroid',
    defaultDose: 'Kademeli azaltma — 60 mg/gün ile başla',
    defaultDuration: '10 gün',
    indications: [
      'bells-palsy',
      'cluster-headache',
      'polymyalgia-rheumatica',
      'asthma-exacerbation',
      'pediatric-asthma-exacerbation',
      'sarcoidosis-stage2',
      'lupus-nephritis',
      'nephrotic-syndrome-membranous',
      'ulcerative-colitis',
      'crohns-disease',
      'sle',
    ],
    contraindications: ['peptic-ulcer-disease', 'type2-dm-uncontrolled'],
  },

  // ─────────── Dermatology ───────────
  {
    id: 'hydrocortisone-1-cr',
    name: 'Hidrokortizon %1 Krem',
    form: 'cream',
    category: 'dermatology',
    class: 'Topikal kortikosteroid (düşük potens)',
    defaultDose: 'Etkilenen bölgeye günde 2×',
    defaultDuration: '14 gün',
    indications: [
      'atopic-dermatitis',
      'atopic-dermatitis-child',
      'contact-dermatitis',
      'seborrheic-dermatitis',
    ],
  },
  {
    id: 'mometasone-01-cr',
    name: 'Mometazon %0,1 Krem',
    form: 'cream',
    category: 'dermatology',
    class: 'Topikal kortikosteroid (orta potens)',
    defaultDose: 'Etkilenen bölgeye günde 1×',
    defaultDuration: '14 gün',
    indications: [
      'atopic-dermatitis',
      'contact-dermatitis',
      'plaque-psoriasis',
      'psoriasis-guttate',
      'alopecia-areata',
    ],
  },
  {
    id: 'clotrimazole-1-cr',
    name: 'Klotrimazol %1 Krem',
    form: 'cream',
    category: 'dermatology',
    class: 'Topikal azol antifungal',
    defaultDose: 'Etkilenen bölgeye günde 2×',
    defaultDuration: '14 gün',
    indications: ['tinea-corporis', 'candida-vulvovaginitis'],
  },
  {
    id: 'adapalene-01-gel',
    name: 'Adapalen %0,1 Jel',
    form: 'cream',
    category: 'dermatology',
    class: 'Topikal retinoid',
    defaultDose: 'Gece yüze uygula',
    defaultDuration: 'sürekli',
    indications: ['acne-vulgaris'],
    contraindications: ['normal-pregnancy-2nd-tri', 'gestational-dm'],
  },
  {
    id: 'benzoyl-peroxide-5',
    name: 'Benzoil Peroksit %5 Jel',
    form: 'cream',
    category: 'dermatology',
    class: 'Topikal keratolitik',
    defaultDose: 'Gece yüze uygula',
    defaultDuration: 'sürekli',
    indications: ['acne-vulgaris'],
  },
  {
    id: 'metronidazole-gel',
    name: 'Metronidazol %0,75 Jel',
    form: 'cream',
    category: 'dermatology',
    class: 'Topikal antibakteriyel',
    defaultDose: 'Etkilenen bölgeye günde 2×',
    defaultDuration: '30 gün',
    indications: ['rosacea'],
  },
  {
    id: 'tacrolimus-01-oint',
    name: 'Takrolimus %0,1 Merhem',
    form: 'cream',
    category: 'dermatology',
    class: 'Topikal kalsinörin inhibitörü',
    defaultDose: 'Etkilenen bölgeye günde 2×',
    defaultDuration: 'sürekli',
    indications: ['atopic-dermatitis', 'atopic-dermatitis-child'],
  },
  {
    id: 'calcipotriol-oint',
    name: 'Kalsipotriol Merhem',
    form: 'cream',
    category: 'dermatology',
    class: 'Topikal D vitamini analoğu',
    defaultDose: 'Etkilenen plaklara günde 2×',
    defaultDuration: 'sürekli',
    indications: ['plaque-psoriasis', 'psoriasis-guttate'],
  },
  {
    id: 'permethrin-5-cream',
    name: 'Permetrin %5 Krem',
    form: 'cream',
    category: 'dermatology',
    class: 'Topikal skabisid',
    defaultDose: 'Tüm vücuda 8-14 saat',
    defaultDuration: 'tek doz',
    indications: ['scabies'],
  },
  {
    id: 'ketoconazole-shampoo',
    name: 'Ketokonazol %2 Şampuan',
    form: 'solution',
    category: 'dermatology',
    class: 'Topikal azol antifungal',
    defaultDose: 'Haftada 2×',
    defaultDuration: 'sürekli',
    indications: ['seborrheic-dermatitis'],
  },

  // ─────────── Ophthalmic / ENT drops ───────────
  {
    id: 'timolol-eye-drops',
    name: 'Timolol %0,5 Göz Damlası',
    form: 'solution',
    category: 'ophthalmic',
    class: 'Topikal β-bloker',
    defaultDose: 'Her iki göze 1 damla, 2×1',
    defaultDuration: 'sürekli',
    indications: ['primary-open-angle-glaucoma'],
    contraindications: ['asthma-chronic', 'copd-gold2'],
  },
  {
    id: 'latanoprost-eye-drops',
    name: 'Latanoprost %0,005 Göz Damlası',
    form: 'solution',
    category: 'ophthalmic',
    class: 'Prostaglandin analoğu',
    defaultDose: 'Gece her iki göze 1 damla',
    defaultDuration: 'sürekli',
    indications: ['primary-open-angle-glaucoma'],
  },
  {
    id: 'artificial-tears',
    name: 'Suni Gözyaşı',
    form: 'solution',
    category: 'ophthalmic',
    class: 'Göz yaşı damlası',
    defaultDose: 'Gerektiğinde 1 damla',
    defaultDuration: 'sürekli',
    indications: ['dry-eye', 'blepharitis', 'sjogrens'],
  },

  // ─────────── Urology ───────────
  {
    id: 'tamsulosin-04',
    name: 'Tamsulosin 0,4 mg',
    form: 'capsule',
    category: 'urology',
    class: 'α1-adrenerjik bloker',
    defaultDose: '1 kapsül, 1×1, PO',
    defaultDuration: 'sürekli',
    indications: ['bph-moderate', 'kidney-stone-5mm', 'nephrolithiasis-recurrent'],
    contraindications: ['orthostatic-hypotension'],
  },
  {
    id: 'finasteride-5',
    name: 'Finasterid 5 mg',
    form: 'tablet',
    category: 'urology',
    class: '5α-redüktaz inhibitörü',
    defaultDose: '1 tablet, 1×1, PO',
    defaultDuration: 'sürekli',
    indications: ['bph-moderate'],
  },
  {
    id: 'sildenafil-50',
    name: 'Sildenafil 50 mg',
    form: 'tablet',
    category: 'urology',
    class: 'PDE5 inhibitörü',
    defaultDose: 'İlişkiden 1 saat önce 1 tablet',
    defaultDuration: 'gerektiğinde',
    indications: ['erectile-dysfunction-organic'],
    contraindications: ['stable-angina'],
  },
  {
    id: 'solifenacin-5',
    name: 'Solifenasin 5 mg',
    form: 'tablet',
    category: 'urology',
    class: 'Antikolinerjik (M3 selektif)',
    defaultDose: '1 tablet, 1×1, PO',
    defaultDuration: 'sürekli',
    indications: ['overactive-bladder'],
    contraindications: ['bph-moderate'],
  },

  // ─────────── Rheumatology / bone ───────────
  {
    id: 'methotrexate-15',
    name: 'Metotreksat 15 mg',
    form: 'tablet',
    category: 'rheumatology',
    class: 'DMARD',
    defaultDose: '1 tablet, haftada bir, PO',
    defaultDuration: 'sürekli',
    indications: [
      'rheumatoid-arthritis-early',
      'plaque-psoriasis',
      'crohns-disease',
      'ulcerative-colitis',
      'sle',
    ],
    contraindications: ['chronic-hepatitis-b', 'chronic-hepatitis-c'],
  },
  {
    id: 'hydroxychloroquine-200',
    name: 'Hidroksiklorokin 200 mg',
    form: 'tablet',
    category: 'rheumatology',
    class: 'Antimalaryal DMARD',
    defaultDose: '1 tablet, 2×1, PO',
    defaultDuration: 'sürekli',
    indications: ['sle', 'rheumatoid-arthritis-early', 'sjogrens'],
  },
  {
    id: 'alendronate-70',
    name: 'Alendronat 70 mg',
    form: 'tablet',
    category: 'rheumatology',
    class: 'Bifosfonat',
    defaultDose: '1 tablet, haftada bir, aç karnına, PO',
    defaultDuration: 'sürekli',
    indications: ['osteoporosis-postmenopausal'],
    contraindications: ['gerd', 'peptic-ulcer-disease'],
  },
  {
    id: 'calcium-vitd',
    name: 'Kalsiyum 500 + D Vit3 1000 IU',
    form: 'tablet',
    category: 'hematology-nutrition',
    class: 'Mineral / vitamin',
    defaultDose: '1 tablet, 2×1, PO',
    defaultDuration: 'sürekli',
    indications: [
      'osteoporosis-postmenopausal',
      'vit-d-deficiency',
      'hyperparathyroidism-primary',
    ],
  },

  // ─────────── Vitamins / hematinics ───────────
  {
    id: 'ferrous-sulfate-325',
    name: 'Demir Sülfat 325 mg',
    form: 'tablet',
    category: 'hematology-nutrition',
    class: 'Oral demir',
    defaultDose: '1 tablet, 1×1, PO (C vitamini ile)',
    defaultDuration: '90 gün',
    indications: [
      'iron-deficiency-anemia',
      'iron-deficiency',
      'iron-deficiency-infant',
      'thalassemia-trait',
    ],
    contraindications: ['hereditary-hemochromatosis'],
  },
  {
    id: 'vitamin-b12-im',
    name: 'B12 Vitamini 1000 mcg',
    form: 'injection',
    category: 'hematology-nutrition',
    class: 'Kobalamin',
    defaultDose: 'Haftada bir 1 ampul IM',
    defaultDuration: '8 hafta',
    indications: ['b12-deficiency', 'b12-pernicious'],
  },
  {
    id: 'vitamin-d3-50k',
    name: 'D Vitamini 50.000 IU',
    form: 'capsule',
    category: 'hematology-nutrition',
    class: 'Kolekalsiferol',
    defaultDose: '1 kapsül, haftada bir, PO',
    defaultDuration: '8 hafta',
    indications: ['vit-d-deficiency', 'osteoporosis-postmenopausal'],
  },
  {
    id: 'folic-acid-5',
    name: 'Folik Asit 5 mg',
    form: 'tablet',
    category: 'hematology-nutrition',
    class: 'B9 vitamini',
    defaultDose: '1 tablet, 1×1, PO',
    defaultDuration: 'sürekli',
    indications: [
      'b12-deficiency',
      'b12-pernicious',
      'iron-deficiency-anemia',
      'normal-pregnancy-2nd-tri',
      'thalassemia-trait',
    ],
  },
  {
    id: 'thiamine-100',
    name: 'Tiamin 100 mg',
    form: 'tablet',
    category: 'hematology-nutrition',
    class: 'B1 vitamini',
    defaultDose: '1 tablet, 1×1, PO',
    defaultDuration: 'sürekli',
    indications: ['alcohol-use-disorder', 'chronic-fatigue'],
  },

  // ─────────── OB-GYN / menopause ───────────
  {
    id: 'combined-ocp',
    name: 'Kombine Oral Kontraseptif',
    form: 'tablet',
    category: 'obgyn',
    class: 'Östrojen + progestin',
    defaultDose: '1 tablet, 1×1, PO (28 günlük siklus)',
    defaultDuration: 'sürekli',
    indications: ['pcos', 'pcos-obgyn', 'endometriosis', 'menorrhagia-fibroids'],
    contraindications: ['normal-pregnancy-2nd-tri', 'dvt'],
  },
  {
    id: 'tranexamic-acid-500',
    name: 'Traneksamik Asit 500 mg',
    form: 'tablet',
    category: 'obgyn',
    class: 'Antifibrinolitik',
    defaultDose: '2 tablet, 3×1, PO (adet sırasında)',
    defaultDuration: '5 gün',
    indications: ['menorrhagia-fibroids'],
    contraindications: ['dvt'],
  },
  {
    id: 'estradiol-patch',
    name: 'Estradiol Transdermal 50 mcg/gün',
    form: 'cream',
    category: 'obgyn',
    class: 'Östrojen replasmanı',
    defaultDose: '1 bant, haftada 2×',
    defaultDuration: 'sürekli',
    indications: ['menopause-vasomotor'],
    contraindications: ['normal-pregnancy-2nd-tri', 'dvt'],
  },
];

/* ------------------------------------------------------------------ */
/*  Lookups                                                            */
/* ------------------------------------------------------------------ */

const MED_BY_ID: Record<string, Medication> = Object.fromEntries(
  MEDICATIONS.map((m) => [m.id, m]),
);

export function medicationById(id: string): Medication | undefined {
  return MED_BY_ID[id];
}

/** All therapeutic classes currently represented, in the canonical catalog
 *  order. Useful for grouping the picker list. */
export function medicationClasses(): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of MEDICATIONS) {
    if (!seen.has(m.class)) {
      seen.add(m.class);
      out.push(m.class);
    }
  }
  return out;
}

/** Human-readable label for each high-level therapeutic category. */
export const CATEGORY_LABELS: Record<MedicationCategory, string> = {
  antibiotic: 'Antibiotics',
  antiviral: 'Antivirals',
  antifungal: 'Antifungals',
  cardiovascular: 'Cardiovascular',
  'antiplatelet-anticoagulant': 'Antiplatelet / Anticoagulant',
  'lipid-lowering': 'Lipid-Lowering',
  endocrine: 'Endocrine & Diabetes',
  analgesic: 'Analgesic & NSAID',
  gastrointestinal: 'Gastrointestinal',
  respiratory: 'Asthma & COPD',
  allergy: 'Allergy & Antihistamine',
  neurology: 'Neurology',
  psychiatry: 'Psychiatry',
  rheumatology: 'Rheumatology & Bone',
  dermatology: 'Dermatology',
  ophthalmic: 'Ophthalmic',
  urology: 'Urology',
  obgyn: 'OB-GYN',
  'hematology-nutrition': 'Hematology & Vitamins',
};

/* ------------------------------------------------------------------ */
/*  Specialty scope — which therapeutic categories each polyclinic     */
/*  branch is allowed to prescribe from. Mirrors typical outpatient    */
/*  practice: internal medicine writes broadly, psychiatry writes      */
/*  psych drugs only, ophthalmology writes eye drops, etc.             */
/* ------------------------------------------------------------------ */

const ALL_CATEGORIES: MedicationCategory[] = [
  'antibiotic',
  'antiviral',
  'antifungal',
  'cardiovascular',
  'antiplatelet-anticoagulant',
  'lipid-lowering',
  'endocrine',
  'analgesic',
  'gastrointestinal',
  'respiratory',
  'allergy',
  'neurology',
  'psychiatry',
  'rheumatology',
  'dermatology',
  'ophthalmic',
  'urology',
  'obgyn',
  'hematology-nutrition',
];

export const SPECIALTY_MEDICATION_CATEGORIES: Record<ClinicId, MedicationCategory[]> = {
  'all-specialties': ALL_CATEGORIES,
  'internal-medicine': [
    'antibiotic', 'antiviral', 'antifungal', 'cardiovascular',
    'antiplatelet-anticoagulant', 'lipid-lowering', 'endocrine', 'analgesic',
    'gastrointestinal', 'respiratory', 'allergy', 'rheumatology', 'hematology-nutrition',
  ],
  cardiology: ['cardiovascular', 'antiplatelet-anticoagulant', 'lipid-lowering', 'analgesic'],
  neurology: ['neurology', 'analgesic', 'psychiatry'],
  neurosurgery: ['analgesic', 'antibiotic'],
  dermatology: ['dermatology', 'antifungal', 'antibiotic', 'allergy'],
  endocrinology: ['endocrine', 'lipid-lowering', 'cardiovascular', 'hematology-nutrition'],
  gastroenterology: ['gastrointestinal', 'antibiotic', 'analgesic'],
  pulmonology: ['respiratory', 'antibiotic', 'allergy', 'analgesic'],
  nephrology: ['cardiovascular', 'endocrine', 'hematology-nutrition', 'analgesic'],
  rheumatology: ['rheumatology', 'analgesic', 'antibiotic'],
  hematology: ['hematology-nutrition', 'antiplatelet-anticoagulant', 'antibiotic'],
  oncology: ['analgesic', 'antibiotic', 'antiviral', 'antifungal'],
  'infectious-disease': ['antibiotic', 'antiviral', 'antifungal'],
  'allergy-immunology': ['allergy', 'respiratory', 'dermatology'],
  psychiatry: ['psychiatry', 'neurology'],
  obgyn: ['obgyn', 'antibiotic', 'allergy', 'analgesic', 'hematology-nutrition'],
  urology: ['urology', 'antibiotic', 'analgesic'],
  ophthalmology: ['ophthalmic', 'antibiotic', 'allergy'],
  ent: ['antibiotic', 'allergy', 'analgesic', 'respiratory'],
  orthopedics: ['analgesic', 'rheumatology', 'antibiotic'],
  pmr: ['analgesic', 'rheumatology', 'neurology'],
  pediatrics: [
    'antibiotic', 'antiviral', 'respiratory', 'allergy',
    'gastrointestinal', 'analgesic', 'dermatology', 'hematology-nutrition',
  ],
  'general-surgery': ['antibiotic', 'analgesic', 'gastrointestinal', 'antiplatelet-anticoagulant'],
  'cardiothoracic-vascular-surgery': [
    'cardiovascular', 'antiplatelet-anticoagulant', 'antibiotic', 'analgesic', 'lipid-lowering',
  ],
};

export function isCategoryAllowedForSpecialty(
  category: MedicationCategory,
  specialty: ClinicId,
): boolean {
  return SPECIALTY_MEDICATION_CATEGORIES[specialty].includes(category);
}

/** Canonical display order for the top-level therapeutic categories. */
const CATEGORY_ORDER: MedicationCategory[] = [
  'antibiotic',
  'antiviral',
  'antifungal',
  'cardiovascular',
  'antiplatelet-anticoagulant',
  'lipid-lowering',
  'endocrine',
  'analgesic',
  'gastrointestinal',
  'respiratory',
  'allergy',
  'neurology',
  'psychiatry',
  'rheumatology',
  'dermatology',
  'ophthalmic',
  'urology',
  'obgyn',
  'hematology-nutrition',
];

/** Categories that actually appear in MEDICATIONS, in canonical display order. */
export function medicationCategories(): MedicationCategory[] {
  const present = new Set<MedicationCategory>(MEDICATIONS.map((m) => m.category));
  return CATEGORY_ORDER.filter((c) => present.has(c));
}

/** Suggest the single most specific drug for a diagnosis — used by the
 *  grader to tell the doctor what they missed if they submitted nothing. */
function suggestFor(diagnosisId: string): Medication | undefined {
  // Prefer drugs whose indications list this diagnosis AND which are NOT a
  // generic analgesic/antihistamine so we steer the user to specific Rx.
  const specific = MEDICATIONS.find(
    (m) =>
      m.indications.includes(diagnosisId) &&
      !['Analgesic / antipyretic', 'NSAID', '2nd-gen H1 antihistamine'].includes(m.class),
  );
  if (specific) return specific;
  return MEDICATIONS.find((m) => m.indications.includes(diagnosisId));
}

/* ------------------------------------------------------------------ */
/*  Grading                                                            */
/* ------------------------------------------------------------------ */

export interface PrescriptionGrade {
  /** Net points awarded / penalised. */
  score: number;
  /** Medication IDs that were clinically appropriate. */
  correct: string[];
  /** Medication IDs that were either contraindicated or unrelated. */
  wrong: string[];
  /** Human-readable suggestion of one key drug they should have prescribed. */
  missingSuggestion?: string;
  /** Human-readable feedback lines, one per point. */
  notes: string[];
}

/**
 * Grade a prescription:
 *   +30 per correctly-indicated drug (capped at +60)
 *   −20 per contraindicated drug
 *    −5 per unrelated drug (not indicated, not explicitly bad)
 *     0 if nothing prescribed (but mention what they missed)
 */
export function gradePrescription(
  diagnosisId: string,
  prescribedIds: string[],
): PrescriptionGrade {
  const correct: string[] = [];
  const wrong: string[] = [];
  const notes: string[] = [];

  // Deduplicate — if the user accidentally added the same drug twice, count
  // it once. Preserves the first-seen order.
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const id of prescribedIds) {
    if (!seen.has(id)) {
      seen.add(id);
      unique.push(id);
    }
  }

  if (unique.length === 0) {
    const suggestion = suggestFor(diagnosisId);
    return {
      score: 0,
      correct: [],
      wrong: [],
      missingSuggestion: suggestion?.id,
      notes: suggestion
        ? [`Reçete yazılmadı. Bu tanı için ${suggestion.name} düşünülebilir.`]
        : ['Reçete yazılmadı; bu tanı için endike bir ilaç da yok.'],
    };
  }

  let correctCount = 0;
  let contraindicatedCount = 0;
  let unrelatedCount = 0;

  for (const id of unique) {
    const med = medicationById(id);
    if (!med) {
      // Unknown ID — treat as unrelated and note it.
      unrelatedCount += 1;
      wrong.push(id);
      notes.push(`Bilinmeyen ilaç "${id}" — tedavi açısından dikkate alınmadı.`);
      continue;
    }
    const isContraindicated = med.contraindications?.includes(diagnosisId) ?? false;
    const isIndicated = med.indications.includes(diagnosisId);

    if (isContraindicated) {
      contraindicatedCount += 1;
      wrong.push(id);
      notes.push(`⚠ ${med.name} bu tanıda KONTRENDİKE. −20`);
    } else if (isIndicated) {
      correctCount += 1;
      correct.push(id);
      notes.push(`✓ ${med.name} — uygun seçim. +30`);
    } else {
      unrelatedCount += 1;
      wrong.push(id);
      notes.push(`~ ${med.name} bu tanı için endike değil. −5`);
    }
  }

  // Apply score with the +60 cap on correct credit.
  const correctPoints = Math.min(correctCount, 2) * 30;
  const contraPenalty = contraindicatedCount * 20;
  const unrelatedPenalty = unrelatedCount * 5;
  const score = correctPoints - contraPenalty - unrelatedPenalty;

  if (correctCount > 2) {
    notes.push(
      `(Bonus sınırlandı: ${correctCount} uygun ilaç var, ancak yalnızca ilk 2 tanesi +30 katkı sağlıyor.)`,
    );
  }

  // If they prescribed nothing correct, nudge them toward a canonical drug.
  let missingSuggestion: string | undefined;
  if (correctCount === 0) {
    const suggestion = suggestFor(diagnosisId);
    if (suggestion && !unique.includes(suggestion.id)) {
      missingSuggestion = suggestion.id;
      notes.push(`Bu tanı için ${suggestion.name} düşünülebilir.`);
    }
  }

  return { score, correct, wrong, missingSuggestion, notes };
}
