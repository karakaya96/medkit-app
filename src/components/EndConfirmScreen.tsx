import { DoodleScatter, PatientFace, TopBar } from './primitives';
import { getCase } from '../data/cases';
import { store, useStore, useTweaks } from '../game/store';
import type { EndConfirmChecks } from '../game/types';

interface Item {
  id: keyof EndConfirmChecks;
  label: string;
  sub: string;
}

const ITEMS: Item[] = [
  { id: 'sum', label: 'Hastaya öyküyü özetledin mi?', sub: 'Kısa bir geri okuma yeterli.' },
  { id: 'safe', label: 'Güvenlik ağı kurdun mu?', sub: 'Nelere dikkat etmeli, ne zaman geri gelmeli.' },
  { id: 'ice', label: 'Hastanın düşünce, endişe ve beklentilerini ele aldın mı?', sub: 'Hasta kendini dinlenmiş hissetti mi?' },
];

export function EndConfirmScreen() {
  const tweaks = useTweaks();
  const checked = useStore((s) => s.endConfirm);
  const caseId = useStore((s) => s.selectedCaseId);
  const mode = useStore((s) => s.encounterMode);
  const completedCount = useStore((s) => s.sessionEncounters.length);
  const c = getCase(caseId);

  return (
    <div className="screen" style={{ background: 'var(--cream)', position: 'relative' }}>
      <TopBar
        here={5}
        steps={
          mode === 'er'
            ? ['Acil Servis', 'Triyaj', 'Vaka', 'Brifing', 'Muayene', 'Kapanış']
            : ['Poliklinik', 'Pratisyen', 'Vaka', 'Brifing', 'Muayene', 'Kapanış']
        }
      />

      <DoodleScatter
        items={[
          { kind: 'sparkle', x: 60, y: 90, size: 22, color: '#FFD86B' },
          { kind: 'sparkle', x: '88%', y: 130, size: 20, color: '#5AB7F2' },
        ]}
      />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          top: 67,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 40,
        }}
      >
        <div
          className="plush-lg"
          style={{
            width: 720,
            background: '#FFFCF3',
            padding: 36,
            position: 'relative',
            transform: 'rotate(-0.8deg)',
          }}
        >
          <div style={{ position: 'absolute', right: -38, top: -50 }}>
            <div className="floaty">
              <PatientFace style={tweaks.avatarStyle} skin={c.skin} hair={c.hair} size={110} mood="happy" />
            </div>
            <div style={{ position: 'absolute', left: -156, top: 16, width: 160 }}>
              <div
                style={{
                  position: 'relative',
                  background: 'white',
                  border: '3.5px solid var(--line)',
                  borderRadius: 'var(--r-md)',
                  padding: '8px 12px',
                  fontWeight: 700,
                  fontSize: 12,
                  boxShadow: 'var(--plush-sm)',
                }}
              >
                "Bilmem gereken başka bir şey var mı?"
                <svg style={{ position: 'absolute', right: -14, top: 14 }} width="20" height="22" viewBox="0 0 20 22">
                  <path
                    d="M 0 4 L 18 12 L 0 18 Z"
                    fill="white"
                    stroke="var(--line)"
                    strokeWidth="3.5"
                    strokeLinejoin="round"
                  />
                  <line x1="0" y1="4" x2="0" y2="18" stroke="white" strokeWidth="4" />
                </svg>
              </div>
            </div>
          </div>

          <div className="chip butter" style={{ marginBottom: 16 }}>
            BİTMEDEN ÖNCE
          </div>
          <h1 style={{ fontSize: 32, lineHeight: 1.1, marginBottom: 8 }}>Bir nefes al.</h1>
          <div
            style={{
              fontSize: 15,
              color: 'var(--ink-2)',
              fontWeight: 600,
              marginBottom: 10,
              maxWidth: 460,
            }}
          >
            Son bir kontrol — bunlar değerlendirmeni etkiler. Gerçekten yaptıklarını işaretle.
          </div>
          <div
            className="chip"
            style={{ marginBottom: 22, background: 'var(--sky)', fontSize: 11 }}
          >
            {mode === 'er'
              ? 'Bu görüşme değerlendirilecek.'
              : completedCount > 0
                ? `Bu oturumda ${completedCount} tamamlanmış hasta değerlendirilecek.`
                : 'Değerlendirilecek tamamlanmış görüşme yok; önce bir hastayı muayene et.'}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 22 }}>
            {ITEMS.map((it) => {
              const on = checked[it.id];
              return (
                <div
                  key={it.id}
                  className="tap"
                  onClick={() => store.toggleEndConfirm(it.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '12px 14px',
                    background: on ? 'var(--mint)' : 'white',
                    border: '3px solid var(--line)',
                    borderRadius: 16,
                    boxShadow: 'var(--plush-tiny)',
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: on ? 'white' : 'var(--cream)',
                      border: '3px solid var(--line)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 900,
                      fontSize: 18,
                      color: 'var(--mint-deep)',
                    }}
                  >
                    {on ? '✓' : ''}
                  </div>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 15 }}>{it.label}</div>
                    <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--ink-2)' }}>{it.sub}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              type="button"
              className="btn-plush ghost"
              style={{ flex: 1 }}
              onClick={() => store.setScreen('encounter')}
            >
              ← Muayene odasına dön
            </button>
            <button
              type="button"
              className="btn-plush primary"
              style={{ flex: 1.4 }}
              onClick={() => store.setScreen('debrief')}
            >
              Görüşmeyi bitir →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
