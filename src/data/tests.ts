import type { Test } from '../game/types';
import type { ClinicId } from '../game/clinic';

export const TESTS: Test[] = [
  // ───────── Bedside ─────────
  { id: 'glucose',    name: 'Yatak Başı Glukozu',          category: 'bedside', turnaroundSec: 15 },
  { id: 'peak-flow',  name: 'Tepe Akımı',                category: 'bedside', turnaroundSec: 15 },
  { id: 'urine-hcg',  name: 'İdrar β-hCG (gebelik)',  category: 'bedside', turnaroundSec: 18 },
  { id: 'ecg',        name: 'EKG (12 derivasyonlu)',            category: 'bedside', turnaroundSec: 20 },
  { id: 'strep-radt', name: 'Hızlı Strep Antijeni',      category: 'bedside', turnaroundSec: 20 },
  { id: 'flu-swab',   name: 'Hızlı İnfluenza Sürüntüsü',     category: 'bedside', turnaroundSec: 25 },
  { id: 'covid-swab', name: 'Hızlı COVID-19 Swabı',      category: 'bedside', turnaroundSec: 25 },
  { id: 'pocus',      name: 'Yatak Başı Ultrasonografi (POCUS)', category: 'bedside', turnaroundSec: 30 },

  // ───────── Lab — hematology / chemistry ─────────
  { id: 'abg',        name: 'Arteriyel Kan Gazı',       category: 'lab', turnaroundSec: 20 },
  { id: 'lactate',    name: 'Laktat',                  category: 'lab', turnaroundSec: 25 },
  { id: 'cbc',        name: 'Tam Kan Sayımı (CBC)',      category: 'lab', turnaroundSec: 30 },
  { id: 'bmp',        name: 'Temel Metabolik Panel',    category: 'lab', turnaroundSec: 30 },
  { id: 'lft',        name: 'Karaciğer Fonksiyonu (KFT)',     category: 'lab', turnaroundSec: 35 },
  { id: 'lipase',     name: 'Lipaz',                   category: 'lab', turnaroundSec: 30 },
  { id: 'coag',       name: 'Pıhtılaşma (PT/PTT/INR)', category: 'lab', turnaroundSec: 30 },
  { id: 'bnp',        name: 'BNP',                      category: 'lab', turnaroundSec: 35 },
  { id: 'dimer',      name: 'D-Dimer',                  category: 'lab', turnaroundSec: 35 },
  { id: 'troponin',   name: 'Yüksek Duyarlılıklı Troponin', category: 'lab', turnaroundSec: 40 },
  { id: 'tsh',        name: 'TSH',                      category: 'lab', turnaroundSec: 45 },
  { id: 'type-screen',name: 'Kan Grubu ve Crossmatch',            category: 'lab', turnaroundSec: 45 },
  { id: 'urine',      name: 'İdrar tahlili',               category: 'lab', turnaroundSec: 25 },
  { id: 'urine-cx',   name: 'İdrar Kültürü',            category: 'lab', turnaroundSec: 60 },
  { id: 'blood-cx',   name: 'Kan Kültürleri (×2)',      category: 'lab', turnaroundSec: 75 },
  { id: 'utox',       name: 'İdrar Toksikoloji Taraması',  category: 'lab', turnaroundSec: 40 },

  // ───────── Lab — endocrine / metabolic ─────────
  { id: 'hba1c',      name: 'Hemoglobin A1c',           category: 'lab', turnaroundSec: 45 },
  { id: 'lipid',      name: 'Lipid Paneli',              category: 'lab', turnaroundSec: 45 },
  { id: 'vit-d',      name: 'D Vitamini (25-OH)',        category: 'lab', turnaroundSec: 50 },
  { id: 'b12',        name: 'B12 Vitamini / Folat',     category: 'lab', turnaroundSec: 50 },
  { id: 'iron',       name: 'Demir Tetkikleri (Fe/TIBC/ferritin)', category: 'lab', turnaroundSec: 50 },
  { id: 'ferritin',   name: 'Ferritin',                 category: 'lab', turnaroundSec: 45 },
  { id: 'free-t4',    name: 'Serbest T4 / Serbest T3',        category: 'lab', turnaroundSec: 50 },
  { id: 'cortisol',   name: 'Sabah Kortizolü',         category: 'lab', turnaroundSec: 60 },
  { id: 'beta-hcg-q', name: 'β-hCG (kantitatif serum)', category: 'lab', turnaroundSec: 35 },
  { id: 'psa',        name: 'PSA',                      category: 'lab', turnaroundSec: 50 },

  // ───────── Lab — inflammation / infection ─────────
  { id: 'crp',        name: 'CRP',                      category: 'lab', turnaroundSec: 30 },
  { id: 'esr',        name: 'ESR',                      category: 'lab', turnaroundSec: 30 },
  { id: 'procal',     name: 'Prokalsitonin',            category: 'lab', turnaroundSec: 40 },
  { id: 'hiv',        name: 'HIV 4. nesil Ag/Ab',        category: 'lab', turnaroundSec: 70 },
  { id: 'hep-b',      name: 'Hepatit B Serolojisi',     category: 'lab', turnaroundSec: 75 },
  { id: 'hep-c',      name: 'Hepatit C Antikoru',     category: 'lab', turnaroundSec: 75 },
  { id: 'rpr',        name: 'RPR / VDRL (sifiliz)',    category: 'lab', turnaroundSec: 60 },

  // ───────── Lab — autoimmune (rheumatology) ─────────
  { id: 'ana',        name: 'ANA',                      category: 'lab', turnaroundSec: 80 },
  { id: 'rf',         name: 'Romatoid Faktör',        category: 'lab', turnaroundSec: 70 },
  { id: 'anti-ccp',   name: 'Anti-CCP',                 category: 'lab', turnaroundSec: 80 },
  { id: 'dsdna',      name: 'Anti-dsDNA',               category: 'lab', turnaroundSec: 80 },
  { id: 'c3-c4',      name: 'Kompleman C3 / C4',       category: 'lab', turnaroundSec: 70 },

  // ───────── Lab — stool ─────────
  { id: 'stool-cx',   name: 'Dışkı Kültürü',            category: 'lab', turnaroundSec: 70 },
  { id: 'fobt',       name: 'Gaitada Gizli Kan',       category: 'lab', turnaroundSec: 30 },
  { id: 'calpro',     name: 'Dışkı Kalprotektin',       category: 'lab', turnaroundSec: 60 },
  { id: 'h-pylori',   name: 'H. pylori Dışkı Antijeni',  category: 'lab', turnaroundSec: 55 },

  // ───────── Lab — psych drug levels ─────────
  { id: 'lithium',    name: 'Lityum Düzeyi',            category: 'lab', turnaroundSec: 45 },
  { id: 'valproate',  name: 'Valproat Düzeyi',          category: 'lab', turnaroundSec: 45 },

  // ───────── Imaging — X-ray ─────────
  { id: 'cxr',        name: 'Akciğer Grafisi',              category: 'imaging', turnaroundSec: 40 },
  { id: 'kub',        name: 'Direkt Karın Grafisi (KUB)',    category: 'imaging', turnaroundSec: 40 },
  { id: 'xr-extrem',  name: 'Ekstremite Grafisi',          category: 'imaging', turnaroundSec: 35 },
  { id: 'xr-spine',   name: 'Omurga Grafisi',              category: 'imaging', turnaroundSec: 40 },
  { id: 'xr-pelvis',  name: 'Pelvis Grafisi',             category: 'imaging', turnaroundSec: 40 },

  // ───────── Imaging — Ultrasound / Echo ─────────
  { id: 'us-abdomen', name: 'Karın Ultrasonografisi',      category: 'imaging', turnaroundSec: 50 },
  { id: 'us-pelvis',  name: 'Pelvik Ultrasonografi',         category: 'imaging', turnaroundSec: 50 },
  { id: 'echo',       name: 'Kardiyak Eko (TTE)',        category: 'imaging', turnaroundSec: 70 },

  // ───────── Imaging — CT ─────────
  { id: 'ct-head',    name: 'Beyin BT (kontrastsız)',    category: 'imaging', turnaroundSec: 60 },
  { id: 'ct-chest',   name: 'Toraks BT',                  category: 'imaging', turnaroundSec: 65 },
  { id: 'ct-angio',   name: 'Toraks BT Anjiyografisi (PE)',  category: 'imaging', turnaroundSec: 70 },
  { id: 'ct-abdomen', name: 'Karın / Pelvis BT',       category: 'imaging', turnaroundSec: 75 },
  { id: 'ct-cspine',  name: 'Servikal BT',         category: 'imaging', turnaroundSec: 60 },

  // ───────── Imaging — MRI ─────────
  { id: 'mri-brain',  name: 'Beyin MRG',                 category: 'imaging', turnaroundSec: 120 },
  { id: 'mri-cspine', name: 'Servikal MRG',        category: 'imaging', turnaroundSec: 110 },
  { id: 'mri-lspine', name: 'Lomber Omurga MRG',          category: 'imaging', turnaroundSec: 110 },
  { id: 'mri-abd',    name: 'Karın MRG (MRCP)',        category: 'imaging', turnaroundSec: 130 },

  // ───────── Imaging / functional — specialty ─────────
  { id: 'dexa',       name: 'DEXA Kemik Yoğunluğu',         category: 'imaging', turnaroundSec: 70 },
  { id: 'mammogram',  name: 'Mamografi',                 category: 'imaging', turnaroundSec: 65 },
  { id: 'oct',        name: 'OCT (retina)',              category: 'imaging', turnaroundSec: 50 },
  { id: 'visual-field', name: 'Görme Alanı Testi',       category: 'imaging', turnaroundSec: 55 },
  { id: 'fundoscopy', name: 'Dilate Fundus Muayenesi',        category: 'bedside', turnaroundSec: 30 },
  { id: 'audiometry', name: 'Odyometri',                category: 'bedside', turnaroundSec: 35 },
  { id: 'eeg',        name: 'EEG',                       category: 'bedside', turnaroundSec: 90 },
  { id: 'emg-ncs',    name: 'EMG / Sinir İletimi',    category: 'bedside', turnaroundSec: 80 },
  { id: 'spirometry', name: 'Solunum Fonksiyonu (SFT)',  category: 'bedside', turnaroundSec: 50 },
  { id: 'pap-smear',  name: 'Pap / HPV Ko-testi',         category: 'bedside', turnaroundSec: 60 },
  { id: 'skin-biopsy',name: 'Cilt Biyopsisi',               category: 'bedside', turnaroundSec: 90 },
];

export const testById = (id: string) => TESTS.find((t) => t.id === id);

// Convenience panels — fire several tests with one click.
//
// `clinicIds` scopes a panel to the polyclinic view. ED panels omit it and
// therefore only appear in the ER flow (`PatientPanel.tsx`). Polyclinic
// panels list every specialty they apply to; the polyclinic view filters
// `TEST_PANELS` by the current clinic.
export interface TestPanel {
  id: string;
  label: string;
  description: string;
  testIds: string[];
  clinicIds?: ClinicId[];
}

export const TEST_PANELS: TestPanel[] = [
  // ───────── ED panels (no clinicIds → ER-only) ─────────
  {
    id: 'routine-labs',
    label: 'Routine Labs',
    description: 'CBC, BMP, Coagulation',
    testIds: ['cbc', 'bmp', 'coag'],
  },
  {
    id: 'chest-pain',
    label: 'Chest Pain Workup',
    description: 'ECG, Troponin, CXR, D-Dimer, BMP, CBC',
    testIds: ['ecg', 'troponin', 'cxr', 'dimer', 'bmp', 'cbc'],
  },
  {
    id: 'sepsis',
    label: 'Sepsis Workup',
    description: 'CBC, BMP, Lactate, Blood cultures, UA, UCx',
    testIds: ['cbc', 'bmp', 'lactate', 'blood-cx', 'urine', 'urine-cx'],
  },
  {
    id: 'abdominal',
    label: 'Abdominal Workup',
    description: 'CBC, BMP, LFT, Lipase, UA, US abdomen',
    testIds: ['cbc', 'bmp', 'lft', 'lipase', 'urine', 'us-abdomen'],
  },
  {
    id: 'stroke',
    label: 'Stroke Workup',
    description: 'CT Head, ECG, CBC, BMP, Coag, Glucose',
    testIds: ['ct-head', 'ecg', 'cbc', 'bmp', 'coag', 'glucose'],
  },
  {
    id: 'trauma',
    label: 'Trauma Panel',
    description: 'CBC, BMP, Coag, Type & Screen, Lactate, CXR, Pelvis',
    testIds: ['cbc', 'bmp', 'coag', 'type-screen', 'lactate', 'cxr', 'xr-pelvis'],
  },

  // ───────── Polyclinic — shared across multiple specialties ─────────
  {
    id: 'basic-metabolic-workup',
    label: 'Basic Metabolic Workup',
    description: 'CBC, BMP, TSH',
    testIds: ['cbc', 'bmp', 'tsh'],
    clinicIds: ['internal-medicine', 'endocrinology', 'nephrology', 'hematology', 'psychiatry', 'pediatrics'],
  },
  {
    id: 'general-screening-labs',
    label: 'General Screening Labs',
    description: 'CBC, BMP, LFT, TSH, Urinalysis',
    testIds: ['cbc', 'bmp', 'lft', 'tsh', 'urine'],
    clinicIds: ['internal-medicine', 'endocrinology', 'rheumatology'],
  },
  {
    id: 'uti-workup',
    label: 'UTI Workup',
    description: 'Urinalysis, Urine culture',
    testIds: ['urine', 'urine-cx'],
    clinicIds: ['internal-medicine', 'urology', 'nephrology', 'obgyn', 'infectious-disease', 'pediatrics'],
  },
  {
    id: 'preop-clearance',
    label: 'Pre-Op Clearance',
    description: 'CBC, BMP, Coag, Type & Screen, ECG, CXR',
    testIds: ['cbc', 'bmp', 'coag', 'type-screen', 'ecg', 'cxr'],
    clinicIds: ['general-surgery', 'orthopedics', 'urology', 'obgyn', 'cardiology'],
  },

  // ───────── Internal Medicine ─────────
  {
    id: 'im-annual-physical',
    label: 'Annual Physical Labs',
    description: 'CBC, BMP, LFT, Lipase, TSH, Urinalysis',
    testIds: ['cbc', 'bmp', 'lft', 'lipase', 'tsh', 'urine'],
    clinicIds: ['internal-medicine'],
  },
  {
    id: 'im-fatigue-workup',
    label: 'Fatigue Workup',
    description: 'CBC, BMP, TSH, LFT, Glucose',
    testIds: ['cbc', 'bmp', 'tsh', 'lft', 'glucose'],
    clinicIds: ['internal-medicine'],
  },

  // ───────── Cardiology ─────────
  {
    id: 'cards-new-patient',
    label: 'Cardiology New Patient',
    description: 'ECG, BNP, Troponin, BMP, CBC',
    testIds: ['ecg', 'bnp', 'troponin', 'bmp', 'cbc'],
    clinicIds: ['cardiology'],
  },
  {
    id: 'cards-heart-failure',
    label: 'Heart Failure Workup',
    description: 'BNP, Echo, ECG, BMP, CXR',
    testIds: ['bnp', 'echo', 'ecg', 'bmp', 'cxr'],
    clinicIds: ['cardiology'],
  },
  {
    id: 'cards-chest-pain-outpt',
    label: 'Outpatient Chest Pain',
    description: 'ECG, Troponin, CXR, Echo',
    testIds: ['ecg', 'troponin', 'cxr', 'echo'],
    clinicIds: ['cardiology', 'internal-medicine'],
  },

  // ───────── Neurology ─────────
  {
    id: 'neuro-headache-workup',
    label: 'Headache Workup',
    description: 'MRI Brain, CBC, BMP',
    testIds: ['mri-brain', 'cbc', 'bmp'],
    clinicIds: ['neurology'],
  },
  {
    id: 'neuro-back-pain',
    label: 'Back / Radiculopathy',
    description: 'MRI L-spine, X-ray spine',
    testIds: ['mri-lspine', 'xr-spine'],
    clinicIds: ['neurology', 'orthopedics'],
  },
  {
    id: 'neuro-neck-pain',
    label: 'Neck / Cervical Workup',
    description: 'MRI C-spine, X-ray spine',
    testIds: ['mri-cspine', 'xr-spine'],
    clinicIds: ['neurology', 'orthopedics'],
  },

  // ───────── Dermatology ─────────
  {
    id: 'derm-systemic-rash',
    label: 'Systemic Rash Workup',
    description: 'CBC, LFT, BMP',
    testIds: ['cbc', 'lft', 'bmp'],
    clinicIds: ['dermatology'],
  },

  // ───────── Endocrinology ─────────
  {
    id: 'endo-diabetes-followup',
    label: 'Diabetes Follow-Up',
    description: 'Glucose, BMP, Urinalysis',
    testIds: ['glucose', 'bmp', 'urine'],
    clinicIds: ['endocrinology', 'internal-medicine'],
  },
  {
    id: 'endo-thyroid-workup',
    label: 'Thyroid Workup',
    description: 'TSH, CBC, BMP',
    testIds: ['tsh', 'cbc', 'bmp'],
    clinicIds: ['endocrinology'],
  },

  // ───────── Gastroenterology ─────────
  {
    id: 'gi-abdominal-workup',
    label: 'Abdominal Workup',
    description: 'CBC, BMP, LFT, Lipase, US abdomen',
    testIds: ['cbc', 'bmp', 'lft', 'lipase', 'us-abdomen'],
    clinicIds: ['gastroenterology', 'general-surgery'],
  },
  {
    id: 'gi-liver-workup',
    label: 'Liver Workup',
    description: 'LFT, Coag, CBC, US abdomen, MRCP',
    testIds: ['lft', 'coag', 'cbc', 'us-abdomen', 'mri-abd'],
    clinicIds: ['gastroenterology'],
  },

  // ───────── Pulmonology ─────────
  {
    id: 'pulm-dyspnea-workup',
    label: 'Dyspnea Workup',
    description: 'CXR, Peak flow, ABG, BNP, CBC',
    testIds: ['cxr', 'peak-flow', 'abg', 'bnp', 'cbc'],
    clinicIds: ['pulmonology'],
  },
  {
    id: 'pulm-chronic-cough',
    label: 'Chronic Cough Workup',
    description: 'CXR, CT chest, CBC, Peak flow',
    testIds: ['cxr', 'ct-chest', 'cbc', 'peak-flow'],
    clinicIds: ['pulmonology'],
  },

  // ───────── Nephrology ─────────
  {
    id: 'neph-renal-workup',
    label: 'Renal Workup',
    description: 'BMP, CBC, Urinalysis, US abdomen',
    testIds: ['bmp', 'cbc', 'urine', 'us-abdomen'],
    clinicIds: ['nephrology'],
  },
  {
    id: 'neph-stone-workup',
    label: 'Kidney Stone Workup',
    description: 'BMP, Urinalysis, KUB, CT abdomen',
    testIds: ['bmp', 'urine', 'kub', 'ct-abdomen'],
    clinicIds: ['nephrology', 'urology'],
  },

  // ───────── Rheumatology ─────────
  {
    id: 'rheum-joint-workup',
    label: 'Joint / Arthritis Workup',
    description: 'CBC, BMP, LFT, Urinalysis, X-ray extremity',
    testIds: ['cbc', 'bmp', 'lft', 'urine', 'xr-extrem'],
    clinicIds: ['rheumatology'],
  },
  {
    id: 'rheum-systemic-workup',
    label: 'Systemic Disease Workup',
    description: 'CBC, BMP, LFT, Urinalysis, CXR',
    testIds: ['cbc', 'bmp', 'lft', 'urine', 'cxr'],
    clinicIds: ['rheumatology'],
  },

  // ───────── Hematology ─────────
  {
    id: 'heme-anemia-workup',
    label: 'Anemia Workup',
    description: 'CBC, BMP, LFT',
    testIds: ['cbc', 'bmp', 'lft'],
    clinicIds: ['hematology'],
  },
  {
    id: 'heme-coag-workup',
    label: 'Coagulopathy Workup',
    description: 'CBC, Coag, LFT, Type & Screen',
    testIds: ['cbc', 'coag', 'lft', 'type-screen'],
    clinicIds: ['hematology'],
  },

  // ───────── Infectious Disease ─────────
  {
    id: 'id-fever-workup',
    label: 'Fever Workup',
    description: 'CBC, BMP, LFT, Blood cx, Urinalysis, Urine cx, CXR',
    testIds: ['cbc', 'bmp', 'lft', 'blood-cx', 'urine', 'urine-cx', 'cxr'],
    clinicIds: ['infectious-disease'],
  },
  {
    id: 'id-respiratory-viral',
    label: 'Respiratory Viral Panel',
    description: 'Flu swab, COVID swab, Strep RADT, CXR',
    testIds: ['flu-swab', 'covid-swab', 'strep-radt', 'cxr'],
    clinicIds: ['infectious-disease', 'internal-medicine', 'pediatrics'],
  },

  // ───────── Allergy / Immunology ─────────
  {
    id: 'allergy-baseline',
    label: 'Allergy Baseline Labs',
    description: 'CBC, Peak flow',
    testIds: ['cbc', 'peak-flow'],
    clinicIds: ['allergy-immunology'],
  },

  // ───────── Psychiatry ─────────
  {
    id: 'psych-med-baseline',
    label: 'Psych Med Baseline',
    description: 'CBC, BMP, TSH, LFT',
    testIds: ['cbc', 'bmp', 'tsh', 'lft'],
    clinicIds: ['psychiatry'],
  },
  {
    id: 'psych-altered-mental',
    label: 'Altered Mental Status',
    description: 'BMP, TSH, Glucose, Urine tox',
    testIds: ['bmp', 'tsh', 'glucose', 'utox'],
    clinicIds: ['psychiatry'],
  },

  // ───────── OB/GYN ─────────
  {
    id: 'obgyn-pregnancy-workup',
    label: 'Pregnancy Workup',
    description: 'Urine β-hCG, CBC, BMP, Pelvic US',
    testIds: ['urine-hcg', 'cbc', 'bmp', 'us-pelvis'],
    clinicIds: ['obgyn'],
  },
  {
    id: 'obgyn-pelvic-pain',
    label: 'Pelvic Pain Workup',
    description: 'Urine β-hCG, Urinalysis, Pelvic US, CBC',
    testIds: ['urine-hcg', 'urine', 'us-pelvis', 'cbc'],
    clinicIds: ['obgyn'],
  },

  // ───────── Urology ─────────
  {
    id: 'uro-hematuria-workup',
    label: 'Hematuria Workup',
    description: 'Urinalysis, Urine cx, BMP, CT abdomen',
    testIds: ['urine', 'urine-cx', 'bmp', 'ct-abdomen'],
    clinicIds: ['urology'],
  },
  {
    id: 'uro-prostate-workup',
    label: 'Prostate / LUTS Workup',
    description: 'Urinalysis, BMP, CBC',
    testIds: ['urine', 'bmp', 'cbc'],
    clinicIds: ['urology'],
  },

  // ───────── Ophthalmology ─────────
  {
    id: 'ophth-vision-workup',
    label: 'Vision Loss Workup',
    description: 'Glucose, BMP, MRI Brain',
    testIds: ['glucose', 'bmp', 'mri-brain'],
    clinicIds: ['ophthalmology'],
  },

  // ───────── ENT ─────────
  {
    id: 'ent-sore-throat',
    label: 'Sore Throat Workup',
    description: 'Strep RADT, Flu swab, COVID swab, CBC',
    testIds: ['strep-radt', 'flu-swab', 'covid-swab', 'cbc'],
    clinicIds: ['ent'],
  },
  {
    id: 'ent-neck-mass',
    label: 'Neck Mass Workup',
    description: 'CBC, TSH, CT chest, US abdomen',
    testIds: ['cbc', 'tsh', 'ct-chest', 'us-abdomen'],
    clinicIds: ['ent'],
  },

  // ───────── Orthopedics ─────────
  {
    id: 'ortho-extremity-injury',
    label: 'Extremity Injury',
    description: 'X-ray extremity, CBC',
    testIds: ['xr-extrem', 'cbc'],
    clinicIds: ['orthopedics'],
  },
  {
    id: 'ortho-joint-pain',
    label: 'Joint Pain Workup',
    description: 'X-ray extremity, CBC, BMP',
    testIds: ['xr-extrem', 'cbc', 'bmp'],
    clinicIds: ['orthopedics'],
  },

  // ───────── Pediatrics ─────────
  {
    id: 'peds-fever',
    label: 'Pediatric Fever',
    description: 'CBC, BMP, Urinalysis, Strep RADT, Flu swab',
    testIds: ['cbc', 'bmp', 'urine', 'strep-radt', 'flu-swab'],
    clinicIds: ['pediatrics'],
  },
  {
    id: 'peds-wheeze',
    label: 'Pediatric Wheeze',
    description: 'Peak flow, CXR, COVID swab, Flu swab',
    testIds: ['peak-flow', 'cxr', 'covid-swab', 'flu-swab'],
    clinicIds: ['pediatrics'],
  },

  // ───────── General Surgery ─────────
  {
    id: 'surg-rlq-workup',
    label: 'RLQ / Appendicitis Workup',
    description: 'CBC, BMP, Urinalysis, Urine β-hCG, CT abdomen',
    testIds: ['cbc', 'bmp', 'urine', 'urine-hcg', 'ct-abdomen'],
    clinicIds: ['general-surgery'],
  },
  {
    id: 'surg-hernia-workup',
    label: 'Hernia / Mass Workup',
    description: 'CBC, BMP, US abdomen',
    testIds: ['cbc', 'bmp', 'us-abdomen'],
    clinicIds: ['general-surgery'],
  },
];
