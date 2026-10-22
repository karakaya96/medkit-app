import { useSyncExternalStore } from 'react';
import type {
  ActivePatient,
  AvatarStyle,
  EndConfirmChecks,
  GameState,
  PatientCase,
  RoomLayout,
  Screen,
  Tweaks,
} from './types';
import type { ClinicId } from './clinic';
import { DEFAULT_CLINIC } from './clinic';
import type { PaletteName } from '../styles/palettes';
import type { Case as MedKitCase } from '../data/cases';
import { CASES, getCase, getCaseClinic, getPatientCase } from '../data/cases';
import { PATIENT_CASES } from '../data/patients';
import { ensureAudioContext } from '../voice/conversationStore';
import {
  addCompletedEncounter,
  hasEncounterActivity,
  setDisposition,
  toggleTreatment,
} from './session';

const ONBOARDED_KEY = 'medkit:onboarded';

/** Sentinel used as `bedIndex` for polyclinic patients across the store,
 *  the conversation cache, and the 3D scene. `voice/conversationStore.ts`
 *  keys on this. */
export const POLYCLINIC_BED_INDEX = -10;

/** Number of resuscitation beds shown on the ER board. */
export const ER_BED_COUNT = 4;

function readOnboarded(): boolean {
  try {
    return typeof window !== 'undefined' && window.localStorage.getItem(ONBOARDED_KEY) === '1';
  } catch {
    return false;
  }
}

function writeOnboarded(v: boolean) {
  try {
    window.localStorage.setItem(ONBOARDED_KEY, v ? '1' : '0');
  } catch {
    /* private mode — non-fatal */
  }
}

const DEFAULT_TWEAKS: Tweaks = {
  palette: 'sunshine',
  avatarStyle: 'portrait',
  intensity: 2,
  roomLayout: 'side',
};

/** Resolve the full medkit `PatientCase` (anamnesis, vitals, diagnosis
 *  options, etc.) for a cozy-cartoon `Case`. If we can't find one in the
 *  catalogue (shouldn't happen — the cartoon library is derived FROM the
 *  catalogue), fall back to a minimal stub built from the cartoon shape so
 *  the voice agent + 3D scene still get something to render. */
function toPatientCase(c: MedKitCase): PatientCase {
  const real = getPatientCase(c.id);
  if (real) return real;
  const isRedFlag = c.tags.some((t) => /red flag|kırmızı bayrak/.test(t.toLowerCase()));
  return {
    id: c.id,
    name: c.name,
    age: c.age,
    gender: c.sex,
    severity: isRedFlag ? 'urgent' : 'stable',
    arrivalBlurb: c.complaint,
    chiefComplaint: c.complaint,
    vitals: { hr: 88, bp: '162/96', spo2: 98, temp: 36.7, rr: 16 },
    anamnesis: [],
    testResults: [],
    correctDiagnosisId: '',
    acceptableTreatmentIds: [],
    criticalTreatmentIds: [],
    diagnosisOptions: [],
  };
}

function makeActivePatient(caseData: PatientCase, bedIndex: number): ActivePatient {
  const now = Date.now();
  return {
    case: caseData,
    bedIndex,
    status: 'in-bed',
    askedQuestionIds: [],
    orderedTestIds: [],
    testOrderedAt: {},
    completedTestIds: [],
    givenTreatmentIds: [],
    submittedDiagnosisId: null,
    arrivedAt: now,
    deadlineMs: now + 8 * 60 * 1000,
  };
}

function toActivePatient(c: MedKitCase): ActivePatient {
  return makeActivePatient(toPatientCase(c), POLYCLINIC_BED_INDEX);
}

class Store {
  private state: GameState = {
    screen: 'splash',
    tweaks: { ...DEFAULT_TWEAKS },
    onboardingStep: 0,
    endConfirm: { sum: false, safe: false, ice: false },
    selectedCaseId: 'im-001',
    hasOnboarded: readOnboarded(),
    polyclinic: { clinic: DEFAULT_CLINIC, patient: null },
    encounterMode: 'polyclinic',
    er: {
      bedIds: PATIENT_CASES.slice(0, ER_BED_COUNT).map((c) => c.id),
      queueIds: PATIENT_CASES.slice(ER_BED_COUNT).map((c) => c.id),
      completedIds: [],
    },
    lastEncounter: null,
    sessionEncounters: [],
    viewedEvalHistoryId: null,
  };

  private listeners = new Set<() => void>();

  getState = (): GameState => this.state;

  subscribe = (l: () => void): (() => void) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };

  private set(next: Partial<GameState>) {
    this.state = { ...this.state, ...next };
    for (const l of this.listeners) l();
  }

  // ── navigation ────────────────────────────────
  setScreen = (screen: Screen) => this.set({ screen });

  /** Open the debrief screen in review mode for a saved evaluation. */
  viewEvalHistory = (historyId: string) =>
    this.set({ viewedEvalHistoryId: historyId, screen: 'debrief' });

  clearViewedEval = () => this.set({ viewedEvalHistoryId: null });

  /** Drop the completed-patient queue once its debrief has been left. */
  clearSessionEncounters = () => {
    if (this.state.sessionEncounters.length === 0) return;
    this.set({ sessionEncounters: [] });
  };

  /** Splash → onboarding (first run) or polyclinic (returning). */
  beginFromSplash = () => {
    this.set({ screen: this.state.hasOnboarded ? 'mode' : 'onboarding' });
  };

  // ── onboarding ────────────────────────────────
  setOnboardingStep = (step: number) =>
    this.set({ onboardingStep: Math.max(0, Math.min(2, step)) });

  finishOnboarding = () => {
    writeOnboarded(true);
    this.set({ hasOnboarded: true, screen: 'mode', onboardingStep: 0 });
  };

  // ── tweaks ────────────────────────────────────
  setPalette = (palette: PaletteName) =>
    this.set({ tweaks: { ...this.state.tweaks, palette } });
  setAvatarStyle = (avatarStyle: AvatarStyle) =>
    this.set({ tweaks: { ...this.state.tweaks, avatarStyle } });
  setIntensity = (intensity: number) =>
    this.set({ tweaks: { ...this.state.tweaks, intensity } });
  setRoomLayout = (roomLayout: RoomLayout) =>
    this.set({ tweaks: { ...this.state.tweaks, roomLayout } });

  // ── polyclinic ────────────────────────────────
  setPolyclinicClinic = (clinic: ClinicId) =>
    this.set({ polyclinic: { ...this.state.polyclinic, clinic } });

  /** Track which patients have been finished this session so the
   *  "next patient" picker doesn't loop on the same chart. Cleared on
   *  page reload — that's intentional, this is a training session, not
   *  a database. */
  private attemptedCaseIds = new Set<string>();

  /** Find the next case in the active clinic that hasn't been attempted
   *  yet. Falls back to the first case in the clinic, then to any case if
   *  the clinic has no cases at all. Returns null only if the catalogue
   *  is somehow empty. */
  pickNextCaseId = (): string | null => {
    const clinic = this.state.polyclinic.clinic;
    const inClinic = (
      clinic === 'all-specialties'
        ? CASES
        : CASES.filter((c) => c.clinic === clinic)
    );
    const fresh = inClinic.find((c) => !this.attemptedCaseIds.has(c.id));
    if (fresh) return fresh.id;
    if (inClinic.length > 0) return inClinic[0].id;
    return CASES[0]?.id ?? null;
  };

  /** Mark a case as attempted so the next-patient picker skips it. */
  private markAttempted(id: string) {
    this.attemptedCaseIds.add(id);
  }

  /** Drop the patient into the polyclinic 3D scene — they walk in, sit on the
   *  chair, and the voice agent boots once `voiceActive` flips on. */
  loadPolyclinicPatient = (id: string) => {
    const c = getCase(id);
    this.set({
      selectedCaseId: id,
      encounterMode: 'polyclinic',
      polyclinic: { ...this.state.polyclinic, patient: toActivePatient(c) },
    });
  };

  // ── ER ─────────────────────────────────────────
  /** Load an ER case into a bed and route through the brief. The 3D
   *  consultation room is reused as the examination room. */
  /** Load an ER case into its bed without navigating (used by the
   *  encounter screen's "came here directly" fallback). */
  loadErPatient = (id: string) => {
    const real = PATIENT_CASES.find((c) => c.id === id);
    const bedIndex = this.state.er.bedIds.indexOf(id);
    if (!real || bedIndex < 0) return;
    this.set({
      selectedCaseId: id,
      encounterMode: 'er',
      polyclinic: {
        ...this.state.polyclinic,
        patient: makeActivePatient(real, bedIndex),
      },
    });
  };

  startErCase = (id: string) => {
    try {
      ensureAudioContext();
    } catch {
      /* no Web Audio — the voice panel surfaces the error */
    }
    this.loadErPatient(id);
    if (this.state.encounterMode === 'er') this.set({ screen: 'brief' });
  };

  /** Free the bed after an ER encounter and promote the next waiting case. */
  private finishErBed(bedIndex: number) {
    if (bedIndex < 0 || bedIndex >= ER_BED_COUNT) return;
    const er = this.state.er;
    const finishedId = er.bedIds[bedIndex];
    const queue = [...er.queueIds];
    const nextId = queue.shift() ?? null;
    const bedIds = [...er.bedIds];
    bedIds[bedIndex] = nextId;
    this.set({
      er: {
        bedIds,
        queueIds: queue,
        completedIds: finishedId
          ? [...er.completedIds, finishedId]
          : er.completedIds,
      },
    });
  }

  /** Clear the patient — triggers the walk-out animation in the 3D scene.
   *  Completed polyclinic encounters are appended to `sessionEncounters` so
   *  the end-of-session debrief can grade every patient, not just the last
   *  one. `lastEncounter` is still maintained for ER/single-encounter flows.
   *
   *  Empty auto-loaded patients are ignored. This matters because Dispatch
   *  immediately loads the next patient: if the trainee clicks "Görüşmeyi
   *  bitir" before engaging that fresh patient, there is nothing new to add
   *  to the session and the previous patients remain intact. */
  finishPolyclinicCase = () => {
    const snapshot = this.state.polyclinic.patient;
    const keepSnapshot = Boolean(snapshot && hasEncounterActivity(snapshot));
    if (snapshot && this.state.encounterMode === 'er') {
      this.finishErBed(snapshot.bedIndex);
    }
    const sessionEncounters =
      keepSnapshot && snapshot && this.state.encounterMode === 'polyclinic'
        ? addCompletedEncounter(this.state.sessionEncounters, snapshot)
        : this.state.sessionEncounters;
    this.set({
      polyclinic: { ...this.state.polyclinic, patient: null },
      lastEncounter:
        keepSnapshot && snapshot ? snapshot : this.state.lastEncounter,
      sessionEncounters,
    });
  };

  // ── per-screen state ──────────────────────────
  toggleEndConfirm = (key: keyof EndConfirmChecks) =>
    this.set({
      endConfirm: { ...this.state.endConfirm, [key]: !this.state.endConfirm[key] },
    });

  /** Library card click: pin the polyclinic to the case's specialty so the
   *  next-patient flow walks the same roster, then jump to the brief. */
  selectCase = (id: string) => {
    const clinic = getCaseClinic(id);
    this.set({
      selectedCaseId: id,
      encounterMode: 'polyclinic',
      screen: 'brief',
      sessionEncounters: [],
      polyclinic: clinic
        ? { ...this.state.polyclinic, clinic }
        : this.state.polyclinic,
    });
  };

  /** "Accept the next patient" — drop straight into the 3D encounter with
   *  the patient seated and the voice agent already connecting.
   *
   *  When called without an explicit id, picks the next unattempted case
   *  from the active polyclinic so the doctor can hammer through e.g.
   *  pediatrics one at a time without going back to the library.
   *
   *  Pre-warms the AudioContext inside this click handler so that browser
   *  autoplay policies treat the subsequent `Conversation.init()` (kicked
   *  off when `FloatingVoicePanel` mounts) as gesture-authorised. Without
   *  this, the AudioContext stays suspended and the mic / remote audio
   *  silently fail until the user clicks something else. */
  acceptNextPatient = (id?: string) => {
    const targetId = id ?? this.pickNextCaseId() ?? this.state.selectedCaseId;
    const c = getCase(targetId);
    const clinic = getCaseClinic(targetId);
    try {
      ensureAudioContext();
    } catch {
      /* SSR / no Web Audio support — let the panel surface the error */
    }
    this.markAttempted(targetId);
    // Coming from the GP room / brief / debrief starts a fresh session.
    // Coming from EncounterScreen's Dispatch flow continues the current one.
    const continuingSession = this.state.screen === 'encounter';
    this.set({
      selectedCaseId: targetId,
      encounterMode: 'polyclinic',
      sessionEncounters: continuingSession ? this.state.sessionEncounters : [],
      polyclinic: {
        ...this.state.polyclinic,
        clinic: clinic ?? this.state.polyclinic.clinic,
        patient: toActivePatient(c),
      },
      screen: 'encounter',
    });
  };

  // ── examine flow ───────────────────────────────
  /** Mutate the seated polyclinic patient. No-op when the bed is empty.
   *  The mutator builds the next snapshot from the current one. */
  private updatePolyclinicPatient = (mut: (p: ActivePatient) => ActivePatient) => {
    const cur = this.state.polyclinic.patient;
    if (!cur) return;
    this.set({ polyclinic: { ...this.state.polyclinic, patient: mut(cur) } });
  };

  /** History tab: mark a question as asked so the answer becomes visible. */
  askPolyclinicQuestion = (qid: string) =>
    this.updatePolyclinicPatient((p) => {
      if (p.askedQuestionIds.includes(qid)) return p;
      return { ...p, askedQuestionIds: [...p.askedQuestionIds, qid] };
    });

  /** Order Tests tab: in the polyclinic the result is instant, so we set
   *  both `orderedTestIds` and `completedTestIds` in one shot. */
  orderPolyclinicTest = (testId: string) =>
    this.updatePolyclinicPatient((p) => {
      if (p.orderedTestIds.includes(testId)) return p;
      const now = Date.now();
      return {
        ...p,
        orderedTestIds: [...p.orderedTestIds, testId],
        testOrderedAt: { ...p.testOrderedAt, [testId]: now },
        completedTestIds: [...p.completedTestIds, testId],
      };
    });

  /** Diagnose tab: lock in a diagnosis. Once submitted, options become
   *  disabled and the prescription tab unlocks. */
  submitPolyclinicDiagnosis = (dxId: string) =>
    this.updatePolyclinicPatient((p) =>
      p.submittedDiagnosisId ? p : { ...p, submittedDiagnosisId: dxId },
    );

  /** Rx tab: append a prescription line to the patient's record. */
  addPolyclinicPrescription = (rx: { medicationId: string; dose: string; duration: string }) =>
    this.updatePolyclinicPatient((p) => ({
      ...p,
      prescriptions: [
        ...(p.prescriptions ?? []),
        { ...rx, prescribedAt: Date.now() },
      ],
    }));

  toggleTreatment = (id: string) =>
    this.updatePolyclinicPatient((p) => toggleTreatment(p, id));

  setDisposition = (id: string) =>
    this.updatePolyclinicPatient((p) => setDisposition(p, id));

  recordTranscript = (
    messages: ReadonlyArray<{ role: 'user' | 'assistant'; content: string }>,
  ) =>
    this.updatePolyclinicPatient((p) => ({
      ...p,
      transcript: messages
        .filter((m) => m.content.trim())
        .filter((m) => !m.content.startsWith('İşimiz bitti. Kendinize iyi bakın.'))
        .map((m) => ({
          role: m.role === 'user' ? ('trainee' as const) : ('patient' as const),
          content: m.content.trim(),
        })),
    }));
}

export const store = new Store();

if (
  typeof window !== 'undefined' &&
  (import.meta.env.DEV ||
    ['localhost', '127.0.0.1'].includes(window.location.hostname))
) {
  (window as unknown as { __store: Store }).__store = store;
}

// ── React bindings (useSyncExternalStore) ────────────────────────

export function useStore<T>(selector: (s: GameState) => T): T {
  return useSyncExternalStore(store.subscribe, () => selector(store.getState()));
}

export function useScreen(): Screen {
  return useStore((s) => s.screen);
}

export function useTweaks(): Tweaks {
  return useStore((s) => s.tweaks);
}

/** Full snapshot — used by the 3D Polyclinic component (which reads
 *  `state.polyclinic.{clinic, patient}`). */
export function useGameState(): GameState {
  return useStore((s) => s);
}
