import { DoodleScatter, TopBar } from './primitives';
import { PATIENT_CASES } from '../data/patients';
import { ER_BED_COUNT, store, useGameState, useTweaks } from '../game/store';
import type { PatientCase, Severity } from '../game/types';

const SEVERITY_META: Record<
  Severity,
  { label: string; short: string; bg: string; color: string }
> = {
  critical: { label: 'Kritik · hemen', short: 'Kırmızı', bg: 'var(--rose)', color: 'var(--rose-deep)' },
  urgent: { label: 'Öncelikli', short: 'Sarı', bg: 'var(--butter)', color: 'var(--butter-deep)' },
  stable: { label: 'Stabil', short: 'Yeşil', bg: 'var(--mint)', color: 'var(--mint-deep)' },
};

function caseById(id: string | null): PatientCase | null {
  if (!id) return null;
  return PATIENT_CASES.find((c) => c.id === id) ?? null;
}

function VitalLine({ c }: { c: PatientCase }) {
  return (
    <div style={{ fontSize: 11, color: 'var(--ink-2)', fontWeight: 700, letterSpacing: '.02em' }}>
      {c.vitals.hr} nabız · {c.vitals.bp} mmHg · {c.vitals.spo2}% SpO₂ · {c.vitals.temp.toFixed(1)}°C
    </div>
  );
}

function BedCard({
  bedNumber,
  patient,
  onStart,
}: {
  bedNumber: number;
  patient: PatientCase | null;
  onStart: () => void;
}) {
  const meta = patient ? SEVERITY_META[patient.severity] : null;

  return (
    <div
      className="plush-lg"
      style={{
        background: patient ? '#FFFCF3' : 'var(--cream-2)',
        padding: 18,
        minHeight: 210,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        position: 'relative',
        border: patient ? '3px solid var(--line)' : '3px dashed var(--line)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="chip" style={{ fontSize: 10 }}>
          YATAK {bedNumber + 1}
        </span>
        {meta && (
          <span
            className="chip"
            style={{ background: meta.bg, color: meta.color, fontSize: 10, fontWeight: 900 }}
          >
            {meta.label}
          </span>
        )}
      </div>

      {patient ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: meta?.bg ?? 'var(--cream)',
                border: '3px solid var(--line)',
                display: 'grid',
                placeItems: 'center',
                fontSize: 22,
                flexShrink: 0,
              }}
            >
              {patient.gender === 'F' ? '👩' : '👨'}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 900, fontSize: 16, lineHeight: 1.1 }}>{patient.name}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-2)' }}>
                {patient.age} yaş · {patient.gender === 'F' ? 'Kadın' : 'Erkek'}
              </div>
            </div>
          </div>

          <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.35 }}>
            “{patient.chiefComplaint.length > 110 ? `${patient.chiefComplaint.slice(0, 107)}…` : patient.chiefComplaint}”
          </div>

          <VitalLine c={patient} />

          <div style={{ marginTop: 'auto', display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="btn-plush primary"
              style={{ flex: 1, fontSize: 13, padding: '9px 12px' }}
              onClick={onStart}
            >
              Muayeneye başla
            </button>
          </div>
        </>
      ) : (
        <div
          style={{
            margin: 'auto',
            textAlign: 'center',
            color: 'var(--ink-2)',
            fontWeight: 800,
            fontSize: 13,
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 6 }}>🛏️</div>
          Boş yatak
          <div style={{ fontWeight: 600, fontSize: 11, marginTop: 4 }}>
            Sıradaki hasta otomatik yerleşir
          </div>
        </div>
      )}
    </div>
  );
}

export function ERScreen() {
  const state = useGameState();
  const tweaks = useTweaks();
  const { er } = state;

  const waiting = er.queueIds.map(caseById).filter((c): c is PatientCase => !!c);
  const completed = er.completedIds.map(caseById).filter((c): c is PatientCase => !!c);
  const activeCount = er.bedIds.filter(Boolean).length;
  const allDone = activeCount === 0 && waiting.length === 0;

  return (
    <div className="screen" style={{ background: 'var(--cream)', minHeight: '100vh' }}>
      <TopBar here={1} steps={['Acil Servis', 'Triyaj']} />

      <DoodleScatter
        items={[
          { kind: 'sparkle', x: 60, y: 110, size: 22, color: '#FFD86B' },
          { kind: 'sparkle', x: '92%', y: 140, size: 20, color: '#5AB7F2' },
          { kind: 'pill', x: '88%', y: 560, size: 58, anim: 'wobble' },
        ]}
      />

      <div style={{ padding: '28px 36px 60px', maxWidth: 1220, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap' }}>
          <div>
            <span className="chip butter" style={{ marginBottom: 10 }}>
              🚨 ACİL SERVİS · {tweaks.roomLayout === 'front' ? 'Ön görünüm' : 'Yan görünüm'}
            </span>
            <h1 style={{ fontSize: 42, lineHeight: 1.02, margin: '10px 0 6px' }}>Triyaj panosu</h1>
            <div style={{ fontSize: 15, color: 'var(--ink-2)', fontWeight: 700, maxWidth: 620 }}>
              Dört yatak, tek vardiya. Kritik hastaları önce al; her muayeneden sonra yatak otomatik
              olarak sıradaki hastaya açılır.
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <div className="plush-sm" style={{ padding: '10px 16px', background: 'white', textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 900, lineHeight: 1 }}>{activeCount}</div>
              <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--ink-2)', letterSpacing: '.06em' }}>
                DOLU YATAK
              </div>
            </div>
            <div className="plush-sm" style={{ padding: '10px 16px', background: 'white', textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 900, lineHeight: 1 }}>{waiting.length}</div>
              <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--ink-2)', letterSpacing: '.06em' }}>
                SIRADA
              </div>
            </div>
            <button
              type="button"
              className="btn-plush ghost"
              onClick={() => store.setScreen('mode')}
            >
              ← Mod seçimi
            </button>
          </div>
        </div>

        {allDone ? (
          <div
            className="plush-lg"
            style={{ marginTop: 28, padding: 40, textAlign: 'center', background: '#FFFCF3' }}
          >
            <div style={{ fontSize: 54 }}>🎉</div>
            <h2 style={{ fontSize: 28, margin: '8px 0' }}>Vardiya tamamlandı</h2>
            <div style={{ fontWeight: 700, color: 'var(--ink-2)', marginBottom: 18 }}>
              {completed.length} hastayı değerlendirdin. Yeni vardiya için mod seçimine dön.
            </div>
            <button type="button" className="btn-plush primary" onClick={() => store.setScreen('mode')}>
              Mod seçimine dön
            </button>
          </div>
        ) : (
          <>
            <div
              style={{
                marginTop: 26,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: 16,
              }}
            >
              {Array.from({ length: ER_BED_COUNT }).map((_, bedIndex) => {
                const patient = caseById(er.bedIds[bedIndex] ?? null);
                return (
                  <BedCard
                    key={bedIndex}
                    bedNumber={bedIndex}
                    patient={patient}
                    onStart={() => patient && store.startErCase(patient.id)}
                  />
                );
              })}
            </div>

            {waiting.length > 0 && (
              <div style={{ marginTop: 30 }}>
                <h2 style={{ fontSize: 22, marginBottom: 10 }}>Sırada bekleyenler</h2>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {waiting.map((c) => {
                    const meta = SEVERITY_META[c.severity];
                    return (
                      <div
                        key={c.id}
                        className="plush-sm"
                        style={{
                          background: 'white',
                          padding: '10px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          minWidth: 240,
                        }}
                      >
                        <span
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            background: meta.bg,
                            border: '2px solid var(--line)',
                            flexShrink: 0,
                          }}
                        />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 900 }}>{c.name}</div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-2)' }}>
                            {meta.short} · {c.age} yaş · {c.arrivalBlurb}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {completed.length > 0 && (
              <div style={{ marginTop: 22, fontSize: 12, fontWeight: 700, color: 'var(--ink-2)' }}>
                Tamamlanan: {completed.map((c) => c.name).join(' · ')}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
