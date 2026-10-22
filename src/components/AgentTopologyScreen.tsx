import { TopBar } from './primitives';
import { store } from '../game/store';

type Tone = 'cream' | 'sky' | 'mint' | 'butter' | 'peach' | 'rose';

interface Node {
  badge: string;
  tone: Tone;
  title: string;
  body: string;
  files: string[];
  meta?: string;
}

const ENCOUNTER: Node[] = [
  {
    badge: 'ÖĞRENCİ',
    tone: 'cream',
    title: 'Mikrofon ve hoparlör',
    body: 'Tarayıcıdan sesli görüşme; metin girişi de desteklenir. Öğrenci hastayı görür, rubriği görmez.',
    files: ['src/components/EncounterScreen.tsx', 'src/voice/conversation.ts'],
  },
  {
    badge: 'STT',
    tone: 'sky',
    title: 'faster-whisper',
    body: 'Türkçe konuşmayı yerelde yazıya çevirir. API anahtarı ve ücret gerektirmez.',
    files: ['backend/voice_agent.py'],
    meta: 'WHISPER_MODEL=base',
  },
  {
    badge: 'HASTA LLM',
    tone: 'mint',
    title: 'Nemotron · OpenRouter',
    body: 'Vakanın gizli gerçeklerinden kurulan kişilik istemiyle hastayı canlandırır. Metin ve ses aynı modeli kullanır.',
    files: ['backend/voice_agent.py', 'backend/server.py'],
    meta: 'nvidia/nemotron-3-ultra:free',
  },
  {
    badge: 'TTS',
    tone: 'butter',
    title: 'edge-tts',
    body: 'Yanıtı Türkçe bir sesle okur; cinsiyete göre ses seçilir. Yerel ve ücretsizdir.',
    files: ['backend/voice_agent.py'],
    meta: 'tr-TR-AhmetNeural / EmelNeural',
  },
];

const EVALUATION: Node[] = [
  {
    badge: 'KAYIT',
    tone: 'cream',
    title: 'Transkript + araç günlüğü',
    body: 'Görüşme metni, istenen tetkikler, muayeneler ve araç çağrıları değerlendirmeye girdi olur.',
    files: ['src/agents/debriefRequest.ts', 'src/game/store.ts'],
  },
  {
    badge: 'AJAN',
    tone: 'peach',
    title: 'Ücretsiz değerlendirme modeli',
    body: 'Vaka rubriği ve kılavuz önerileriyle klinik muhakemeyi değerlendirir. OpenRouter ücretsiz modeli kullanır; ücretli API gerekmez.',
    files: ['backend/server.py', 'src/agents/useAttendingDebrief.ts'],
    meta: 'openrouter/free',
  },
  {
    badge: 'ARAÇ',
    tone: 'rose',
    title: 'render_case_evaluation',
    body: 'Tek ve yapılandırılmış bir değerlendirme üretir. Kritik bulgu işaretleme kullanıcı onayına bağlıdır.',
    files: ['src/agents/customTools.ts', 'src/agents/useAttendingDebrief.ts'],
  },
  {
    badge: 'ÇIKTI',
    tone: 'butter',
    title: 'Türkçe debrief',
    body: 'Kriter kararları, güçlü yönler, gelişim alanları ve güvenlik ihlalleri arayüzde Türkçe gösterilir.',
    files: ['src/components/DebriefScreen.tsx'],
  },
];

const SOURCES = [
  ['Vaka rubrikleri', 'src/data/polyclinicPatients.ts · src/data/patients.ts'],
  ['Kılavuz kayıt defteri', 'src/data/guidelines.ts — birebir yayın alıntıları'],
  ['Klinik branşlar', 'src/game/clinic.ts'],
  ['Araç şeması', 'backend/server.py · src/agents/customTools.ts'],
];

function NodeCard({ node }: { node: Node }) {
  return (
    <div
      className="plush"
      style={{
        background: `var(--${node.tone})`,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 7,
        minHeight: 132,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span className="chip" style={{ background: 'white', fontSize: 10 }}>{node.badge}</span>
        {node.meta && (
          <code style={{ fontSize: 10, fontWeight: 800, color: 'var(--ink-2)', textAlign: 'right' }}>
            {node.meta}
          </code>
        )}
      </div>
      <div style={{ fontSize: 18, fontWeight: 900, lineHeight: 1.15 }}>{node.title}</div>
      <div style={{ fontSize: 13, lineHeight: 1.4, fontWeight: 600, color: 'var(--ink-2)' }}>{node.body}</div>
      <div style={{ marginTop: 'auto', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {node.files.map((file) => (
          <code
            key={file}
            style={{
              fontSize: 10,
              fontWeight: 700,
              background: 'rgba(255,255,255,.65)',
              border: '1.5px solid var(--line)',
              borderRadius: 6,
              padding: '2px 5px',
            }}
          >
            {file}
          </code>
        ))}
      </div>
    </div>
  );
}

function Lane({
  label,
  sub,
  nodes,
}: {
  label: string;
  sub: string;
  nodes: Node[];
}) {
  return (
    <section style={{ marginTop: 26 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
        <div className="chip butter" style={{ fontSize: 10 }}>{label}</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-2)' }}>{sub}</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 }}>
        {nodes.map((node) => <NodeCard key={node.title} node={node} />)}
      </div>
    </section>
  );
}

export function AgentTopologyScreen() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>
      <TopBar here={1} steps={['Ana Sayfa', 'Ajan topolojisi']} />

      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '30px 22px 60px' }}>
        <div className="chip peach" style={{ marginBottom: 12 }}>CANLI HARİTA</div>
        <h1 style={{ fontSize: 38, lineHeight: 1.08, margin: '0 0 10px' }}>
          Değerlendirme ajanı nasıl çalışır?
        </h1>
        <p style={{ fontSize: 16, lineHeight: 1.55, color: 'var(--ink-2)', maxWidth: 780, margin: 0 }}>
          İki hat vardır: görüşme sırasında çalışan ücretsiz ses hattı ve görüşme sonunda
          kanıtı puanlayan değerlendirme hattı. Aşağıdaki harita gerçek dosya ve modelleri gösterir.
        </p>

        <Lane label="GÖRÜŞME" sub="Yerel ve ücretsiz — sesli hasta simülasyonu" nodes={ENCOUNTER} />

        <div style={{ textAlign: 'center', fontSize: 26, fontWeight: 900, color: 'var(--ink-2)', marginTop: 8 }}>
          ↓
        </div>

        <Lane label="DEĞERLENDİRME" sub="Rubrik + kılavuz kanıtı — Türkçe geri bildirim" nodes={EVALUATION} />

        <section style={{ marginTop: 28 }}>
          <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 10 }}>Kanıt kaynakları</div>
          <div
            className="plush"
            style={{ background: 'white', padding: '6px 18px', display: 'flex', flexDirection: 'column' }}
          >
            {SOURCES.map(([title, path], i) => (
              <div
                key={title}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 14,
                  padding: '12px 0',
                  borderTop: i === 0 ? 'none' : '2px solid var(--line-soft, #efe7db)',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 800 }}>{title}</div>
                <code style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-2)' }}>{path}</code>
              </div>
            ))}
          </div>
        </section>

        <div
          className="plush"
          style={{ background: 'var(--sky)', padding: 18, marginTop: 18, fontSize: 14, lineHeight: 1.55, fontWeight: 600 }}
        >
          Bu ekran bir demo haritasıdır; canlı model çıktısı göstermez. Uygulamanın yayınlanmış bir
          adresi yoktur, yalnızca localde çalışır. Değerlendirme OpenRouter ücretsiz modeliyle çalışır;
          yalnızca OPENROUTER_API_KEY gerekir. Ses hattı da ücretsiz bileşenler kullanır.
        </div>

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
