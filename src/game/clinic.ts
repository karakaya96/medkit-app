// Polyclinic (outpatient) specialty identifiers.
//
// These IDs key both patient rosters (`POLYCLINIC_CASES`) and UI labels.
// Kept in a separate module so the store, 3D scene, HUD view, and the
// patient-data file (owned by another agent) can all import from a
// single location without a circular dependency.

export type ClinicId =
  | 'all-specialties'
  | 'internal-medicine'
  | 'cardiology'
  | 'neurology'
  | 'neurosurgery'
  | 'dermatology'
  | 'endocrinology'
  | 'gastroenterology'
  | 'pulmonology'
  | 'nephrology'
  | 'rheumatology'
  | 'hematology'
  | 'oncology'
  | 'infectious-disease'
  | 'allergy-immunology'
  | 'psychiatry'
  | 'obgyn'
  | 'urology'
  | 'ophthalmology'
  | 'ent'
  | 'orthopedics'
  | 'pmr'
  | 'pediatrics'
  | 'general-surgery'
  | 'cardiothoracic-vascular-surgery';

/** Display order — also used by the specialty selector UI. The first entry
 *  is the "mixed" option that pulls cases from every specialty, so the
 *  doctor sees a rapid variety of demographics (kids, elderly, men, women)
 *  without having to switch clinics manually. */
export const CLINIC_IDS: ClinicId[] = [
  'all-specialties',
  'internal-medicine',
  'cardiology',
  'neurology',
  'neurosurgery',
  'dermatology',
  'endocrinology',
  'gastroenterology',
  'pulmonology',
  'nephrology',
  'rheumatology',
  'hematology',
  'oncology',
  'infectious-disease',
  'allergy-immunology',
  'psychiatry',
  'obgyn',
  'urology',
  'ophthalmology',
  'ent',
  'orthopedics',
  'pmr',
  'pediatrics',
  'general-surgery',
  'cardiothoracic-vascular-surgery',
];

/** Türkçe branş etiketleri. */
export const CLINIC_LABELS: Record<ClinicId, string> = {
  'all-specialties': 'Tüm Branşlar (karışık)',
  'internal-medicine': 'İç Hastalıkları',
  cardiology: 'Kardiyoloji',
  neurology: 'Nöroloji',
  neurosurgery: 'Beyin ve Sinir Cerrahisi',
  dermatology: 'Dermatoloji',
  endocrinology: 'Endokrinoloji',
  gastroenterology: 'Gastroenteroloji',
  pulmonology: 'Göğüs Hastalıkları',
  nephrology: 'Nefroloji',
  rheumatology: 'Romatoloji',
  hematology: 'Hematoloji',
  oncology: 'Onkoloji',
  'infectious-disease': 'Enfeksiyon Hastalıkları',
  'allergy-immunology': 'Alerji ve İmmünoloji',
  psychiatry: 'Psikiyatri',
  obgyn: 'Kadın Hastalıkları ve Doğum',
  urology: 'Üroloji',
  ophthalmology: 'Göz Hastalıkları',
  ent: 'Kulak Burun Boğaz',
  orthopedics: 'Ortopedi',
  pmr: 'Fiziksel Tıp ve Rehabilitasyon',
  pediatrics: 'Pediatri',
  'general-surgery': 'Genel Cerrahi',
  'cardiothoracic-vascular-surgery': 'Kalp Damar Cerrahisi',
};

export const DEFAULT_CLINIC: ClinicId = 'internal-medicine';
