// Default full-text reports for tests that come back with no case-specific
// finding (i.e., clinically normal). Shown in the TestReportCard and on the
// result toast when the player expands the result.

export const DEFAULT_RESULTS: Record<string, string> = {
  // ───────── Yatak başı ─────────
  glucose: `PARMAK UCU KAN ŞEKERİ
Değer: 102 mg/dL
Referans: 70–140 mg/dL
Yorum: Öglisemik.`,

  'peak-flow': `ZİRVE EKSPİRATUVAR AKIM (PEF)
3 ölçümün en iyisi: 480 L/dk
Beklenen: 460 L/dk  (beklenenin %104'ü)
Yorum: Obstrüktif hava akımı kısıtlılığı yok.`,

  'urine-hcg': `İDRAR β-hCG
Sonuç: Negatif
Yorum: Gebelik saptanmadı.`,

  ecg: `EKG — 12 DERİVASYON
Hız 72/dk · Ritim: Normal sinüs
PR 160 ms · QRS 94 ms · QT/QTc 380/412 ms
Aks: Normal (+30°)
ST segmentleri izoelektrik · T dalgaları I, II, V2–V6'da pozitif
Q dalgası yok, iskemik değişiklik yok.
Yorum: Normal sinüs ritmi. Akut ST-T değişikliği yok.`,

  'strep-radt': `HIZLI STREP ANTİJENİ
Sonuç: Negatif
Yorum: Grup A streptokok saptanmadı.`,

  'flu-swab': `HIZLI İNFLUENZA A/B
İnfluenza A: Negatif
İnfluenza B: Negatif`,

  'covid-swab': `HIZLI SARS-CoV-2 ANTİJENİ
Sonuç: Negatif`,

  pocus: `POCUS — Yatak başı ultrasonografi
FAST: Morison poşu, splenorenal çukur ve pelviste serbest sıvı yok. Perikardiyal efüzyon yok.
Kardiyak parasternal uzun aks: LV kontraktilitesi korunmuş. Perikardiyal efüzyon yok.
Akciğer: İki taraflı A çizgileri. B çizgisi/konsolidasyon yok. Plevral kayma normal.
VCI: ~2 cm, inspirasyonla ≥%50 kollabe (övolemik).
Yorum: POCUS'ta anlamlı bulgu yok.`,

  // ───────── Laboratuvar — hematoloji / biyokimya ─────────
  abg: `ARTERİYEL KAN GAZI (oda havası)
pH 7,40   pCO₂ 40   pO₂ 95   HCO₃⁻ 24   BE 0
SaO₂ %97   Laktat 1,2 mmol/L
Yorum: Asit-baz dengesi ve oksijenasyon normal.`,

  lactate: `LAKTAT
Değer: 1,1 mmol/L
Referans: <2,0
Yorum: Normal. Doku hipoperfüzyonu yok.`,

  cbc: `TAM KAN SAYIMI (formülü ile)
WBC   7,2 K/µL   (ref 4,0–11,0)
  Nötrofiller %58 · Lenfositler %32 · Monositler %7 · Eozinofiller %2 · Bazofiller %1
  Mutlak nötrofil sayısı 4,2 K/µL
Hgb    14,1 g/dL  (ref 12,0–17,5)
Hct    %42         (ref 36–52)
MCV    88 fL · MCH 29,6 pg · MCHC 33,5 g/dL · RDW %13,2
Trombosit  245 K/µL  (ref 150–400)
Periferik yayma: Normositik, normokromik eritrositler. Şistosit yok, blast yok.
Yorum: Tüm parametreler normal sınırlarda.`,

  bmp: `TEMEL METABOLİK PANEL
Na⁺  140 mEq/L   (136–145)
K⁺   4,0 mEq/L   (3,5–5,0)
Cl⁻  103 mEq/L   (98–107)
CO₂  24 mEq/L    (22–30)
BUN  14 mg/dL    (7–20)
Kreatinin  0,9 mg/dL  (0,6–1,2)
eGFR >60 mL/dk/1,73 m²
Glikoz  95 mg/dL
Kalsiyum  9,4 mg/dL
Anyon açığı 13
Yorum: Elektrolitler, böbrek fonksiyonları ve glikoz normal.`,

  lft: `KARACİĞER FONKSİYON TESTLERİ
AST   22 U/L   (ref <40)
ALT   18 U/L   (ref <45)
ALP   78 U/L   (ref 40–130)
GGT   22 U/L
Total bilirubin  0,6 mg/dL   (direkt 0,2)
Albümin  4,2 g/dL
Total protein  7,0 g/dL
Yorum: Hepatik sentez ve ekskresyon fonksiyonları normal.`,

  lipase: `LİPAZ
Değer: 32 U/L
Referans: <60 U/L
Yorum: Normal sınırlarda. Pankreatit lehine biyokimyasal kanıt yok.`,

  coag: `KOAGÜLASYON PANELİ
PT   12,8 s     (ref 11,0–13,5)
INR  1,02       (ref 0,8–1,1)
aPTT  30 s      (ref 25–35)
Fibrinojen  310 mg/dL
Yorum: Koagülasyon parametreleri normal sınırlarda.`,

  bnp: `BNP
Değer: 42 pg/mL
Referans: <100 pg/mL
Yorum: Akut dekompanse kalp yetersizliği eşiğinin altında.`,

  dimer: `D-DİMER
Değer: 240 ng/mL FEU
Referans: <500 ng/mL FEU
Yorum: Negatif. Klinik olasılığı düşük hastada VTE olasılığı düşük.`,

  troponin: `YÜKSEK DUYARLILIKLI TROPONİN I
Değer: 0,01 ng/mL
Referans (99. persentil): <0,04 ng/mL
Yorum: Miyokard hasarı eşiğinin altında. Göğüs ağrısı protokolüne göre seri takip düşünün.`,

  tsh: `TİROİD UYARICI HORMON
TSH: 2,1 µIU/mL   (ref 0,4–4,0)
Yorum: Ötiroid.`,

  'type-screen': `KAN GRUBU ve ANTİKOR TARAMASI
ABO/Rh: O Rh pozitif
Antikor taraması: Negatif
Yorum: Beklenmeyen antikor yok. Gerekirse kan ürünleri çapraz uyumlu.`,

  urine: `TAM İDRAR — dipstick + mikroskopi
Renk sarı · Berraklık berrak · Dansite 1,015 · pH 6,0
Protein neg · Glikoz neg · Keton neg
Kan neg · Lökosit esteraz neg · Nitrit neg
Mikroskopi: 0–2 WBC/büyük büyütme alanı · 0–2 RBC/büyük büyütme alanı · Silendir yok · Bakteri yok
Yorum: Anlamlı bulgu yok. İYE veya hematüri kanıtı yok.`,

  'urine-cx': `İDRAR KÜLTÜRÜ (ön sonuç)
Gram boyama: Az sayıda skuamöz epitel hücresi. Mikroorganizma görülmedi.
48 saatlik sonuç beklemede. Ön sonuç: 24. saatte üreme yok.`,

  'blood-cx': `KAN KÜLTÜRLERİ (×2 set, ön sonuç)
Set 1 (aerobik + anaerobik): İnkübasyon süresince üreme yok.
Set 2 (aerobik + anaerobik): İnkübasyon süresince üreme yok.
Kesin sonuç 48–72. saatte.`,

  utox: `İDRAR TOKSİKOLOJİ TARAMASI
Amfetaminler: negatif
Benzodiazepinler: negatif
Kannabinoidler: negatif
Kokain: negatif
Opiyatlar: negatif
Barbitüratlar: negatif
PCP: negatif
Yorum: Standart panelde saptanabilir madde yok.`,

  // ───────── Görüntüleme — röntgen ─────────
  cxr: `AKCİĞER GRAFİSİ — PA / Lateral
Kalp silueti: Boyut ve kontur normal. Kardiyotorasik oran <0,5.
Mediasten: Normal genişlikte. Kitle yok.
Akciğerler: İki taraflı temiz. Fokal opasite, efüzyon veya pnömotoraks yok.
Hiler bölgeler: Simetrik, lenfadenopati yok.
Plevra: Anlamlı bulgu yok.
Kemikler / yumuşak dokular: Akut kemik patolojisi yok.
Yorum: Akut kardiyopulmoner bulgu yok.`,

  kub: `AYAKTA DİREKT BATIN GRAFİSİ (KUB)
Spesifik olmayan barsak gazı paterni. Serbest intraperitoneal hava yok.
İnce veya kalın barsakta dilate ans yok. Belirgin hava-sıvı seviyesi yok.
Üriner sistem boyunca radyoopak taş yok.
Kemik yapılar: Anlamlı bulgu yok.
Yorum: KUB'da anlamlı bulgu yok.`,

  'xr-extrem': `EKSTREMİTE GRAFİSİ
Akut kırık veya çıkık yok.
Eklem aralıkları korunmuş. Belirgin dejeneratif değişiklik yok.
Yumuşak dokular normal.
Yorum: Akut kemik yaralanması yönünden negatif.`,

  'xr-spine': `OMURGA GRAFİSİ
Dizilim korunmuş. Vertebra korpus yükseklikleri korunmuş.
Akut kırık yok. Disk aralıkları korunmuş.
Yorum: Akut kemik patolojisi yok.`,

  'xr-pelvis': `PELVİS GRAFİSİ
Pelvik halka intakt. İliak, iskiyal veya pubik ramusta kırık yok.
Kalçalar: Femur başları yerinde. Eklem aralıkları korunmuş.
Yorum: Akut pelvik kırık yok.`,

  'us-abdomen': `BATIN ULTRASONOGRAFİSİ
Karaciğer: Kontur ve ekojenite normal. Fokal lezyon yok.
Safra kesesi: Duvar ince, taş yok, sonografik Murphy bulgusu yok.
Koledok (CBD): 4 mm. Safra yolu genişlemesi yok.
Pankreas: Barsak gazı ile kısmen kapalı; görüntülenen kısımlarda anlamlı bulgu yok.
Dalak: Normal boyut (10,5 cm).
Böbrekler: İki taraflı normal boyut, hidronefroz yok, taş yok.
Aort: Bifurkasyona kadar normal çap. Anevrizma yok.
Yorum: Normal batın ultrasonografisi.`,

  'us-pelvis': `PELVİK ULTRASONOGRAFİ (transabdominal ± transvajinal)
Uterus: Boyut ve ekojenite normal. Endometrium 6 mm.
Overler: İki taraflı normal boyut. Kist veya kitle yok.
Pelviste serbest sıvı yok.
Yorum: Pelvik ultrasonografide anlamlı bulgu yok.`,

  echo: `EKOKARDİYOGRAFİ — Transtorasik
LV boyutu: Normal. LVEF görsel olarak %55–60.
Duvar hareketi: Normal. Bölgesel duvar hareket bozukluğu yok.
RV boyut ve fonksiyonu: Normal.
Kapaklar: Eser triküspit yetersizliği (fizyolojik). Darlık yok. Vejetasyon yok.
Perikard: Efüzyon yok.
VCI: Normal çap, derin inspirasyonla >%50 kollaps (RAP ≤3 mmHg).
Yorum: Normal LV sistolik fonksiyonu. Yapısal anormallik yok.`,

  'ct-head': `KRANİYAL BT — kontrastsız
İntrakraniyal hemoraji yok.
Kitle etkisi veya orta hat kayması yok.
Gri-beyaz cevher ayrımı korunmuş.
Ventriküller yaşa uygun. Bazal sisternalar açık.
Ekstra-aksiyal koleksiyon yok. Kafatası kırığı yok.
Paranazal sinüsler ve mastoid hücreler açık.
Yorum: Akut intrakraniyal patoloji yok.`,

  'ct-chest': `TORAKS BT — kontrastlı / kontrastsız
Akciğerler: Temiz. Pulmoner nodül, kitle, infiltrasyon veya efüzyon yok.
Hava yolları: Açık.
Mediasten: Damarlar ve lenf nodları normal. Kitle yok.
Kalp: Normal boyut, perikardiyal efüzyon yok.
Plevra: Anlamlı bulgu yok.
Kemik yapılar: Akut bulgu yok.
Yorum: Akut kardiyopulmoner patoloji yok.`,

  'ct-angio': `BT ANJİYOGRAFİ — Toraks / Pulmoner
Ana, lober, segmental ve subsegmental pulmoner arterlerde dolum defekti yok.
Akut pulmoner emboli kanıtı yok.
Aort normal çapta; diseksiyon veya anevrizma yok.
Akciğerler ve plevra: Akut anormallik yok.
Yorum: Pulmoner emboli yok. Aort diseksiyonu yok.`,

  'ct-abdomen': `BATIN / PELVİS BT — IV kontrastlı
Karaciğer, dalak, pankreas, sürrenaller: Anlamlı bulgu yok.
Safra kesesi: Duvar ince. Taş yok.
Böbrekler / üreterler: Hidronefroz yok, taş yok.
Barsaklar: Normal çap ve duvar kalınlığı. Obstrüksiyon yok. Serbest hava yok.
Apendiks: Normal çap (5 mm). Periapendiküler yağ kirlenmesi yok.
Aort / vasküler yapılar: Normal. Anevrizma veya diseksiyon yok.
Pelvik organlar: Anlamlı bulgu yok.
Mesane: Anlamlı bulgu yok.
Serbest sıvı yok. Lenfadenopati yok.
Yorum: Akut intraabdominal patoloji yok.`,

  'ct-cspine': `SERVİKAL OMURGA BT — kontrastsız
Dizilim korunmuş. Vertebra korpus yükseklikleri korunmuş.
C1'den T1'e kadar akut kırık yok.
Faset eklemleri ve disk aralıkları korunmuş.
Prevertebral yumuşak doku şişliği yok.
Yorum: Akut servikal omurga yaralanması yok.`,

  'mri-brain': `BEYİN MR (DWI / FLAIR / T1 / T2 / GRE)
Difüzyon kısıtlaması yok. Akut enfarkt yok.
Yaşa uygun kronik mikrovasküler değişiklikler dışında FLAIR hiperintensitesi yok.
Kitle, hemoraji veya orta hat kayması yok.
Ventriküller ve sisternalar normal.
Vasküler akım voidleri korunmuş.
Yorum: MR'da akut intrakraniyal patoloji yok.`,

  'mri-cspine': `SERVİKAL OMURGA MR
Dizilim korunmuş. Akut kırık yok.
Diskler: Yaşa uygun hafif dehidratasyon. Anlamlı herniasyon yok.
Spinal kord: Normal kalibr ve sinyal. Kord kompresyonu yok.
Nöral foramenler iki taraflı açık.
Yorum: Akut kord veya sinir kökü kompresyonu yok.`,

  'mri-lspine': `LOMBER OMURGA MR
Dizilim korunmuş. Vertebra korpus yükseklikleri korunmuş.
Diskler: L4-5 ve L5-S1'de hafif dejeneratif dehidratasyon. Anlamlı herniasyon yok.
Tecal kese / konus: Normal. Kord veya kauda kompresyonu yok.
Yorum: Hafif çok seviyeli dejeneratif değişiklikler; akut kord kompresyonu yok.`,

  'mri-abd': `BATIN MR + MRKP
Karaciğer, dalak, pankreas, böbrekler, sürrenaller: Anlamlı bulgu yok.
Safra yolları: Obstrüksiyon, dolum defekti veya darlık olmaksızın normal çap.
Pankreatik kanal: Normal çap.
Serbest sıvı yok.
Yorum: Normal batın MR / MRKP.`,

  // ───────── Endokrin / metabolik ─────────
  hba1c: `HEMOGLOBİN A1c
Sonuç: %5,4
Referans: <%5,7 (normal); %5,7–6,4 prediyabet; ≥%6,5 diyabet
Yorum: Son 3 ayda glisemik kontrol normal.`,

  lipid: `LİPİD PANELİ (açlık)
Total kolesterol: 178 mg/dL  (<200)
LDL-K:            102 mg/dL  (<100 optimal, <130 optimale yakın)
HDL-K:             54 mg/dL  (>40 E / >50 K)
Trigliserid:      120 mg/dL  (<150)
Non-HDL-K:        124 mg/dL
Yorum: Lipid profili referans aralığında.`,

  'vit-d': `D VİTAMİNİ, 25-HİDROKSİ
Sonuç: 38 ng/mL
Referans: 30–80 ng/mL
Yorum: Yeterli.`,

  b12: `B12 VİTAMİNİ / FOLAT
B12 vitamini: 540 pg/mL  (200–900)
Folat (serum): 12 ng/mL  (>4)
Yorum: B12 ve folat referans aralığında.`,

  iron: `DEMİR ÇALIŞMALARI
Serum demiri:      88 µg/dL   (60–170)
TDBK:             310 µg/dL   (250–450)
Transferrin sat.:  %28        (20–50)
Ferritin:         110 ng/mL   (30–300 E / 15–200 K)
Yorum: Demir depoları yeterli. Demir eksikliği anemisi kanıtı yok.`,

  ferritin: `FERRİTİN
Sonuç: 95 ng/mL
Referans: 30–300 (E) / 15–200 (K)
Yorum: Referans aralığında.`,

  'free-t4': `TİROİD SERBEST HORMONLARI
Serbest T4: 1,2 ng/dL  (0,8–1,8)
Serbest T3: 3,0 pg/mL  (2,3–4,2)
Yorum: Serbest tiroid hormonları referans aralığında.`,

  cortisol: `SABAH KORTİZOLÜ (08:00)
Sonuç: 14 µg/dL
Referans: 6–23 µg/dL (sabah)
Yorum: Adrenal kortizol üretimi yeterli. Adrenal yetersizlik kanıtı yok.`,

  'beta-hcg-q': `β-hCG, KANTİTATİF SERUM
Sonuç: <2 mIU/mL
Referans: <5 mIU/mL (gebe olmayan)
Yorum: Gebelik yönünden negatif.`,

  psa: `PROSTAT SPESİFİK ANTİJENİ
Sonuç: 1,2 ng/mL
Referans (yaşa göre): <2,5 (40–49) / <3,5 (50–59) / <4,5 (60–69) / <6,5 (70+)
Yorum: Yaşa göre referans aralığında.`,

  // ───────── Enflamasyon / enfeksiyon ─────────
  crp: `C-REAKTİF PROTEİN
Sonuç: 2,1 mg/L
Referans: <5 mg/L
Yorum: Belirgin sistemik enflamasyon kanıtı yok.`,

  esr: `ERİTROSİT SEDİMANTASYON HIZI
Sonuç: 8 mm/saat
Referans: <20 (E) / <30 (K)
Yorum: Referans aralığında.`,

  procal: `PROKALSİTONİN
Sonuç: 0,05 ng/mL
Referans: <0,10 (bakteriyel enfeksiyon riski düşük)
Yorum: Bakteriyel sepsis olasılığı düşük.`,

  hiv: `HIV 4. NESİL Ag/Ab KOMBİNE TEST
HIV-1/2 Ab: Reaktif değil
HIV-1 p24 Ag: Reaktif değil
Yorum: Negatif. HIV enfeksiyonu lehine serolojik kanıt yok.`,

  'hep-b': `HEPATİT B SEROLOJİSİ
HBsAg: Negatif
Anti-HBs: Pozitif (bağışık)
Anti-HBc total: Negatif
Yorum: Hepatit B'ye bağışık (aşı yanıtı). Aktif veya geçirilmiş enfeksiyon yok.`,

  'hep-c': `HEPATİT C ANTİKORU
Anti-HCV: Reaktif değil
Yorum: HCV ile karşılaşma lehine serolojik kanıt yok.`,

  rpr: `RPR / VDRL (SİFİLİZ)
Sonuç: Reaktif değil
Yorum: Sifiliz lehine serolojik kanıt yok.`,

  // ───────── Otoimmün ─────────
  ana: `ANTİNÜKLEER ANTİKOR (ANA)
Titre: <1:80  (Negatif)
Patern: Yok
Yorum: Tarama dilüsyonunda saptanabilir ANA yok.`,

  rf: `ROMATOİD FAKTÖR
Sonuç: <14 IU/mL
Referans: <14 IU/mL
Yorum: Negatif.`,

  'anti-ccp': `ANTİ-SİKLİK SİTRÜLİNE PEPTİT (CCP)
Sonuç: <20 U/mL
Referans: <20 U/mL
Yorum: Negatif.`,

  dsdna: `ANTİ-ÇİFT ZİNCİRLİ DNA
Sonuç: <10 IU/mL
Referans: <30 IU/mL
Yorum: Negatif.`,

  'c3-c4': `KOMPLEMAN
C3: 110 mg/dL  (90–180)
C4: 28 mg/dL  (10–40)
Yorum: Kompleman düzeyleri referans aralığında.`,

  // ───────── Gaita ─────────
  'stool-cx': `GAITA KÜLTÜRÜ
Sonuç: Salmonella, Shigella, Campylobacter veya E. coli O157 izole edilmedi.
Yorum: Rutin enterik patojenler yönünden negatif.`,

  fobt: `GAITADA GİZLİ KAN (FIT)
Sonuç: Negatif
Yorum: Gaitada saptanabilir hemoglobin yok.`,

  calpro: `GAITA KALPROTEKTİNİ
Sonuç: 32 µg/g
Referans: <50 µg/g
Yorum: İntestinal enflamasyonu düşündüren eşiğin altında.`,

  'h-pylori': `H. PYLORI GAITA ANTİJENİ
Sonuç: Negatif
Yorum: Aktif H. pylori enfeksiyonu saptanmadı.`,

  // ───────── Psikiyatri ilaç düzeyleri ─────────
  lithium: `LİTYUM DÜZEYİ
Sonuç: 0,7 mmol/L
Terapötik: 0,6–1,2 mmol/L (akut) / 0,4–0,8 (idame)
Yorum: Terapötik aralıkta.`,

  valproate: `VALPROAT DÜZEYİ
Sonuç: 75 µg/mL
Terapötik: 50–100 µg/mL
Yorum: Terapötik aralıkta.`,

  // ───────── Branş görüntüleme / fonksiyonel ─────────
  dexa: `DEXA KEMİK YOĞUNLUĞU
Lomber omurga T-skoru: −0,4
Femur boynu T-skoru: −0,6
Yorum: Normal kemik yoğunluğu (T-skoru > −1,0). Osteopeni veya osteoporoz yok.`,

  mammogram: `MAMOGRAFİ (BI-RADS)
İki taraflı tarama görüntüleri anlamlı bulgu içermiyor. Simetrik fibroglandüler doku.
Şüpheli kitle, kalsifikasyon veya yapısal distorsiyon yok.
BI-RADS Kategorisi: 1 (negatif).
Yorum: Negatif. Rutin tarama önerilir.`,

  oct: `OCT — RETİNA / OPTİK SİNİR
Makula: Foveal kontur korunmuş. Subretinal sıvı, druzen veya pigment epitel dekolmanı yok.
Retinal sinir lifi tabakası: Simetrik, yaşa uygun kalınlıkta.
Yorum: Makula ve RNFL anatomisi normal.`,

  'visual-field': `GÖRME ALANI (Humphrey 24-2)
Ortalama sapma: 0 dB. Patern standart sapması: normal sınırlarda.
Tekrarlanabilir skotom, hemianopi veya daralma yok.
Yorum: İki taraflı tam görme alanı.`,

  fundoscopy: `DİLATE FUNDUS MUAYENESİ
Optik diskler: Sınırları keskin. İki taraflı çukur/disk oranı 0,3.
Damarlar: Normal kalibr ve oran.
Makula: Foveal ışık refleksi korunmuş. Eksüda, hemoraji veya druzen yok.
Perifer: Yatık, yırtık yok, dekolman yok.
Yorum: Normal fundus muayenesi.`,

  audiometry: `SAF SES ODYOMETRİSİ
Sağ: 250–8000 Hz eşikleri 5–15 dB.
Sol:  250–8000 Hz eşikleri 5–15 dB.
Konuşma alım eşiği: İki taraflı 10 dB. Ayırt etme %100.
Yorum: İki taraflı normal işitme.`,

  eeg: `EEG (rutin, uyanık + uykulu)
Zemin: İyi organize 9–10 Hz posterior dominant ritim, göz açmaya reaktif.
Fokal yavaşlama yok. Epileptiform deşarj yok. Fotik ve hiperventilasyon aktivasyonu anlamlı değil.
Yorum: Uyanık ve uykulu EEG normal.`,

  'emg-ncs': `EMG / SİNİR İLETİMİ
Üst ve alt ekstremitede motor ve duyusal sinir ileti çalışmaları: amplitüdler, latanslar, ileti hızları normal sınırlarda.
İğne EMG: spontan aktivite yok, motor ünite morfolojisi ve rekrütmanı normal.
Yorum: Normal EMG / sinir ileti çalışması. Nöropati, radikülopati veya miyopati lehine elektrodiagnostik kanıt yok.`,

  spirometry: `SOLUNUM FONKSİYON TESTLERİ
FEV1: 3,6 L (beklenenin %96'sı)
FVC:  4,5 L (beklenenin %98'i)
FEV1/FVC: %80  (>0,70)
DLCO: beklenenin %92'si
Yorum: Normal spirometri. Obstrüktif veya restriktif defekt yok.`,

  'pap-smear': `PAP / HPV BİRLİKTE TESTİ
Sitoloji: İntraepitelyal lezyon veya malignite yönünden negatif (NILM).
Yüksek riskli HPV paneli: Negatif.
Yorum: Negatif. Rutin tarama aralığı.`,

  'skin-biopsy': `DERİ BİYOPSİSİ (punch / shave)
Histoloji: Materyal beklemede — ön izlenim benign enflamatuar dermatoz ile uyumlu.
Atipik melanosit yok. Malignite yok.
Yorum: Ön değerlendirmede malign özellik yok.`,
};

export function getTestReport(
  testId: string,
  caseSpecific: string | undefined,
  abnormal: boolean
): { text: string; abnormal: boolean } {
  if (caseSpecific) return { text: caseSpecific, abnormal };
  const defaultText = DEFAULT_RESULTS[testId] ?? 'Tetkik tamamlandı. Anlamlı bulgu yok.';
  return { text: defaultText, abnormal: false };
}
