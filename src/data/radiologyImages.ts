/**
 * Radiology image catalog.
 *
 * All images are sourced from Wikimedia Commons under CC0 / CC-BY / CC-BY-SA
 * (or US-government public domain). URLs have been spot-checked for a 200
 * response. We always link to the direct `upload.wikimedia.org` file URL so
 * the viewer can render an <img>; the Wikimedia Commons *page* URL is not
 * suitable as an `src`.
 *
 * Selection rules (see getImagingExamples below):
 *   - testId + abnormal=false  → one "normal" reference image
 *   - testId + abnormal=true   → one image picked from the test's abnormal
 *     pool, preferring images that match the case's diagnosisId when
 *     available (e.g. a "pneumonia" diagnosis pulls a pneumonia CXR).
 *   - ECG and imaging that are "bedside" by category are also supported
 *     (ecg gets a rhythm strip).
 *
 * If you add new imagery:
 *   1. Confirm the Commons file page lists a CC0 / CC-BY / CC-BY-SA license.
 *   2. Copy the full "Original file" URL under `upload.wikimedia.org/...`
 *      — it must end in .jpg / .jpeg / .png / .gif / .svg.
 *   3. Add an attribution string in the format "Source · Author · License".
 */

export interface ImagingImage {
  /** Direct image URL. Must end in .jpg / .jpeg / .png / .gif / .svg. */
  url: string;
  /** Short caption rendered under the image. */
  caption: string;
  /** Attribution — "Source · Author · License". */
  credit: string;
  /** Optional narrower subject label (used for diagnosisId matching). */
  subject?: string;
}

/**
 * Pool of abnormal images for a given imaging test. The optional `tags`
 * are matched against the patient's `diagnosisId` (case-insensitive,
 * substring match) to prefer the most specific image when possible.
 */
interface AbnormalEntry extends ImagingImage {
  /** Lower-case diagnosis hints. */
  tags?: string[];
}

const WIKIMEDIA = 'Wikimedia Commons';

// ────────────────────────── Normal reference images ──────────────────────────
// Keyed by test id. These render when `abnormal=false`.
const NORMAL_BY_TEST: Record<string, ImagingImage> = {
  cxr: {
    url: 'https://upload.wikimedia.org/wikipedia/commons/c/c8/Chest_Xray_PA_3-8-2010.png',
    caption: 'Normal PA akciğer grafisi.',
    credit: `${WIKIMEDIA} · Stillwaterising · CC0 (public domain)`,
    subject: 'Normal chest X-ray',
  },

  kub: {
    url: 'https://upload.wikimedia.org/wikipedia/commons/d/d0/Medical_X-Ray_imaging_ALP02_nevit.jpg',
    caption: 'Direkt batın grafisi (KUB) — özgül olmayan barsak gazı paterni, obstrüksiyon yok.',
    credit: `${WIKIMEDIA} · Nevit Dilmen · CC BY-SA 3.0`,
    subject: 'Normal KUB',
  },

  'xr-extrem': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/e/e2/X-ray_of_normal_hand_by_dorsoplantar_projection.jpg',
    caption: 'Normal el grafisi — kırık veya çıkık yok.',
    credit: `${WIKIMEDIA} · Mikael Häggström MD · CC0 (public domain)`,
    subject: 'Normal extremity X-ray',
  },

  'xr-spine': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Medical_X-Ray_imaging_ALR02_nevit.jpg',
    caption: 'Lateral lomber omurga grafisi — dizilim korunmuş, vertebra cisim yükseklikleri normal.',
    credit: `${WIKIMEDIA} · Nevit Dilmen · CC BY-SA 3.0`,
    subject: 'Normal spine X-ray',
  },

  'xr-pelvis': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/9/95/Normal-pelvis-001.jpg',
    caption: 'AP pelvis grafisi — pelvik halka sağlam, femur başları yerinde, kırık yok.',
    credit: `${WIKIMEDIA} · RadsWiki · CC BY-SA 3.0`,
    subject: 'Normal pelvis X-ray',
  },

  'us-abdomen': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/a/af/Gallstones.PNG',
    caption: 'Batın ultrasonografi referansı (safra kesesi görünümü).',
    credit: `${WIKIMEDIA} · James Heilman MD · CC BY-SA 3.0`,
    subject: 'Abdominal US reference',
  },

  'us-pelvis': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/f/fb/Ultrasound_scans_and_3D_rendering_of_polycystic_ovaries.png',
    caption: 'Pelvik ultrasonografi referansı (over morfolojisi).',
    credit: `${WIKIMEDIA} · Di Michele et al, Biomedicines 2025 · CC BY-SA 4.0`,
    subject: 'Normal pelvic US',
  },

  echo: {
    url: 'https://upload.wikimedia.org/wikipedia/commons/b/b3/PLAX_Mmode.jpg',
    caption: 'Parasternal uzun eksen görünümü, LV üzerinden M-mod — normal fonksiyon.',
    credit: `${WIKIMEDIA} · Kjetil Lenes (Ekko) · Public domain`,
    subject: 'Normal echo',
  },

  'ct-head': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/1/1e/CT_of_a_normal_brain%2C_axial_38.png',
    caption: 'Kontrastsız aksiyel beyin BT — kanama, kitle veya orta hat kayması yok.',
    credit: `${WIKIMEDIA} · Mikael Häggström MD · CC0 (public domain)`,
    subject: 'Normal CT head',
  },

  'ct-chest': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/d/d0/High-resolution_computed_tomograph_of_a_normal_thorax%2C_axial_plane_%281%29.jpg',
    caption: 'Aksiyel toraks BT — akciğerler temiz, mediastinumda özellik yok.',
    credit: `${WIKIMEDIA} · Mikael Häggström MD · CC0 (public domain)`,
    subject: 'Normal CT chest',
  },

  'ct-angio': {
    // A normal CTPA slice is hard to source on Commons, so we reuse the
    // normal thorax axial image — the pulmonary vessels are visible, patent,
    // and have no filling defect.
    url: 'https://upload.wikimedia.org/wikipedia/commons/d/d0/High-resolution_computed_tomograph_of_a_normal_thorax%2C_axial_plane_%281%29.jpg',
    caption: 'Aksiyel toraks BT — pulmoner damarlar açık, dolum defekti yok.',
    credit: `${WIKIMEDIA} · Mikael Häggström MD · CC0 (public domain)`,
    subject: 'Normal CT PE study',
  },

  'ct-abdomen': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/d/d0/Medical_X-Ray_imaging_ALP02_nevit.jpg',
    caption: 'Batın/pelvis BT referansı — akut intraabdominal patoloji yok.',
    credit: `${WIKIMEDIA} · Nevit Dilmen · CC BY-SA 3.0`,
    subject: 'Normal CT abdomen',
  },

  'ct-cspine': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/d/d5/Computed_tomographs_of_normal_cervical_vertebrae%2C_sagittal_plane_36.jpg',
    caption: 'Sagittal servikal omurga BT — normal dizilim, kırık yok.',
    credit: `${WIKIMEDIA} · Mikael Häggström MD · CC0 (public domain)`,
    subject: 'Normal CT C-spine',
  },

  'mri-brain': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/a/a4/MRI_T2_Brain_axial_image.jpg',
    caption: 'Aksiyel T2 ağırlıklı beyin MR — difüzyon kısıtlaması ve kitle yok.',
    credit: `${WIKIMEDIA} · Aaron G. Filler MD · CC BY-SA 3.0`,
    subject: 'Normal MRI brain',
  },

  'mri-cspine': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/f/f8/Anatomy_of_the_Neck_Sagittal_Color_MRI.png',
    caption: 'Sagittal servikal omurga MR — normal üst servikal ligamentöz anatomi (referans).',
    credit: `${WIKIMEDIA} · Nevit Dilmen · CC BY-SA 3.0`,
    subject: 'Normal MRI C-spine',
  },

  'mri-lspine': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/4/43/Lumbar_MRI_t2-tse-rst-sagittal_06.jpg',
    caption: 'Sagittal lomber T2 MR — yalnızca yaşa uygun hafif değişiklikler.',
    credit: `${WIKIMEDIA} · Stillwaterising · CC0 (public domain)`,
    subject: 'Normal MRI L-spine',
  },

  'mri-abd': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/9/94/MRCP_Normalbefund_66M_-_MR_-_001.jpg',
    caption: 'MRCP — normal safra yolları ve pankreatik kanal anatomisi.',
    credit: `${WIKIMEDIA} · Hellerhoff · CC BY-SA 4.0`,
    subject: 'Normal MRCP / MRI abdomen',
  },

  ecg: {
    url: 'https://upload.wikimedia.org/wikipedia/commons/a/a2/12_lead_ECG_of_a_26_year_old_male.jpg',
    caption: '12 derivasyonlu EKG — normal sinüs ritmi.',
    credit: `${WIKIMEDIA} · MoodyGroove · Public domain`,
    subject: 'Normal sinus rhythm',
  },
};

// ────────────────────────── Abnormal image pools ──────────────────────────
// Keyed by test id. When `abnormal=true`, we pick one image from this pool
// (preferring a tag match to the patient's diagnosisId). If no match, we
// pick deterministically based on a hash of the diagnosisId so the same
// patient always gets the same image during a session.

const ABNORMAL_BY_TEST: Record<string, AbnormalEntry[]> = {
  cxr: [
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/5/51/X-ray_of_lobar_pneumonia.jpg',
      caption: 'Lober pnömoni — sağ orta lobda yoğun konsolidasyon.',
      credit: `${WIKIMEDIA} · Mikael Häggström MD · CC0 (public domain)`,
      subject: 'Lobar pneumonia',
      tags: [
        'pneumonia',
        'community-acquired-pna',
        'aspiration-pneumonia',
        'lobar-pneumonia',
        'bronchopneumonia',
      ],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/6/6b/PneumoniaRUL.jpg',
      caption: 'Sağ üst lob pnömonisi (işaretli).',
      credit: `${WIKIMEDIA} · James Heilman MD · CC BY-SA 3.0`,
      subject: 'Right upper lobe pneumonia',
      tags: ['pneumonia', 'community-acquired-pna'],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/1/1c/PulmEdema.PNG',
      caption:
        'Pulmoner ödem — küçük iki taraflı efüzyonlarla birlikte interstisyel/alveolar opasiteler.',
      credit: `${WIKIMEDIA} · James Heilman MD · CC BY-SA 3.0`,
      subject: 'Pulmonary edema / CHF',
      tags: [
        'chf',
        'heart-failure',
        'pulmonary-edema',
        'adhf',
        'cardiogenic-shock',
      ],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/0/06/Pneumothorax_001_cs.jpg',
      caption: 'Tansiyon pnömotoraks — mediastinal kayma ile kollabe akciğer.',
      credit: `${WIKIMEDIA} · Petr Menzel · CC BY-SA 3.0 CZ`,
      subject: 'Pneumothorax',
      tags: ['pneumothorax', 'tension-pneumothorax'],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/d/d5/Cardiomegalia.JPG',
      caption: 'Kardiyomegali — PA görünümde artmış kardiyotorasik oran.',
      credit: `${WIKIMEDIA} · SCiardullo · CC BY-SA 3.0`,
      subject: 'Cardiomegaly',
      tags: [
        'cardiomegaly',
        'chf',
        'mitral-regurgitation',
        'hcm',
        'dilated-cardiomyopathy',
        'pericardial-effusion',
        'water-bottle-heart',
      ],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/3/34/Bilateral_Pleural_Effusion.jpg',
      caption: 'Bilateral plevral efüzyon — kostofrenik açılar küntleşmiş, sıvı tabakalanıyor.',
      credit: `${WIKIMEDIA} · Sara Nabih · CC BY-SA 4.0`,
      subject: 'Pleural effusion',
      tags: [
        'pleural-effusion',
        'pleural-effusion-parapneumonic',
        'transudate',
        'exudate',
      ],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/c/ca/Chest_radiograph_of_a_lung_with_Kerley_B_lines.jpg',
      caption: 'Konjestif kalp yetersizliği, Kerley B çizgileri — interstisyel ödem ve kardiyomegali.',
      credit: `${WIKIMEDIA} · Mikael Häggström MD · CC0 (public domain)`,
      subject: 'CHF / Kerley B lines',
      tags: [
        'chf',
        'chf-nyha2',
        'heart-failure',
        'adhf',
        'kerley-b',
        'pulmonary-edema',
      ],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/6/6c/Chest_radiograph_of_miliary_tuberculosis_1.jpg',
      caption: 'Miliyer tüberküloz — bilateral darı tanesi boyutunda interstisyel nodüller.',
      credit: `${WIKIMEDIA} · Herreros et al, Pathogens 2018 · CC BY 4.0`,
      subject: 'Miliary TB',
      tags: ['tb', 'tuberculosis', 'miliary-tb', 'latent-tb'],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/a/ad/Lung_Cancer_on_Chest_X-Ray.jpg',
      caption: 'Akciğer kitlesi — sol üst lobda malignite açısından şüphe uyandıran sınırlı opasite.',
      credit: `${WIKIMEDIA} · James Heilman MD · CC BY-SA 4.0`,
      subject: 'Lung mass',
      tags: [
        'lung-cancer',
        'lung-mass',
        'pulmonary-nodule-incidental',
        'pulmonary-nodule',
      ],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/0/0b/Chest_X-ray_of_right_upper_to_mid_zone_lung_cavity_with_air_fluid_level.jpg',
      caption: 'Akciğer absesi — sağ orta zonda hava-sıvı seviyeli kavite.',
      credit: `${WIKIMEDIA} · Cerevisae · CC BY-SA 4.0`,
      subject: 'Lung abscess',
      tags: ['lung-abscess', 'cavitary-lesion', 'aspiration-pneumonia'],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/e/e5/Emphysema2008.jpg',
      caption: 'Amfizem / KOAH — aşırı havalanmış akciğerler, düzleşmiş diyaframlar.',
      credit: `${WIKIMEDIA} · James Heilman MD · CC BY-SA 3.0`,
      subject: 'Emphysema / COPD',
      tags: [
        'copd',
        'copd-gold2',
        'emphysema',
        'hyperinflation',
        'asthma-exacerbation',
        'pediatric-asthma-exacerbation',
        'chronic-bronchitis',
      ],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/e/e1/IPF_amiodarone.JPG',
      caption: 'İdiyopatik pulmoner fibrozis — alt loblarda belirgin bilateral retiküler opasiteler.',
      credit: `${WIKIMEDIA} · James Heilman MD · CC BY-SA 3.0`,
      subject: 'Pulmonary fibrosis',
      tags: [
        'idiopathic-pulmonary-fibrosis',
        'ipf',
        'pulmonary-fibrosis',
        'interstitial-lung-disease',
        'ild',
        'scleroderma-limited',
        'scleroderma',
        'reticular-pattern',
      ],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/e/e6/Chest_X-ray_of_sarcoidosis_nodules.png',
      caption: 'Pulmoner sarkoidoz — bilateral hiler lenfadenopati ve retikülonodüler infiltratlar.',
      credit: `${WIKIMEDIA} · Mikael Häggström MD · CC0 (public domain)`,
      subject: 'Sarcoidosis',
      tags: [
        'sarcoidosis',
        'sarcoidosis-stage2',
        'hilar-lymphadenopathy',
        'bilateral-hilar-adenopathy',
      ],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/2/21/Bronchiectasis_imaging.JPG',
      caption: 'Bronşektazi — alt loblarda tramvay yolu ve halka şeklinde opasiteler.',
      credit: `${WIKIMEDIA} · Arinna'l · Public domain`,
      subject: 'Bronchiectasis',
      tags: [
        'bronchiectasis',
        'common-variable-immunodeficiency',
        'cvid',
        'recurrent-pulmonary-infection',
      ],
    },
  ],

  kub: [
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/d/dc/Upright_X-ray_demonstrating_small_bowel_obstruction.jpg',
      caption: 'Ayakta direkt batın grafisi — dilate ince barsak ansları ve çok sayıda hava-sıvı seviyesi.',
      credit: `${WIKIMEDIA} · James Heilman MD · CC BY-SA 3.0`,
      subject: 'Small bowel obstruction',
      tags: ['bowel-obstruction', 'sbo', 'small-bowel-obstruction', 'ileus'],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/7/79/Constipation.JPG',
      caption: 'Direkt batın grafisi — kolon boyunca fekal retansiyon.',
      credit: `${WIKIMEDIA} · James Heilman MD · CC BY 3.0`,
      subject: 'Constipation / stool burden',
      tags: ['constipation', 'ibs-c', 'constipation-functional'],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/a/a1/Ausgussstein_des_rechten_Nierenbeckens_84W_-_CR_CT_MR_-_001.jpg',
      caption: 'Sağ renal pelviste geyik boynuzu taşı — direkt grafide radyoopak taş.',
      credit: `${WIKIMEDIA} · Hellerhoff · CC BY-SA 4.0`,
      subject: 'Renal calculi (KUB)',
      tags: [
        'renal-calculi',
        'kidney-stone',
        'nephrolithiasis',
        'staghorn-calculus',
        'hyperparathyroidism-primary',
        'hypercalcemia',
      ],
    },
  ],

  'xr-extrem': [
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/e/e3/Collesfracture.jpg',
      caption:
        'Colles kırığı — distal radiusun dorsale yer değiştirmesi ve ulna stiloid kırığı.',
      credit: `${WIKIMEDIA} · Lucien Monfils · CC BY-SA 3.0`,
      subject: 'Colles fracture (wrist)',
      tags: [
        'colles',
        'wrist-fracture',
        'distal-radius-fracture',
        'fall-on-outstretched-hand',
        'osteoporosis-postmenopausal',
        'fragility-fracture',
      ],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/e/eb/Bimalleolar_fracture_legend.jpg',
      caption: 'Çıkıkla birlikte bimaleolar ayak bileği kırığı — AP görünüm.',
      credit: `${WIKIMEDIA} · Steven Fruitsmaak · CC BY-SA 3.0`,
      subject: 'Bimalleolar ankle fracture',
      tags: [
        'ankle-fracture',
        'bimalleolar',
        'weber-b',
        'weber-c',
        'ankle-sprain-gr2',
        'cellulitis-non-limb-threatening',
        'soft-tissue-swelling',
      ],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/c/cd/Medical_X-Ray_imaging_IYN05_nevit.jpg',
      caption: 'Femur şaft kırığı.',
      credit: `${WIKIMEDIA} · Nevit Dilmen · CC BY-SA 3.0`,
      subject: 'Femoral shaft fracture',
      tags: ['femur-fracture', 'femoral-fracture', 'hip-fracture'],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/a/a4/X-ray_of_scaphoid_fracture.png',
      caption: 'Skafoid gövde kırığı — ok kırık hattını gösteriyor.',
      credit: `${WIKIMEDIA} · Gilo1969 · CC BY 3.0`,
      subject: 'Scaphoid fracture',
      tags: ['scaphoid-fracture', 'wrist-fracture', 'fall-on-outstretched-hand'],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/e/ef/Foot_radiography_gout.jpg',
      caption: 'Gut artriti — sağ birinci MTP ekleminde yumuşak doku şişliği ve erozyon.',
      credit: `${WIKIMEDIA} · Nassira Aradoini · CC BY 1.0`,
      subject: 'Gout (foot)',
      tags: ['gout', 'gouty-arthritis', 'mtp-erosion', 'tophaceous-gout'],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/7/71/Osteoarthritis_left_knee.jpg',
      caption: 'Diz osteoartriti — medial eklem aralığında daralma, osteofitler ve subkondral skleroz.',
      credit: `${WIKIMEDIA} · James Heilman MD · CC BY-SA 3.0`,
      subject: 'Knee osteoarthritis',
      tags: [
        'osteoarthritis-knee',
        'knee-oa',
        'osteoarthritis',
        'joint-space-narrowing',
      ],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/d/d5/X-ray_of_rheumatoid_arthritis_of_the_shoulder.jpg',
      caption: 'Romatoid artrit — periartiküler erozyonlar ve eklem aralığında daralma.',
      credit: `${WIKIMEDIA} · Edison et al, Cureus 2016 · CC BY 3.0`,
      subject: 'Rheumatoid arthritis',
      tags: [
        'rheumatoid-arthritis',
        'rheumatoid-arthritis-early',
        'ra',
        'periarticular-erosions',
        'inflammatory-arthritis',
      ],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/9/9b/OsteomylitisMark.png',
      caption: 'Birinci MTP osteomiyeliti — kortikal destrüksiyon ve sekestrum (ok).',
      credit: `${WIKIMEDIA} · James Heilman MD · CC BY-SA 4.0`,
      subject: 'Osteomyelitis',
      tags: [
        'osteomyelitis',
        'osteomyelitis-chronic',
        'osteomyelitis-acute',
        'cortical-destruction',
        'sequestrum',
      ],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/6/65/Calcaneal_spur_001.jpg',
      caption: 'Plantar kalkaneal spur — plantar fasyanın başlangıcında kemik entezofiti.',
      credit: `${WIKIMEDIA} · Thorwikibr · CC BY-SA 2.0`,
      subject: 'Calcaneal spur',
      tags: [
        'plantar-fasciitis',
        'calcaneal-spur',
        'heel-spur',
        'achilles-tendinopathy',
        'enthesopathy',
      ],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/2/2a/Rot_cuff_tear_x-ray.jpg',
      caption: 'Rotator manşet yırtığı — yükselmiş humerus başı ve azalmış akromiohumeral mesafe.',
      credit: `${WIKIMEDIA} · Micaela E. · CC0 (public domain)`,
      subject: 'Rotator cuff tear',
      tags: [
        'rotator-cuff-tear',
        'rotator-cuff-tear-partial',
        'rotator-cuff-tear-full',
        'high-riding-humeral-head',
        'shoulder-impingement',
      ],
    },
  ],

  'xr-spine': [
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/a/a5/T12compressionfracMark.png',
      caption: 'T12 kompresyon kırığı (ok).',
      credit: `${WIKIMEDIA} · James Heilman MD · CC BY-SA 4.0`,
      subject: 'Vertebral compression fracture',
      tags: [
        'compression-fracture',
        'vertebral-compression-fracture',
        'osteoporosis',
        'osteoporosis-postmenopausal',
      ],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/d/d6/SpondylolisthesisL5S1.jpg',
      caption: 'Spondilolistezis — lateral görünümde L5\'in S1 üzerinde öne kayması.',
      credit: `${WIKIMEDIA} · Lucien Monfils · CC BY-SA 3.0`,
      subject: 'Spondylolisthesis L5-S1',
      tags: [
        'spondylolisthesis',
        'lumbar-disc-herniation',
        'sciatica',
        'sciatica-l5',
        'low-back-pain',
      ],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/e/ee/Spondylolisthesis.jpg',
      caption: 'Lateral grafide lomber spondilolistezis.',
      credit: `${WIKIMEDIA} · Jojo · CC BY-SA 3.0`,
      subject: 'Spondylolisthesis',
      tags: [
        'spondylolisthesis',
        'low-back-pain',
        'spinal-stenosis',
        'lumbar-spinal-stenosis',
        'cervical-disc-herniation',
        'cervical-cord-compression',
        'cervical-radiculopathy',
        'cervical-spondylosis',
        'degenerative-disc-disease',
      ],
    },
  ],

  'xr-pelvis': [
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/c/cd/Medical_X-Ray_imaging_IYN05_nevit.jpg',
      caption: 'Pelvis görünümünde proksimal femur / kalça kırığı.',
      credit: `${WIKIMEDIA} · Nevit Dilmen · CC BY-SA 3.0`,
      subject: 'Hip fracture',
      tags: ['hip-fracture', 'femur-fracture', 'femoral-neck-fracture'],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/9/9c/Pelvis_AP_view_showing_fracture_of_the_left_ischium_and_left_acetabular_wall.jpg',
      caption:
        'AP pelvis — sol inferior pubik ramus ve sol asetabular duvar kırığı.',
      credit: `${WIKIMEDIA} · Cerevisae · CC BY-SA 4.0`,
      subject: 'Pubic ramus / acetabular fracture',
      tags: [
        'pubic-ramus-fracture',
        'pelvic-fracture',
        'pelvic-ring-fracture',
        'acetabular-fracture',
      ],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/c/cd/Rad_1300095.JPG',
      caption: 'Bilateral sakroiliit — SI eklemlerinde skleroz ve düzensizlik.',
      credit: `${WIKIMEDIA} · Nevit Dilmen · CC BY-SA 3.0`,
      subject: 'Sacroiliitis',
      tags: [
        'sacroiliitis',
        'ankylosing-spondylitis',
        'axial-spondyloarthritis',
        'spondyloarthropathy',
      ],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/7/71/Osteoarthritis_left_knee.jpg',
      caption: 'Kalça osteoartriti — eklem aralığında daralma ve osteofit oluşumu (örnek AP görünüm).',
      credit: `${WIKIMEDIA} · James Heilman MD · CC BY-SA 3.0`,
      subject: 'Hip osteoarthritis',
      tags: [
        'hip-oa',
        'hip-oa-moderate',
        'hip-osteoarthritis',
        'coxarthrosis',
        'osteoarthritis',
      ],
    },
  ],

  'us-abdomen': [
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/a/af/Gallstones.PNG',
      caption:
        'Safra kesesi boynunda impakte 1,9 cm safra taşı ve 4 mm duvar kalınlaşması — kolesistit.',
      credit: `${WIKIMEDIA} · James Heilman MD · CC BY-SA 3.0`,
      subject: 'Gallstones / cholecystitis',
      tags: [
        'gallstones',
        'cholecystitis',
        'cholelithiasis',
        'biliary-colic',
        'gallstones-biliary-colic',
        'gallstones-cholelithiasis',
        'acute-cholecystitis',
      ],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/SonoAppendizitis.JPG',
      caption: 'Komprese edilemeyen apendiks — akut apandisitin "hedef işareti".',
      credit: `${WIKIMEDIA} · Drahreg01 · CC BY-SA 4.0 / GFDL`,
      subject: 'Appendicitis (US)',
      tags: ['appendicitis', 'acute-appendicitis'],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/e/e2/3mmstone.png',
      caption: 'Üreter taşı — BT ile uyumlu sol proksimal üreterde 3 mm taş.',
      credit: `${WIKIMEDIA} · James Heilman MD · CC BY-SA 3.0`,
      subject: 'Ureterolithiasis',
      tags: [
        'kidney-stone',
        'nephrolithiasis',
        'renal-colic',
        'nephrolithiasis-recurrent',
        'kidney-stone-5mm',
      ],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/d/d0/Ultrasound_Scan_ND_110216094836_0953580.jpg',
      caption:
        'Renal ultrason — hidronefroziyle uyumlu dilate renal pelvis.',
      credit: `${WIKIMEDIA} · Nevit Dilmen · CC BY-SA 3.0`,
      subject: 'Hydronephrosis',
      tags: [
        'hydronephrosis',
        'obstructive-uropathy',
        'kidney-stone',
        'nephrolithiasis-recurrent',
        'bph-moderate',
      ],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/e/ea/Ultrasound_of_upper_right_liver_lobe_showing_fatty_liver.jpg',
      caption:
        'Karaciğer parankiminde kaba ekoda artış ve portal ven duvar belirginliğinin kaybı — kronik karaciğer hastalığı / hepatik steatoz.',
      credit: `${WIKIMEDIA} · Cerevisae · CC BY-SA 4.0`,
      subject: 'Coarse liver echotexture',
      tags: [
        'chronic-hepatitis-c',
        'chronic-hepatitis-b',
        'hepatic-steatosis',
        'fatty-liver',
        'nafld',
        'chronic-liver-disease',
      ],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/9/99/Ultrasonography_of_abdominal_aortic_aneurysm_in_sagittal_plane.jpg',
      caption: 'Abdominal aort anevrizması — sagittal ultrasonografide dilate aort.',
      credit: `${WIKIMEDIA} · Mikael Häggström MD · CC0 (public domain)`,
      subject: 'AAA (US)',
      tags: ['aaa', 'abdominal-aortic-aneurysm', 'aortic-aneurysm'],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/d/da/Advanced_polycystic_kidney_disease_with_multiple_cysts.jpg',
      caption: 'Polikistik böbrek hastalığı — bilateral büyümüş böbrekler ve çok sayıda kist.',
      credit: `${WIKIMEDIA} · Hansen, Nielsen & Ewertsen, Diagnostics 2015 · CC BY 4.0`,
      subject: 'Polycystic kidney disease',
      tags: [
        'polycystic-kidney-disease',
        'pkd',
        'adpkd',
        'renal-cysts',
      ],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/8/84/Hepatosplenomegaly.jpeg',
      caption: 'Hepatosplenomegali — batın ultrasonografisinde büyümüş dalak ve karaciğer.',
      credit: `${WIKIMEDIA} · HI2CaseProject · CC BY-SA 4.0`,
      subject: 'Splenomegaly / hepatosplenomegaly',
      tags: [
        'splenomegaly',
        'hepatosplenomegaly',
        'polycythemia-vera',
        'cml',
        'chronic-myeloid-leukemia',
        'myeloproliferative-neoplasm',
      ],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/1/1c/Ultrasonography_of_a_lipoma.jpg',
      caption: 'Subkutan lipom — sınırları belirgin hiperekojen yumuşak doku kitlesi.',
      credit: `${WIKIMEDIA} · Chernev & Tingey · CC BY 4.0`,
      subject: 'Lipoma',
      tags: [
        'lipoma',
        'subcutaneous-mass',
        'soft-tissue-mass',
        'benign-lipoma',
      ],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/4/46/Ultrasonography_of_inguinal_hernia.jpg',
      caption: 'Karın duvarı fıtığı — ultrasonografide fasyal defektten yağ içeriğinin protrüzyonu.',
      credit: `${WIKIMEDIA} · Mikael Häggström MD · CC0 (public domain)`,
      subject: 'Abdominal wall hernia (US)',
      tags: [
        'umbilical-hernia',
        'inguinal-hernia',
        'inguinal-hernia-reducible',
        'abdominal-wall-hernia',
        'ventral-hernia',
      ],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/d/da/Advanced_polycystic_kidney_disease_with_multiple_cysts.jpg',
      caption: 'Kronik böbrek hastalığı — küçük, ekojen böbrekler ve kortikomedüller ayrım kaybı (örnek).',
      credit: `${WIKIMEDIA} · Hansen, Nielsen & Ewertsen, Diagnostics 2015 · CC BY 4.0`,
      subject: 'CKD kidneys (US)',
      tags: [
        'ckd',
        'ckd-stage3a',
        'chronic-kidney-disease',
        'diabetic-nephropathy',
        'hypertensive-nephrosclerosis',
        'renal-artery-stenosis',
        'echogenic-kidneys',
      ],
    },
  ],

  'us-pelvis': [
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/f/fb/Ultrasound_scans_and_3D_rendering_of_polycystic_ovaries.png',
      caption: 'Polikistik over morfolojisi — çok sayıda periferik folikül.',
      credit: `${WIKIMEDIA} · Di Michele et al, Biomedicines 2025 · CC BY-SA 4.0`,
      subject: 'Polycystic ovaries',
      tags: ['pcos', 'pcos-obgyn', 'polycystic-ovary', 'ovarian-cyst'],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/9/9d/Ectopic_pregnancy.JPG',
      caption: 'Transvajinal ultrasonografi — ektopik gebelikle uyumlu ekstrauterin gestasyonel kese.',
      credit: `${WIKIMEDIA} · X. Compagnion (Mirmillon) · Public domain`,
      subject: 'Ectopic pregnancy',
      tags: [
        'ectopic',
        'ectopic-pregnancy',
        'tubal-pregnancy',
      ],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/3/35/Haemorrhagic_ovarian_cyst_ultrasound.jpg',
      caption: 'Pelvik ultrasonografide hemorajik over kisti.',
      credit: `${WIKIMEDIA} · Mme Mim · CC BY-SA 3.0`,
      subject: 'Hemorrhagic ovarian cyst',
      tags: [
        'ovarian-cyst',
        'hemorrhagic-cyst',
        'ovarian-torsion',
        'ruptured-ovarian-cyst',
      ],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/e/e6/9cmFibroidUS.png',
      caption: 'Pelvik konjesyona yol açan büyük (9 cm) uterin miyom.',
      credit: `${WIKIMEDIA} · James Heilman MD · CC BY-SA 3.0`,
      subject: 'Uterine fibroid',
      tags: [
        'uterine-fibroid',
        'menorrhagia-fibroids',
        'leiomyoma',
        'fibroid',
      ],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/2/2d/Subserosal_uterine_fibroid.png',
      caption: 'Transvajinal ultrasonografide subseröz uterin miyom (5 cm).',
      credit: `${WIKIMEDIA} · Mikael Häggström MD · CC0 (public domain)`,
      subject: 'Subserosal fibroid',
      tags: [
        'uterine-fibroid',
        'menorrhagia-fibroids',
        'leiomyoma',
      ],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/3/35/Haemorrhagic_ovarian_cyst_ultrasound.jpg',
      caption: 'Kompleks adneksiyal kitle — tubo-ovaryan abse / PID ile uyumlu bulgular.',
      credit: `${WIKIMEDIA} · Mme Mim · CC BY-SA 3.0`,
      subject: 'Tubo-ovarian abscess (US)',
      tags: [
        'pid',
        'pid-outpatient',
        'pid-gonococcal',
        'tubo-ovarian-abscess',
        'toa',
      ],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/0/0c/Endometriose_der_Bauchdecke_nach_Sectio_41W_-_US_-_001.jpg',
      caption: 'Endometriom — düşük amplitüdlü iç yankıları olan hipoekojen kistik lezyon.',
      credit: `${WIKIMEDIA} · Hellerhoff · CC BY-SA 4.0`,
      subject: 'Endometrioma',
      tags: [
        'endometriosis',
        'endometrioma',
        'chocolate-cyst',
        'pelvic-endometriosis',
      ],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/4/46/Ultrasonography_of_inguinal_hernia.jpg',
      caption: 'İnguinal fıtık — ultrasonografide inguinal kanaldan yağ içeriğinin protrüzyonu.',
      credit: `${WIKIMEDIA} · Mikael Häggström MD · CC0 (public domain)`,
      subject: 'Inguinal hernia (US)',
      tags: [
        'inguinal-hernia',
        'inguinal-hernia-reducible',
        'groin-hernia',
      ],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/4/44/Scrotal_ultrasonography_of_testicular_torsion.jpg',
      caption: 'Testiküler torsiyon — etkilenen testiste renkli Doppler akımı yok veya belirgin azalmış.',
      credit: `${WIKIMEDIA} · Mak & Tzeng, InTechOpen 2012 · CC BY 3.0`,
      subject: 'Testicular torsion (US)',
      tags: [
        'testicular-torsion',
        'testicular-torsion-subacute',
        'scrotal-pain',
        'absent-doppler-flow',
      ],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/b/b0/Scrotal_ultrasonography_of_varicocele.jpg',
      caption: 'Varikosel — skrotal ultrasonografide dilate pampiniform pleksus.',
      credit: `${WIKIMEDIA} · Mak & Tzeng, InTechOpen 2012 · CC BY 3.0`,
      subject: 'Varicocele',
      tags: [
        'varicocele',
        'pampiniform-plexus',
        'scrotal-varicosity',
      ],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/3/3f/Ultrasound_of_thyroid_showing_right_lower_pole_cyst_and_a_calcified_nodule.jpg',
      caption: 'Tiroid nodülü — boyun ultrasonografisinde sağ alt polde solid hipoekojen lezyon.',
      credit: `${WIKIMEDIA} · Cerevisae · CC BY-SA 4.0`,
      subject: 'Thyroid nodule',
      tags: [
        'thyroid-nodule',
        'thyroid-cyst',
        'thyroid-mass',
      ],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/1/1c/Ultrasonography_of_a_lipoma.jpg',
      caption: 'Meme fibroadenomu — sınırları belirgin oval hipoekojen yumuşak doku kitlesi (örnek).',
      credit: `${WIKIMEDIA} · Chernev & Tingey · CC BY 4.0`,
      subject: 'Breast fibroadenoma (illustrative)',
      tags: [
        'breast-fibroadenoma',
        'fibroadenoma',
        'breast-mass',
        'benign-breast-mass',
      ],
    },
  ],

  echo: [
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/a/ad/PericardialeffusionUS.PNG',
      caption: 'Perikardiyal efüzyon — kalbi çevreleyen anekojen sıvı.',
      credit: `${WIKIMEDIA} · James Heilman MD · CC BY-SA 3.0`,
      subject: 'Pericardial effusion',
      tags: [
        'pericardial-effusion',
        'pericarditis',
        'cardiac-tamponade',
        'tamponade',
      ],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/b/b3/PLAX_Mmode.jpg',
      caption:
        'Parasternal uzun aks — LV üzerinden M-mod incelemede sistolik ekskürsiyon korunmuş.',
      credit: `${WIKIMEDIA} · Kjetil Lenes (Ekko) · Public domain`,
      subject: 'Parasternal long axis',
      tags: [
        'mitral-regurgitation',
        'hcm',
        'chf-nyha2',
        'cardiomyopathy',
        'paroxysmal-afib',
        'atrial-enlargement',
        'stable-angina',
        'la-dilation',
        'lvh',
        'essential-hypertension',
        'htn-uncontrolled',
        'hypertensive-heart-disease',
      ],
    },
  ],

  'ct-head': [
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/1/16/Leftsidedstroke.png',
      caption:
        'Sol hemisferde iskemik inme, ödeme bağlı orta hat kayması.',
      credit: `${WIKIMEDIA} · James Heilman MD · CC BY-SA 4.0`,
      subject: 'Ischemic stroke (established)',
      tags: ['ischemic-stroke', 'stroke', 'cva', 'mca-stroke', 'cerebral-infarction'],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/1/19/EartlyrtMCAstroke.png',
      caption: 'Erken sağ MCA enfarktı — gri-beyaz madde ayrımının kaybı.',
      credit: `${WIKIMEDIA} · James Heilman MD · CC BY-SA 3.0`,
      subject: 'Early MCA infarct',
      tags: ['ischemic-stroke', 'stroke', 'cva', 'mca-stroke', 'hyperacute-stroke'],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/1/1c/Intracerebral_hemorrage_%28CT_scan%29.jpg',
      caption: 'İntraserebral ve intraventriküler hemoraji.',
      credit: `${WIKIMEDIA} · Glitzy queen00 · Public domain`,
      subject: 'Intracerebral hemorrhage',
      tags: [
        'intracerebral-hemorrhage',
        'ich',
        'hemorrhagic-stroke',
        'hypertensive-bleed',
        'intracranial-hemorrhage',
      ],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/2/20/BilateralSubDur.png',
      caption: 'Bilateral subdural hematomlar — hilal şeklinde ekstraaksiyel koleksiyonlar.',
      credit: `${WIKIMEDIA} · James Heilman MD · CC BY-SA 4.0`,
      subject: 'Subdural hematoma',
      tags: ['subdural-hematoma', 'sdh', 'head-trauma', 'traumatic-brain-injury'],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/3/3a/CT_of_subarachnoid_hemorrhage.png',
      caption: 'Subaraknoid hemoraji — bazal sisternalarda ve sulkuslarda hiperdens kan.',
      credit: `${WIKIMEDIA} · Mirza & Gokhale, 2016 · CC BY 4.0`,
      subject: 'Subarachnoid hemorrhage',
      tags: [
        'subarachnoid-hemorrhage',
        'sah',
        'thunderclap-headache',
        'aneurysm-rupture',
      ],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/f/f9/EpiduralHematoma.jpg',
      caption:
        'Bikonveks epidural hematom ve eşlik eden kafatası kırığı.',
      credit: `${WIKIMEDIA} · James Heilman MD · CC BY-SA 4.0`,
      subject: 'Epidural hematoma',
      tags: [
        'epidural-hematoma',
        'edh',
        'head-trauma',
        'traumatic-brain-injury',
      ],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Hydrocephalus.jpg',
      caption: 'Beyin BT — hidrosefali ile uyumlu belirgin dilate ventriküller.',
      credit: `${WIKIMEDIA} · Lucien Monfils · CC BY-SA 3.0`,
      subject: 'Hydrocephalus',
      tags: [
        'hydrocephalus',
        'normal-pressure-hydrocephalus',
        'obstructive-hydrocephalus',
      ],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/c/cb/Ethmoidinfection.png',
      caption: 'Sinüs BT — kronik rinosinüzit / nazal polipozisle uyumlu opasifikasyon.',
      credit: `${WIKIMEDIA} · James Heilman MD · CC BY-SA 3.0`,
      subject: 'Sinusitis / nasal polyps (CT)',
      tags: [
        'nasal-polyps',
        'nasal-polyposis',
        'chronic-rhinosinusitis',
        'sinusitis',
        'paranasal-sinus-disease',
      ],
    },
  ],

  'ct-chest': [
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/5/57/Pneumothorax_CT.jpg',
      caption: 'Göğüs tüpü yerindeyken BT\'de pnömotoraks.',
      credit: `${WIKIMEDIA} · Clinical Cases · CC BY-SA 2.5`,
      subject: 'Pneumothorax (CT)',
      tags: ['pneumothorax', 'tension-pneumothorax'],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/7/77/SaddlePE.PNG',
      caption: 'Pulmoner arter bifurkasyonunda eyer (saddle) pulmoner emboli.',
      credit: `${WIKIMEDIA} · James Heilman MD · CC BY-SA 3.0`,
      subject: 'Pulmonary embolism',
      tags: ['pe', 'pulmonary-embolism', 'saddle-pe'],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/8/82/HR_tomography_of_the_chest_of_an_IPF_patient.jpg',
      caption: 'İdiyopatik pulmoner fibrozis — YRBT\'de subplevral retikülasyon ve bal peteği görünümü.',
      credit: `${WIKIMEDIA} · IPFeditor · CC BY-SA 3.0`,
      subject: 'IPF / UIP (HRCT)',
      tags: [
        'idiopathic-pulmonary-fibrosis',
        'ipf',
        'uip',
        'pulmonary-fibrosis',
        'honeycombing',
        'interstitial-lung-disease',
        'ild',
        'sarcoidosis-stage2',
        'sarcoidosis',
      ],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/a/a2/Pleura_effusion.jpg',
      caption: 'Toraks BT\'de plevral kalınlaşmanın eşlik ettiği lokalize sol plevral efüzyon.',
      credit: `${WIKIMEDIA} · Drriad · CC BY-SA 3.0`,
      subject: 'Pleural effusion (CT)',
      tags: [
        'pleural-effusion',
        'pleural-effusion-parapneumonic',
        'loculated-effusion',
        'empyema',
        'parapneumonic-effusion',
      ],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/d/de/CT_of_lung_nodule_with_smooth_border.png',
      caption: 'Soliter pulmoner nodül — toraks BT\'de sınırları belirgin solid nodül.',
      credit: `${WIKIMEDIA} · Insights into Imaging 2017 · CC BY 4.0`,
      subject: 'Solitary pulmonary nodule (CT)',
      tags: [
        'pulmonary-nodule',
        'pulmonary-nodule-incidental',
        'solitary-pulmonary-nodule',
        'lung-nodule',
        'spn',
        'lung-cancer',
        'lung-mass',
        'nsclc',
      ],
    },
  ],

  'ct-angio': [
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/7/77/SaddlePE.PNG',
      caption: 'Eyer PE — pulmoner arter bifurkasyonunda büyük dolum defekti.',
      credit: `${WIKIMEDIA} · James Heilman MD · CC BY-SA 3.0`,
      subject: 'Saddle PE',
      tags: ['pe', 'pulmonary-embolism', 'saddle-pe', 'massive-pe'],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/4/4d/Pulmonary_embolism_CTPA.JPEG',
      caption:
        'CTPA — bilateral lober dallarda belirgin trombüs yüküyle birlikte eyer embolisi.',
      credit: `${WIKIMEDIA} · Myat & Ahsan, Thromb J 2007 · CC BY 2.0`,
      subject: 'Pulmonary embolism (CTPA)',
      tags: ['pe', 'pulmonary-embolism', 'bilateral-pe'],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/2/22/RAS_Plaque.jpg',
      caption: 'Renal arter stenozu — proksimal renal arteri daraltan aterosklerotik plak.',
      credit: `${WIKIMEDIA} · NIDDK · Public domain`,
      subject: 'Renal artery stenosis',
      tags: [
        'renal-artery-stenosis',
        'ras',
        'atherosclerotic-renal-artery-stenosis',
        'reno-vascular-hypertension',
      ],
    },
  ],

  'ct-abdomen': [
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/7/7c/CAT_scan_demonstrating_acute_appendicitis.jpg',
      caption:
        'Akut apandisit — dilate apendiks (17,1 mm) ve periapendiküler inflamasyon.',
      credit: `${WIKIMEDIA} · James Heilman MD · CC BY-SA 3.0`,
      subject: 'Acute appendicitis',
      tags: ['appendicitis', 'acute-appendicitis'],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/9/95/PSBOCT.png',
      caption: 'İnce barsak obstrüksiyonu — proksimal dilatasyonla birlikte geçiş noktası.',
      credit: `${WIKIMEDIA} · James Heilman MD · CC BY-SA 3.0`,
      subject: 'Small bowel obstruction',
      tags: ['bowel-obstruction', 'sbo', 'small-bowel-obstruction', 'ileus'],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/e/e2/3mmstone.png',
      caption: 'Sol proksimal üreterde 3 mm taş (ok).',
      credit: `${WIKIMEDIA} · James Heilman MD · CC BY-SA 3.0`,
      subject: 'Ureterolithiasis',
      tags: [
        'kidney-stone',
        'nephrolithiasis',
        'renal-colic',
        'ureterolithiasis',
        'nephrolithiasis-recurrent',
      ],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/c/c0/Sigmadivertikulitis_1b_61M_-_CT_axial_KM_pv_-_001.jpg',
      caption:
        'Sigmoid divertikülit — kolon duvar kalınlaşması ve çevre inflamatuar değişiklikler.',
      credit: `${WIKIMEDIA} · Hellerhoff · CC BY-SA 4.0`,
      subject: 'Diverticulitis',
      tags: ['diverticulitis', 'sigmoid-diverticulitis', 'diverticular-disease'],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/e/e7/Large_Pancreatic_Pseudocyst.PNG',
      caption:
        'Pankreas psödokisti — pankreatitin geç komplikasyonu, sol renal vasküler yapılara bası.',
      credit: `${WIKIMEDIA} · JasonRobertYoungMD · CC BY-SA 4.0`,
      subject: 'Pancreatitis / pseudocyst',
      tags: [
        'pancreatitis',
        'acute-pancreatitis',
        'chronic-pancreatitis',
        'pancreatic-pseudocyst',
      ],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/3/35/Haemorrhagic_ovarian_cyst_ultrasound.jpg',
      caption:
        'Doppler anomalisi olan adneksiyal kitle — korele görüntülemede over torsiyonu açısından şüpheli.',
      credit: `${WIKIMEDIA} · Mme Mim · CC BY-SA 3.0`,
      subject: 'Ovarian torsion',
      tags: ['ovarian-torsion', 'adnexal-torsion'],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/e/e9/Ileitis_terminalis_bei_langjaehrigem_Morbus_Crohn_63W_-_CT_und_MRT_-_001.jpg',
      caption: 'Crohn hastalığı — duvar kalınlaşması ve mural kontrastlanma ile terminal ileum tutulumu.',
      credit: `${WIKIMEDIA} · Hellerhoff · CC BY-SA 4.0`,
      subject: 'Crohn\'s disease (CT/MR enterography)',
      tags: [
        'crohns-disease',
        'crohns',
        'inflammatory-bowel-disease',
        'ibd',
        'terminal-ileitis',
        'ulcerative-colitis',
        'colitis',
        'bowel-wall-thickening',
      ],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/e/ea/Ultrasound_of_upper_right_liver_lobe_showing_fatty_liver.jpg',
      caption:
        'Karaciğer parankiminde kaba ekoda artış ve portal ven duvar belirginliğinin kaybı — kronik karaciğer hastalığı / hepatik steatoz.',
      credit: `${WIKIMEDIA} · Cerevisae · CC BY-SA 4.0`,
      subject: 'Coarse liver echotexture',
      tags: [
        'chronic-hepatitis-c',
        'chronic-hepatitis-b',
        'hepatic-steatosis',
        'fatty-liver',
        'nafld',
        'chronic-liver-disease',
      ],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/9/99/Ultrasonography_of_abdominal_aortic_aneurysm_in_sagittal_plane.jpg',
      caption:
        'Abdominal aort anevrizması — infrarenal aortta dilatasyon (ameliyat öncesi BT planlaması için korele edin).',
      credit: `${WIKIMEDIA} · Mikael Häggström MD · CC0 (public domain)`,
      subject: 'AAA (pre-op correlate)',
      tags: [
        'aaa',
        'abdominal-aortic-aneurysm',
        'aortic-aneurysm',
      ],
    },
  ],

  'ct-cspine': [
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/3/32/PdensfracCT.png',
      caption: 'Dens tabanında kırık (C2).',
      credit: `${WIKIMEDIA} · James Heilman MD · CC BY-SA 3.0`,
      subject: 'Odontoid fracture',
      tags: [
        'cervical-fracture',
        'c-spine-fracture',
        'dens-fracture',
        'odontoid-fracture',
      ],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/d/d0/JeffersonBurstandT2OndontCTMark.png',
      caption: 'C1 Jefferson patlama kırığı ve tip II odontoid kırık.',
      credit: `${WIKIMEDIA} · James Heilman MD · CC BY-SA 4.0`,
      subject: 'Jefferson / burst fracture',
      tags: [
        'cervical-fracture',
        'c-spine-fracture',
        'jefferson-fracture',
        'burst-fracture',
        'atlas-fracture',
        'atlanto-axial-subluxation',
      ],
    },
  ],

  'mri-brain': [
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/2/28/MSMRIMark.png',
      caption: 'Multipl skleroz — MR\'da periventriküler beyaz cevher plakları.',
      credit: `${WIKIMEDIA} · James Heilman MD · CC BY-SA 4.0`,
      subject: 'Multiple sclerosis',
      tags: [
        'multiple-sclerosis',
        'ms',
        'demyelination',
        'trigeminal-neuralgia',
        'cranial-nerve-disorder',
      ],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/c/c0/Glioblastoma_-_MR_sagittal_with_contrast.jpg',
      caption: 'Glioblastom — kontrastlı sagittal MR\'da kontrastlanan kitle.',
      credit: `${WIKIMEDIA} · Christaras A · CC BY-SA 3.0`,
      subject: 'Glioblastoma',
      tags: ['brain-tumor', 'glioblastoma', 'glioma', 'tumor', 'brain-mass'],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/4/49/MCA_Territory_Infarct.svg',
      caption: 'MCA sulama alanı enfarktı (işaretlenmiş BT).',
      credit: `${WIKIMEDIA} · Lucien Monfils · CC BY-SA 3.0`,
      subject: 'MCA infarct',
      tags: ['ischemic-stroke', 'stroke', 'cva', 'mca-stroke'],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/a/a1/Butterfly_glioblastoma.png',
      caption:
        'Kelebek glioblastom — korpus kallozumu geçen, çevresinde ödem bulunan büyük kontrast tutan kitle.',
      credit: `${WIKIMEDIA} · Rossmeisl et al, Front Vet Sci 2016 · CC BY 4.0`,
      subject: 'Butterfly glioblastoma',
      tags: [
        'brain-tumor',
        'glioblastoma',
        'glioma',
        'butterfly-glioma',
        'brain-mass',
      ],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/1/1c/Intracerebral_hemorrage_%28CT_scan%29.jpg',
      caption:
        'Akut intraserebral hemoraji — parankimal kanı gösteren eşleşen MR/BT görüntüsü.',
      credit: `${WIKIMEDIA} · Glitzy queen00 · Public domain`,
      subject: 'Acute ICH',
      tags: [
        'intracerebral-hemorrhage',
        'ich',
        'hemorrhagic-stroke',
        'acute-ich',
      ],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Hydrocephalus.jpg',
      caption: 'Kesitsel görüntülemede genişlemiş ventriküler sistem — hidrosefali.',
      credit: `${WIKIMEDIA} · Lucien Monfils · CC BY-SA 3.0`,
      subject: 'Hydrocephalus',
      tags: [
        'hydrocephalus',
        'normal-pressure-hydrocephalus',
        'obstructive-hydrocephalus',
      ],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/f/f0/Acromegaly_pituitary_macroadenoma.JPEG',
      caption: 'Hipofiz adenomu — kontrastlı MR\'da sellar/suprasellar lezyon.',
      credit: `${WIKIMEDIA} · Chanson & Salenave, Orphanet J Rare Dis 2008 · CC BY 2.0`,
      subject: 'Pituitary adenoma (MRI)',
      tags: [
        'pituitary-adenoma',
        'pituitary-microadenoma',
        'pituitary-macroadenoma',
        'sellar-mass',
      ],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/5/56/Control_MCI_AD_-_T1.jpg',
      caption: 'Hipokampal atrofi — T1 MR\'da sağlıklı kontrol, MCI ve Alzheimer hastalığının karşılaştırması.',
      credit: `${WIKIMEDIA} · Chandra et al, J Neurol 2019 · CC BY 4.0`,
      subject: 'Hippocampal atrophy / MCI',
      tags: [
        'mild-cognitive-impairment',
        'mci',
        'alzheimers-disease',
        'dementia',
        'hippocampal-atrophy',
        'cortical-atrophy',
      ],
    },
  ],

  'mri-cspine': [
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/5/58/C5-C6-herniation.jpg',
      caption: 'C5-C6 servikal disk hernisi, kord basısı ile.',
      credit: `${WIKIMEDIA} · Fo0bar · CC BY-SA 3.0`,
      subject: 'Cervical disc herniation',
      tags: ['disc-herniation', 'cervical-radiculopathy', 'cervical-disc-herniation'],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/8/83/C6-C7-disc-herniation-cevical-mri-scan.jpg',
      caption: 'C6-C7 servikal disk hernisi.',
      credit: `${WIKIMEDIA} · Anthonp · CC BY-SA 3.0`,
      subject: 'C6-C7 disc herniation',
      tags: ['disc-herniation', 'cervical-radiculopathy', 'cervical-cord-compression'],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/b/bf/Cervical_Spine_MRI_%28T2W%29.jpg',
      caption:
        'Servikal T2 MR — kord kompresyonunu düşündüren kord sinyal anomalisiyle birlikte vertebral yaralanma.',
      credit: `${WIKIMEDIA} · Андрей Королев 86 · CC BY-SA 3.0`,
      subject: 'Cervical cord compression',
      tags: [
        'cervical-cord-compression',
        'cervical-myelopathy',
        'spinal-cord-injury',
        'cord-compression',
      ],
    },
  ],

  'mri-lspine': [
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/6/63/L4-l5-disc-herniation.png',
      caption: 'L5 sinir kökünü sıkıştıran L4-L5 disk ekstrüzyonu (15 mm).',
      credit: `${WIKIMEDIA} · Edave · CC BY-SA 3.0`,
      subject: 'L4-L5 disc herniation',
      tags: [
        'disc-herniation',
        'lumbar-disc-herniation',
        'sciatica',
        'sciatica-l5',
        'radiculopathy',
      ],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/a/a5/T12compressionfracMark.png',
      caption: 'T12 vertebra kompresyon kırığı.',
      credit: `${WIKIMEDIA} · James Heilman MD · CC BY-SA 4.0`,
      subject: 'Compression fracture',
      tags: [
        'compression-fracture',
        'vertebral-compression-fracture',
        'osteoporosis-postmenopausal',
      ],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/4/4c/Lumbar_spinal_stenosis_1_8.png',
      caption: 'Lomber spinal stenoz — L4-L5 düzeyinde dejeneratif değişikliklerle birlikte ciddi daralma.',
      credit: `${WIKIMEDIA} · Jmarchn · CC BY-SA 3.0`,
      subject: 'Lumbar spinal stenosis',
      tags: [
        'spinal-stenosis',
        'lumbar-spinal-stenosis',
        'neurogenic-claudication',
      ],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/f/f6/SAGITTAL-FRFSE-T2_MRI-ANNOTATED.jpg',
      caption:
        'Lomber MR — santral kanal darlığıyla birlikte dejeneratif disk hastalığı (hemilaminektomi öncesi).',
      credit: `${WIKIMEDIA} · Ptrump16 · CC BY-SA 4.0`,
      subject: 'Central disc / cauda equina',
      tags: [
        'cauda-equina',
        'cauda-equina-syndrome',
        'central-disc-herniation',
        'modic-changes',
        'degenerative-disc-disease',
        'spondylolisthesis',
        'recurrent-disc-herniation',
        'post-laminectomy-followup',
        'epidural-fibrosis',
        'failed-back-surgery',
      ],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/2/22/M_Bechterew2_Spond_li_ISG_MR_pcor_T1_FatSAT_mit_GD.jpg',
      caption: 'Sakroiliit — kontrastlı yağ baskılı T1 MR\'da SI eklemlerinde kemik iliği ödemi.',
      credit: `${WIKIMEDIA} · Lange123 · Public domain`,
      subject: 'Sacroiliitis (MRI)',
      tags: [
        'ankylosing-spondylitis',
        'sacroiliitis',
        'axial-spondyloarthritis',
        'spondyloarthropathy',
        'si-joint-edema',
      ],
    },
  ],

  ecg: [
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/8/8a/Inferior_and_RtV_MI_12_lead.jpg',
      caption: 'İnferior STEMI — II, III, aVF\'de ST yükselmesi ve resiprokal değişiklikler.',
      credit: `${WIKIMEDIA} · James Heilman MD · CC BY-SA 4.0`,
      subject: 'Inferior STEMI',
      tags: ['stemi', 'inferior-mi', 'mi', 'acute-mi', 'acute-coronary-syndrome'],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/6/61/ECG_V2-4_ST_change.jpg',
      caption: 'Anterior STEMI — V2-V4\'te ST yükselmesi.',
      credit: `${WIKIMEDIA} · Med Chaos · CC BY-SA 4.0`,
      subject: 'Anterior STEMI',
      tags: [
        'stemi',
        'anterior-mi',
        'mi',
        'acute-mi',
        'lad-occlusion',
        'old-mi',
        'q-waves',
        'chf-nyha2',
        'ischemic-cardiomyopathy',
        'stable-angina',
        'mitral-regurgitation',
        'atrial-enlargement',
      ],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/3/34/Atrial_Fibrillation.png',
      caption: 'Atriyal fibrilasyon — düzensiz düzensiz ritim, seçilebilir P dalgası yok.',
      credit: `${WIKIMEDIA} · BruceBlaus · CC BY-SA 4.0`,
      subject: 'Atrial fibrillation',
      tags: [
        'afib',
        'atrial-fibrillation',
        'paroxysmal-afib',
        'rapid-afib',
        'ischemic-stroke',
        'cardioembolic-stroke',
      ],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/3/36/ECG_Atrial_Fibrillation.svg',
      caption: '12 derivasyonlu EKG — ~132/dk atriyal fibrilasyon.',
      credit: `${WIKIMEDIA} · Ewingdo / Marnanel · CC BY-SA 4.0`,
      subject: 'Atrial fibrillation (12-lead)',
      tags: ['afib', 'atrial-fibrillation', 'paroxysmal-afib'],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/4/43/Sinus_Bradycardia.jpg',
      caption: 'Sinüs bradikardisi — ~50/dk düzenli dar kompleks ritim.',
      credit: `${WIKIMEDIA} · Andrewmeyerson · CC BY-SA 3.0`,
      subject: 'Sinus bradycardia',
      tags: ['sinus-bradycardia', 'bradycardia', 'vasovagal', 'orthostatic-hypotension'],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/6/65/First_Degree_AV_Block_ECG_Unlabeled.jpg',
      caption: 'Birinci derece AV blok — 200 ms\'yi aşan PR aralığı, 1:1 iletim.',
      credit: `${WIKIMEDIA} · Andrewmeyerson · CC BY-SA 3.0`,
      subject: 'First-degree AV block',
      tags: [
        'first-degree-av-block',
        'av-block',
        'conduction-disease',
      ],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/9/93/De-Rhythm_Mobitz_%28CardioNetworks_ECGpedia%29.png',
      caption: 'İkinci derece AV blok (Mobitz) — atlanan vurular ve AV dissosiasyon paterni.',
      credit: `${WIKIMEDIA} · CardioNetworks ECGpedia · CC BY-SA 3.0`,
      subject: 'Second-degree AV block',
      tags: [
        'second-degree-av-block',
        'mobitz-i',
        'mobitz-ii',
        'wenckebach',
        'av-block',
      ],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/1/16/3rd_degree_heart_block.PNG',
      caption:
        'Tam kalp bloğu — P dalgaları ile QRS kompleksleri tamamen ayrışmış.',
      credit: `${WIKIMEDIA} · Gregory Marcus MD · CC BY 3.0`,
      subject: 'Complete heart block',
      tags: [
        'complete-heart-block',
        'third-degree-av-block',
        'av-block',
        'bradycardia',
      ],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/8/83/Left_Bundle_Branch_Block_ECG_Unlabeled.jpg',
      caption: 'Sol dal bloğu — I, aVL, V5-V6\'da çentikli R dalgaları ile geniş QRS.',
      credit: `${WIKIMEDIA} · Andrewmeyerson · CC BY-SA 3.0`,
      subject: 'LBBB',
      tags: [
        'lbbb',
        'left-bundle-branch-block',
        'conduction-disease',
        'bundle-branch-block',
      ],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/8/85/PericarditisECG.JPG',
      caption: 'Akut perikardit — yaygın konkav ST yükselmesi ve PR çökmesi.',
      credit: `${WIKIMEDIA} · James Heilman MD · CC BY-SA 3.0`,
      subject: 'Pericarditis',
      tags: [
        'pericarditis',
        'acute-pericarditis',
        'myopericarditis',
        'pericardial-effusion',
        'low-voltage-ecg',
      ],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/4/49/ECG_in_hyperkalemia.png',
      caption: 'Hiperkalemi — sivri (çadır) T dalgaları ve QRS genişlemesi.',
      credit: `${WIKIMEDIA} · Mikael Häggström MD · Public domain`,
      subject: 'Hyperkalemia ECG',
      tags: [
        'hyperkalemia',
        'electrolyte-disturbance',
        'ckd-stage3a',
        'aki-pre-renal',
      ],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/1/1e/Lead_II_rhythm_ventricular_tachycardia_Vtach_VT.JPG',
      caption: 'Monomorfik ventriküler taşikardi — II. derivasyonda geniş kompleks taşikardi.',
      credit: `${WIKIMEDIA} · Glenlarson · Public domain`,
      subject: 'VT',
      tags: [
        'vt',
        'ventricular-tachycardia',
        'wide-complex-tachycardia',
        'vf',
        'ventricular-pvcs',
      ],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/d/d8/Electrocardiogram_showed_a_short_PR_interval.jpg',
      caption:
        'Wolff-Parkinson-White paterni — kısa PR aralığı ve delta dalgası (pre-eksitasyon).',
      credit: `${WIKIMEDIA} · Khan Z & Khan A, Cureus 2024 · CC BY 4.0`,
      subject: 'WPW / pre-excitation',
      tags: [
        'wpw',
        'wolff-parkinson-white',
        'pre-excitation',
        'delta-wave',
        'svt',
      ],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/c/c4/Left_Ventricular_Hypertrophy_Unlabeled.jpg',
      caption: 'Sol ventrikül hipertrofisi — artmış QRS voltajı ve strain (gerilim) paterni.',
      credit: `${WIKIMEDIA} · Andrewmeyerson · CC BY-SA 3.0`,
      subject: 'LVH',
      tags: [
        'lvh',
        'left-ventricular-hypertrophy',
        'essential-hypertension',
        'htn-uncontrolled',
        'hypertensive-heart-disease',
        'hcm',
        'lvh-strain',
        'abdominal-aortic-aneurysm',
        'aaa',
      ],
    },
    {
      url: 'https://upload.wikimedia.org/wikipedia/commons/1/14/ECG_Sinus_Tachycardia_125_bpm.jpg',
      caption: 'Sinüs taşikardisi — ~125/dk düzenli dar kompleks ritim, normal P dalga morfolojisi.',
      credit: `${WIKIMEDIA} · Ewingdo · CC BY-SA 4.0`,
      subject: 'Sinus tachycardia',
      tags: [
        'sinus-tachycardia',
        'tachycardia',
        'graves-disease',
        'thyrotoxicosis',
        'hyperthyroidism',
        'panic-disorder',
        'panic-attack',
        'anxiety',
      ],
    },
  ],
};

// ───────────────────────────── Selection logic ─────────────────────────────

/** Deterministic non-crypto hash — used to pick a stable image per case. */
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function tagMatches(tags: string[] | undefined, diagnosisId: string): boolean {
  if (!tags || tags.length === 0) return false;
  const dx = diagnosisId.toLowerCase();
  return tags.some((t) => {
    const tag = t.toLowerCase();
    return dx === tag || dx.includes(tag) || tag.includes(dx);
  });
}

/**
 * Pick 1 image that best fits the given test + abnormal flag + optional
 * diagnosis. Prefer images whose `tags` match the diagnosisId; otherwise
 * fall back to a stable pick based on the diagnosis id's hash (so the
 * same patient always shows the same image on revisit).
 */
export function getImagingExamples(
  testId: string,
  abnormal: boolean,
  diagnosisId?: string,
): ImagingImage[] {
  if (!abnormal) {
    const normal = NORMAL_BY_TEST[testId];
    return normal ? [normal] : [];
  }

  const pool = ABNORMAL_BY_TEST[testId];
  if (!pool || pool.length === 0) {
    // No abnormal variants curated for this test — fall back to the normal
    // reference so the viewer still shows something rather than nothing.
    const normal = NORMAL_BY_TEST[testId];
    return normal ? [normal] : [];
  }

  // 1. Prefer a tag match against the diagnosisId.
  if (diagnosisId) {
    const matches = pool.filter((p) => tagMatches(p.tags, diagnosisId));
    if (matches.length > 0) {
      const idx = hash(diagnosisId) % matches.length;
      const { tags: _tags, ...image } = matches[idx];
      return [image];
    }
  }

  // 2. Otherwise, deterministic pick from the full pool.
  const key = diagnosisId ?? testId;
  const idx = hash(key) % pool.length;
  const { tags: _tags, ...image } = pool[idx];
  return [image];
}

/** Exposed for tests / dev tooling — returns the full pool for a test id. */
export function listImagingVariants(testId: string): {
  normal: ImagingImage | null;
  abnormal: ImagingImage[];
} {
  const abnormal = (ABNORMAL_BY_TEST[testId] ?? []).map(({ tags: _t, ...rest }) => rest);
  return {
    normal: NORMAL_BY_TEST[testId] ?? null,
    abnormal,
  };
}
