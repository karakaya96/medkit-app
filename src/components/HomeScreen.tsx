import { useEffect, useState } from 'react';
import { PatientFace, TopBar } from './primitives';
import { store, useTweaks } from '../game/store';
import {
  listEvalHistory,
  deleteEvalHistory,
  type EvalHistoryEntry,
} from '../data/evalHistory';

const VERDICT_COLOR: Record<EvalHistoryEntry['verdict'], string> = {
  excellent: 'var(--mint)',
  good: 'var(--mint)',
  satisfactory: 'var(--butter)',
  borderline: 'var(--peach)',
  'clear-fail': 'var(--rose)',
};

const VERDICT_LABEL: Record<EvalHistoryEntry['verdict'], string> = {
  excellent: 'Mükemmel',
  good: 'İyi',
  satisfactory: 'Yeterli',
  borderline: 'Sınırda',
  'clear-fail': 'Başarısız',
};

function relativeDate(ms: number): string {
  const diffMs = Date.now() - ms;
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return 'az önce';
  if (minutes < 60) return `${minutes} dk önce`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} sa önce`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} gün önce`;
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

interface StatProps {
  big: string;
  sub: string;
  out?: string;
}

function Stat({ big, sub, out }: StatProps) {
  return (
    <div
      style={{
        background: 'white',
        border: '3px solid var(--line)',
        borderRadius: 14,
        padding: 12,
        boxShadow: 'var(--plush-tiny)',
      }}
    >
      <div style={{ fontWeight: 900, fontSize: 32, lineHeight: 1, color: 'var(--ink)' }}>
        {big}
        <span style={{ fontSize: 14, color: 'var(--ink-2)' }}>{out}</span>
      </div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 800,
          color: 'var(--ink-2)',
          textTransform: 'uppercase',
          letterSpacing: '.06em',
          marginTop: 4,
        }}
      >
        {sub}
      </div>
    </div>
  );
}

const VERDICT_SCORE: Record<EvalHistoryEntry['verdict'], number> = {
  'clear-fail': 1,
  borderline: 2,
  satisfactory: 3,
  good: 4,
  excellent: 5,
};

const DOMAIN_META = [
  { key: 'data_gathering' as const, label: 'Veri Toplama', color: 'var(--peach)', deep: 'var(--peach-deep)' },
  { key: 'clinical_management' as const, label: 'Klinik Yönetim', color: 'var(--mint)', deep: 'var(--mint-deep)' },
  { key: 'interpersonal' as const, label: 'Kişilerarası', color: 'var(--sky)', deep: 'var(--sky-deep)' },
];

interface TrainingStats {
  count: number;
  avgRating: number; // 0–5
  domains: { key: 'data_gathering' | 'clinical_management' | 'interpersonal'; label: string; pct: number; color: string; deep: string }[];
  weakest: { label: string; pct: number; deep: string } | null;
  streakDays: number;
}

function computeStats(history: EvalHistoryEntry[]): TrainingStats {
  const count = history.length;
  if (count === 0) {
    return {
      count: 0,
      avgRating: 0,
      domains: DOMAIN_META.map((d) => ({ ...d, pct: 0 })),
      weakest: null,
      streakDays: 0,
    };
  }

  const avgRating =
    history.reduce((sum, e) => sum + (VERDICT_SCORE[e.verdict] ?? 0), 0) / count;

  const domains = DOMAIN_META.map((d) => {
    const ratios = history
      .map((e) => {
        const ds = e.evaluation.domain_scores[d.key];
        return ds && ds.max > 0 ? ds.raw / ds.max : null;
      })
      .filter((r): r is number => r !== null);
    const pct = ratios.length > 0
      ? Math.round((ratios.reduce((a, b) => a + b, 0) / ratios.length) * 100)
      : 0;
    return { ...d, pct };
  });

  const weakestDomain = domains.reduce((min, d) => (d.pct < min.pct ? d : min), domains[0]);
  const weakest = { label: weakestDomain.label, pct: weakestDomain.pct, deep: weakestDomain.deep };

  // Streak: count consecutive days (today, yesterday, …) with at least one
  // saved review. Stops at the first gap.
  const days = new Set(
    history.map((e) => new Date(e.savedAt).toISOString().slice(0, 10)),
  );
  let streakDays = 0;
  const cursor = new Date();
  for (;;) {
    const key = cursor.toISOString().slice(0, 10);
    if (days.has(key)) {
      streakDays += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  return { count, avgRating, domains, weakest, streakDays };
}

export function HomeScreen() {
  const tweaks = useTweaks();
  const [history, setHistory] = useState<EvalHistoryEntry[]>([]);

  // Load on mount + whenever the screen is shown so it stays current.
  useEffect(() => {
    setHistory(listEvalHistory());
  }, []);

  const refresh = () => setHistory(listEvalHistory());
  const onDelete = (id: string) => {
    deleteEvalHistory(id);
    refresh();
  };

  const stats = computeStats(history);

  return (
    <div className="screen" style={{ background: 'var(--cream)' }}>
      <TopBar here={0} steps={['Profil']} />

      <div
        style={{
          padding: '28px 36px',
          minHeight: 'calc(100vh - 67px)',
          display: 'grid',
          gridTemplateColumns: '1.4fr 1fr',
          gap: 24,
        }}
      >
        {/* LEFT — desk */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink-2)' }}>
              {stats.count === 0 ? 'Birinci gün' : 'Tekrar hoş geldin'}
            </div>
            <h1 style={{ fontSize: 44, lineHeight: 1.05, marginTop: 4 }}>
              {stats.count === 0 ? 'Hazır olduğunda başla.' : 'Tekrar hoş geldin, doktor.'}
            </h1>
            <div style={{ fontSize: 16, color: 'var(--ink-2)', fontWeight: 600, marginTop: 6 }}>
              {stats.count === 0
                ? 'Bir poliklinik seç, ilk hastan içeri girsin. Eğitim kaydın ardından dolmaya başlayacak.'
                : 'Bitirdiğin her vakayla eğitim kaydın güncelleniyor.'}
            </div>
          </div>

          {stats.count === 0 ? (
            <div
              className="plush-lg"
              style={{
                background: 'var(--cream-2)',
                padding: 18,
                position: 'relative',
                transform: 'rotate(-0.6deg)',
              }}
            >
              <div style={{ position: 'absolute', top: -12, left: 22 }} className="chip butter">
                ★ first case
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: 18,
                  alignItems: 'center',
                  background: 'white',
                  borderRadius: 18,
                  border: '3px dashed rgba(43,30,22,0.25)',
                  padding: 16,
                }}
              >
                <div className="floaty" style={{ opacity: 0.6 }}>
                  <PatientFace style={tweaks.avatarStyle} skin="#E8B68F" hair="#3B2A1F" size={120} mood="neutral" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 900, fontSize: 22 }}>Henüz vaka seçilmedi</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink-2)', marginTop: 2 }}>
                    Bir poliklinik seç — sıradaki hasta doğrudan içeri girecek.
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-plush primary"
                  style={{ fontSize: 15, padding: '14px 18px' }}
                  onClick={() => store.setScreen('mode')}
                >
                  Başla →
                </button>
              </div>
            </div>
          ) : (
            <div className="plush-lg" style={{ background: 'var(--peach)', padding: 18, position: 'relative', transform: 'rotate(-0.6deg)' }}>
              <div style={{ position: 'absolute', top: -12, left: 22 }} className="chip butter">
                ★ pick up where you left off
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: 18,
                  alignItems: 'center',
                  background: 'white',
                  borderRadius: 18,
                  border: '3px solid var(--line)',
                  padding: 16,
                }}
              >
                <div className="floaty">
                  <PatientFace
                    style={tweaks.avatarStyle}
                    skin={history[0].caseGender === 'F' ? '#F0C4A8' : '#E8B68F'}
                    hair="#3B2A1F"
                    size={120}
                    mood="neutral"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 900, fontSize: 22 }}>
                    {history[0].caseName}, {history[0].caseAge}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink-2)', marginTop: 2 }}>
                    {history[0].diagnosisLabel}
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                    <span className="chip" style={{ background: VERDICT_COLOR[history[0].verdict] }}>
                      {VERDICT_LABEL[history[0].verdict]}
                    </span>
                    <span className="chip">son değerlendirme · {relativeDate(history[0].savedAt)}</span>
                    {stats.weakest && (
                      <span className="chip butter">odak · {stats.weakest.label.toLowerCase()}</span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-plush primary"
                  style={{ fontSize: 15, padding: '14px 18px' }}
                  onClick={() => store.viewEvalHistory(history[0].id)}
                >
                  İncele →
                </button>
              </div>
            </div>
          )}

          <button
            type="button"
            className="btn-plush mint"
            style={{ fontSize: 22, padding: '18px 0', alignSelf: 'stretch' }}
            onClick={() => store.setScreen('mode')}
          >
            ▶ Oturuma başla
          </button>

          <button
            type="button"
            className="btn-plush ghost"
            style={{
              fontSize: 14,
              padding: '12px 16px',
              alignSelf: 'stretch',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.history.pushState({}, '', '/agentic-rounds');
              }
              store.setScreen('agenticRounds');
            }}
            title="Simülatörün seni nasıl değerlendirdiğini gör — ajanlar, kaynaklar, katı kurallar"
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="chip butter" style={{ fontSize: 10 }}>NEW</span>
              <span style={{ fontWeight: 800 }}>Ajan turları</span>
              <span style={{ fontWeight: 600, color: 'var(--ink-2)' }}>· simülatör seni nasıl değerlendirir</span>
            </span>
            <span style={{ fontWeight: 800, color: 'var(--ink-2)' }}>→</span>
          </button>

          <button
            type="button"
            className="btn-plush ghost"
            style={{
              fontSize: 14,
              padding: '12px 16px',
              alignSelf: 'stretch',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.history.pushState({}, '', '/agent-topology');
              }
              store.setScreen('agentTopology');
            }}
            title="Değerlendirme ajanının canlı haritası — alt kurallar ve oturumlar"
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="chip peach" style={{ fontSize: 10 }}>LIVE</span>
              <span style={{ fontWeight: 800 }}>Ajan topolojisi</span>
              <span style={{ fontWeight: 600, color: 'var(--ink-2)' }}>· değerlendirme ajanı → alt kurallar ve oturumlar</span>
            </span>
            <span style={{ fontWeight: 800, color: 'var(--ink-2)' }}>→</span>
          </button>

          <div className="plush" style={{ padding: 16 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  fontWeight: 800,
                  fontSize: 12,
                  color: 'var(--ink-2)',
                  letterSpacing: '.06em',
                  textTransform: 'uppercase',
                }}
              >
                SON VAKALAR
              </div>
              <span
                style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-2)', cursor: 'pointer' }}
                onClick={() => store.setScreen('history')}
              >
                tümünü gör →
              </span>
            </div>
            {history.length === 0 ? (
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--ink-2)',
                  background: 'var(--cream)',
                  border: '2.5px dashed rgba(43,30,22,0.2)',
                  borderRadius: 12,
                  padding: '14px 16px',
                  textAlign: 'center',
                }}
              >
                Henüz değerlendirme yok — yapay zekâ geri bildirimini görmek için bir görüşmeyi bitir.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {history.slice(0, 6).map((r) => {
                  const color = VERDICT_COLOR[r.verdict];
                  return (
                    <div
                      key={r.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '40px 1fr 110px 80px 28px',
                        gap: 12,
                        alignItems: 'center',
                        padding: '8px 12px',
                        background: 'var(--cream)',
                        border: '2.5px solid var(--line)',
                        borderRadius: 12,
                        boxShadow: '0 2px 0 var(--line)',
                      }}
                    >
                      <div
                        className="tap"
                        onClick={() => store.viewEvalHistory(r.id)}
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          background: color,
                          border: '2.5px solid var(--line)',
                          boxShadow: '0 2px 0 var(--line)',
                          cursor: 'pointer',
                        }}
                      />
                      <div className="tap" onClick={() => store.viewEvalHistory(r.id)} style={{ cursor: 'pointer' }}>
                        <div style={{ fontWeight: 800, fontSize: 14 }}>
                          {r.caseName} <span style={{ fontWeight: 600, color: 'var(--ink-2)' }}>· {r.caseAge}{r.caseGender}</span>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--ink-2)', fontWeight: 700 }}>
                          {r.diagnosisLabel}
                        </div>
                      </div>
                      <span
                        className="tap chip"
                        onClick={() => store.viewEvalHistory(r.id)}
                        style={{ background: color, fontSize: 11, cursor: 'pointer' }}
                      >
                        {VERDICT_LABEL[r.verdict]}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--ink-2)', fontWeight: 700 }}>
                        {relativeDate(r.savedAt)}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`${r.caseName} değerlendirmesi silinsin mi?`)) onDelete(r.id);
                        }}
                        title="Bu değerlendirmeyi sil"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          fontSize: 16,
                          fontWeight: 800,
                          color: 'var(--ink-2)',
                          cursor: 'pointer',
                          padding: 4,
                          fontFamily: 'inherit',
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="plush" style={{ padding: 16, background: 'var(--butter)' }}>
            <div
              style={{
                fontWeight: 800,
                fontSize: 11,
                color: 'var(--ink-2)',
                letterSpacing: '.06em',
                textTransform: 'uppercase',
                marginBottom: 10,
              }}
            >
              EĞİTİMİN
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Stat big={stats.count > 0 ? String(stats.count) : '—'} sub="tamamlanan vaka" />
              <Stat
                big={stats.count > 0 ? stats.avgRating.toFixed(1) : '—'}
                sub="ortalama puan"
                out={stats.count > 0 ? ' / 5' : ''}
              />
            </div>
            <div
              style={{
                marginTop: 12,
                background: 'white',
                border: '3px solid var(--line)',
                borderRadius: 14,
                padding: 12,
                boxShadow: 'var(--plush-tiny)',
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: 'var(--ink-2)',
                  textTransform: 'uppercase',
                  letterSpacing: '.06em',
                }}
              >
                EN ZAYIF ALAN
              </div>
              <div style={{ fontSize: 18, fontWeight: 900, marginTop: 2 }}>
                {stats.weakest ? stats.weakest.label : '—'}
              </div>
              <div
                style={{
                  marginTop: 8,
                  height: 12,
                  background: 'var(--cream)',
                  borderRadius: 8,
                  border: '2px solid var(--line)',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: `${stats.weakest?.pct ?? 0}%`,
                    background: stats.weakest?.deep ?? 'var(--peach-deep)',
                  }}
                />
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: 6,
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--ink-2)',
                }}
              >
                <span>
                  {stats.weakest ? `${stats.weakest.label} · ${stats.weakest.pct}%` : 'Henüz değerlendirme yok'}
                </span>
                <span>odak alanı</span>
              </div>
            </div>
          </div>

          <div className="plush" style={{ padding: 16 }}>
            <div
              style={{
                fontWeight: 800,
                fontSize: 11,
                color: 'var(--ink-2)',
                letterSpacing: '.06em',
                textTransform: 'uppercase',
                marginBottom: 10,
              }}
            >
              ALAN GELİŞİMİ
            </div>
            {stats.count === 0 ? (
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-2)' }}>
                Alan dağılımı ilk yapay zekâ değerlendirmenden sonra açılır.
              </div>
            ) : (
              stats.domains.map((d) => (
                <div key={d.label} style={{ marginBottom: 10 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 12,
                      fontWeight: 800,
                      marginBottom: 4,
                    }}
                  >
                    <span>{d.label}</span>
                    <span>{d.pct}%</span>
                  </div>
                  <div
                    style={{
                      height: 14,
                      background: 'var(--cream)',
                      borderRadius: 8,
                      border: '2.5px solid var(--line)',
                      overflow: 'hidden',
                      position: 'relative',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        width: `${d.pct}%`,
                        background: d.color,
                        borderRight: '2.5px solid var(--line)',
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          <div
            className="plush"
            style={{ padding: 14, background: 'var(--mint)', display: 'flex', alignItems: 'center', gap: 12 }}
          >
            <div style={{ fontSize: 36 }} className="floaty">
              📚
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 14 }}>
                {stats.streakDays === 0
                  ? 'Seri: —'
                  : `Seri: ${stats.streakDays} gün`}
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-2)' }}>
                {stats.streakDays === 0
                  ? 'Seriyi başlatmak için ilk vakanı bitir.'
                  : 'Bugün bir vaka daha seriyi sürdürür.'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
