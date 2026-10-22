import { TopBar } from './primitives';
import { store } from '../game/store';
import { GUIDELINES } from '../data/guidelines';
import { POLYCLINIC_CASES } from '../data/polyclinicPatients';
import { PATIENT_CASES } from '../data/patients';

function countCases() {
  let poly = 0;
  let rubrics = 0;
  for (const [specialty, cases] of Object.entries(POLYCLINIC_CASES)) {
    if (specialty === 'all-specialties') continue;
    for (const c of cases) {
      poly += 1;
      if (c.rubric) rubrics += 1;
    }
  }
  for (const c of PATIENT_CASES) {
    if (c.rubric) rubrics += 1;
  }
  return { poly, er: PATIENT_CASES.length, rubrics, guidelines: GUIDELINES.length };
}

const COUNTS = countCases();

const STEPS = [
  {
    n: '01',
    color: 'var(--sky)',
    title: 'Görüşme',
    body: 'Öğrenci mikrofonla hastayla konuşur. Konuşma metni ve kullanılan araçlar oturum boyunca kaydedilir; öğrenci rubriği veya sistem istemini görmez.',
  },
  {
    n: '02',
    color: 'var(--mint)',
    title: 'Kanıt toplama',
    body: 'Ajan; öykü, muayene bulguları ve istenen tetkikleri vaka rubriğindeki kriterlerle eşleştirir. Her atıf, kılavuz kayıt defterindeki gerçek bir öneri kimliğine çözümlenmek zorundadır.',
  },
  {
    n: '03',
    color: 'var(--butter)',
    title: 'Değerlendirme',
    body: 'Görüşme bitince tek bir yapılandırılmış JSON üretilir: kriter kararları, güçlü yönler, gelişim alanları ve güvenlik ihlalleri.',
  },
  {
    n: '04',
    color: 'var(--peach)',
    title: 'Geri bildirim',
    body: 'Arayüz bu yapıyı Türkçe bir değerlendirme ekranına dönüştürür. Tanı ve puanlar değil, klinik muhakeme ve güvenli hasta yönetimi öne çıkarılır.',
  },
];

const TOOLS = [
  ['POST /agent/debrief', 'Rubrik + görüşme kaydını ücretsiz modele gönderir.', 'Tek çağrı'],
  ['rubric weights', 'Puanlar ve global derece sunucuda yeniden hesaplanır.', 'Sunucu'],
  ['caseEvaluationInput', 'Yanıt arayüze girmeden önce Zod ile doğrulanır.', 'İstemci'],
];

const RULES = [
  'Yalnızca vaka rubriğindeki kriterler puanlanır.',
  'Kılavuz atıfları kayıt defterinde çözümlenemezse değerlendirme reddedilir.',
  'Değerlendirme, görüşme bitmeden üretilemez.',
  'Öğrenciye tanı sızdırılmaz; geri bildirim kanıta dayalıdır.',
  'Uzman alt-ajan yoktur; kurallar ve beceriler tek ajanda birleşir.',
];

function Card({
  children,
  color = 'white',
}: {
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <div
      className="plush"
      style={{ background: color, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}
    >
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      className="plush"
      style={{ background: 'white', padding: '14px 16px', display: 'flex', flexDirection: 'column' }}
    >
      <div style={{ fontSize: 26, fontWeight: 900, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-2)', marginTop: 4 }}>{label}</div>
    </div>
  );
}

export function AgenticRoundsScreen() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>
      <TopBar here={1} steps={['Ana Sayfa', 'Ajan turları']} />

      <div style={{ maxWidth: 1040, margin: '0 auto', padding: '30px 22px 60px' }}>
        <div className="chip butter" style={{ marginBottom: 12 }}>NASIL DEĞERLENDİRİLİYOR</div>
        <h1 style={{ fontSize: 38, lineHeight: 1.08, margin: '0 0 10px' }}>
          Simülatör seni nasıl değerlendiriyor?
        </h1>
        <p style={{ fontSize: 16, lineHeight: 1.55, color: 'var(--ink-2)', maxWidth: 760, margin: 0 }}>
          Medkit bir sohbet robotu değil, OSCE tarzı bir klinik muhakeme simülatörüdür.
          Görüşme kaydı, vaka rubriği ve yayınlanmış kılavuz önerileri birlikte değerlendirilir.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, margin: '24px 0' }}>
          <Stat label="poliklinik vakası" value={COUNTS.poly} />
          <Stat label="acil vakası" value={COUNTS.er} />
          <Stat label="rubrikli vaka" value={COUNTS.rubrics} />
          <Stat label="kılavuz" value={COUNTS.guidelines} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 14 }}>
          {STEPS.map((step) => (
            <Card key={step.n} color={step.color}>
              <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: '.08em' }}>{step.n}</div>
              <div style={{ fontSize: 22, fontWeight: 900 }}>{step.title}</div>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, fontWeight: 600 }}>{step.body}</p>
            </Card>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14, marginTop: 22 }}>
          <Card>
            <div style={{ fontSize: 20, fontWeight: 900 }}>Araçlar</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {TOOLS.map(([name, body, gate]) => (
                <div key={name} style={{ borderTop: '2px solid var(--line-soft, #e8e0d4)', paddingTop: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <code style={{ fontSize: 13, fontWeight: 800 }}>{name}</code>
                    <span className={`chip ${gate === 'Onaylı' ? 'rose' : 'mint'}`} style={{ fontSize: 10 }}>{gate}</span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 4, fontWeight: 600 }}>{body}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card color="var(--butter)">
            <div style={{ fontSize: 20, fontWeight: 900 }}>Katı kurallar</div>
            <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {RULES.map((rule) => (
                <li key={rule} style={{ fontSize: 14, lineHeight: 1.45, fontWeight: 600 }}>{rule}</li>
              ))}
            </ul>
          </Card>
        </div>

        <Card color="var(--sky)">
          <div style={{ fontSize: 20, fontWeight: 900 }}>Yerel çalışma notu</div>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, fontWeight: 600 }}>
            Tüm hat ücretsiz bileşenlerle çalışır: faster-whisper (yerel STT), OpenRouter ücretsiz
            modeli (hasta + triyaj + debrief) ve edge-tts (Türkçe ses). Tek dış servis LiveKit
            Cloud'un ücretsiz WebRTC kotasıdır. Uygulamanın yayınlanmış bir adresi yoktur.
          </p>
        </Card>

        <button
          type="button"
          className="btn-plush ghost"
          style={{ marginTop: 22, fontSize: 15, padding: '12px 18px' }}
          onClick={() => store.setScreen('home')}
        >
          ← Ana sayfaya dön
        </button>
      </div>
    </div>
  );
}
