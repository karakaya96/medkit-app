"""Grand Rounds — LiveKit voice agent (Patient persona, real-time).

Runs as a separate process from the FastAPI server. Joins every LiveKit
room created by the frontend and roleplays the patient over WebRTC:

    Browser mic → STT (faster-whisper, yerel) → LLM (Nemotron via OpenRouter) →
    TTS (edge-tts, ücretsiz Türkçe) → Browser

The persona prompt and voice ID come from room metadata (set by the
backend `/voice/token` endpoint when the room is created), so this
worker has zero patient-specific knowledge — TS owns that.

Run:
    python backend/voice_agent.py dev

Environment variables:
    OPENROUTER_API_KEY    — OpenRouter API key (https://openrouter.ai)
    OPENROUTER_BASE_URL   — https://openrouter.ai/api/v1  (default)
    NVIDIA_API_KEY        — NVIDIA build.nvidia.com API key (fallback)
    NVIDIA_BASE_URL       — https://integrate.api.nvidia.com/v1 (default)
    LLM_PROVIDER          — "openrouter" (default) or "nvidia"
    WHISPER_MODEL         — faster-whisper model: tiny, base, small, medium, large-v3 (default: small)
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import re
import tempfile
import threading
import time
import uuid
from pathlib import Path

from dotenv import load_dotenv
from livekit import agents, rtc
from livekit.agents import Agent, AgentSession, RoomInputOptions, WorkerOptions, cli
from livekit.agents.tts import AudioEmitter, ChunkedStream
from livekit.plugins import openai, silero

# Load .env.local first (project convention), .env as fallback.
_BACKEND = Path(__file__).resolve().parent
load_dotenv(_BACKEND / ".env.local")
load_dotenv(_BACKEND / ".env")

logger = logging.getLogger("medkit.voice-agent")
logger.setLevel(logging.INFO)

# ── Provider configuration (OpenRouter primary, NVIDIA fallback) ──────────

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_BASE_URL = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY")
NVIDIA_BASE_URL = os.getenv("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1")
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "openrouter")  # openrouter | nvidia
WHISPER_MODEL = os.getenv("WHISPER_MODEL", "small")
WHISPER_DEVICE = os.getenv("WHISPER_DEVICE", "cpu")
WHISPER_COMPUTE_TYPE = os.getenv("WHISPER_COMPUTE_TYPE", "int8")
WHISPER_BEAM_SIZE = int(os.getenv("WHISPER_BEAM_SIZE", "5"))
WHISPER_MIN_LOGPROB = float(os.getenv("WHISPER_MIN_LOGPROB", "-1.0"))
WHISPER_NO_SPEECH_THRESHOLD = float(os.getenv("WHISPER_NO_SPEECH_THRESHOLD", "0.6"))

# Bias Turkish decoding toward clinical vocabulary. Case-specific text is
# appended by the frontend and sent through room metadata.
DEFAULT_STT_PROMPT = (
    "Türkçe tıbbi görüşme. Hasta şikayeti, öykü, ilaç, alerji, ameliyat, "
    "göğüs ağrısı, nefes darlığı, çarpıntı, ateş, bulantı, kusma, karın ağrısı, "
    "baş dönmesi, tansiyon, şeker, EKG, kan tahlili, röntgen, tomografi, ultrason."
)

# Model map per provider. OpenRouter uses the same PATIENT_MODEL default as
# backend/server.py so text chat and voice never drift apart; NVIDIA has its
# own endpoint-qualified ID.
LLM_MODELS = {
    "openrouter": os.getenv(
        "PATIENT_MODEL",
        os.getenv("FREE_MODEL", "nvidia/nemotron-3.5-lightning:free"),
    ),
    "nvidia": os.getenv("NVIDIA_MODEL", "nvidia/nemotron-3.5-lightning"),
}

# ── Turkish TTS voices (edge-tts, ücretsiz, API anahtarı yok) ─────────────

TURKISH_VOICES = {
    "M": "tr-TR-AhmetNeural",
    "F": "tr-TR-EmelNeural",
}

DEFAULT_VOICE = TURKISH_VOICES["M"]

# Ahmet (the only Turkish male voice on edge-tts) intermittently returns
# NoAudioReceived while Emel keeps working. Keep a same-locale fallback and
# lower its pitch when standing in for a male patient.
TTS_FALLBACKS = {
    "tr-TR-AhmetNeural": [("tr-TR-EmelNeural", "-25Hz")],
    "tr-TR-EmelNeural": [("tr-TR-AhmetNeural", None)],
}
_TTS_COOLDOWN_SECONDS = 900


def _tts_cooldown_file(voice: str) -> Path:
    safe = re.sub(r"[^A-Za-z0-9_-]", "_", voice)
    return Path(tempfile.gettempdir()) / f"medkit-tts-{safe}.failed"


def _in_tts_cooldown(voice: str) -> bool:
    try:
        return time.time() - _tts_cooldown_file(voice).stat().st_mtime < _TTS_COOLDOWN_SECONDS
    except OSError:
        return False


def _mark_tts_failed(voice: str) -> None:
    try:
        _tts_cooldown_file(voice).write_text(str(time.time()))
    except OSError:
        pass


def sanitize_tts_text(text: str) -> str:
    """Remove stage directions/markup that edge-tts occasionally rejects and
    turn long ellipsis runs into speakable pauses."""
    text = re.sub(r"[*_`#]+", "", text or "")
    text = re.sub(r"[\(\[\{][^\)\]\}]{0,200}[\)\]\}]", " ", text)
    text = re.sub(r"\.{2,}", ", ", text)
    text = re.sub(r"\s*[,;]\s*(?:[,;]\s*)+", ", ", text)
    text = re.sub(r"\s+", " ", text).strip(" ,;:-")
    if not re.search(r"[0-9A-Za-zÀ-ÿĞğİıŞşÇçÖöÜü]", text):
        return "Anlamadım."
    return text[:600]

DEFAULT_INSTRUCTIONS_TR = (
    "Sen bir hasta'sın ve bir doktora konuşuyorsun. Yanıtları 1-2 kısa konuşma cümlesiyle sınırla. "
    "Sadece söylenebilen diyaloğu çıkart — sahnelik talimat yok, yıldız yok, köşeli parantez yok."
)
DEFAULT_INITIAL_TR = "Merhaba doktore."


def _hash_str(s: str) -> int:
    """FNV-1a, mirrors src/voice/patientPersona.ts so TS-side and Python-side
    pick the same voice slot for the same case ID if frontend chose to defer."""
    h = 0x811C9DC5
    for ch in s:
        h ^= ord(ch)
        h = (h * 0x01000193) & 0xFFFFFFFF
    return h


def pick_voice(case_id: str, gender: str) -> str:
    voice = TURKISH_VOICES.get(gender.upper()) or DEFAULT_VOICE
    return voice


def parse_metadata(raw: str | None) -> dict:
    if not raw:
        return {}
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        logger.warning("room metadata is not valid JSON: %r", raw[:120])
        return {}


def _provider_cfg(provider: str | None = None) -> dict:
    """Return base_url, api_key, model for the given provider."""
    provider = provider or LLM_PROVIDER
    if provider == "nvidia" and NVIDIA_API_KEY:
        return {
            "base_url": NVIDIA_BASE_URL,
            "api_key": NVIDIA_API_KEY,
            "model": LLM_MODELS["nvidia"],
        }
    if provider == "nvidia":
        logger.warning(
            "LLM_PROVIDER=nvidia but NVIDIA_API_KEY is unset — falling back to OpenRouter"
        )
    if not OPENROUTER_API_KEY and NVIDIA_API_KEY:
        logger.warning("OPENROUTER_API_KEY unset — falling back to NVIDIA")
        return {
            "base_url": NVIDIA_BASE_URL,
            "api_key": NVIDIA_API_KEY,
            "model": LLM_MODELS["nvidia"],
        }
    return {
        "base_url": OPENROUTER_BASE_URL,
        "api_key": OPENROUTER_API_KEY,
        "model": LLM_MODELS["openrouter"],
    }


# ── EdgeTTS implementation for livekit-agents ─────────────────────────────


class EdgeTTSStream(ChunkedStream):
    """edge-tts based TTS stream. Generates MP3 via edge-tts, converts to
    PCM 16kHz mono with ffmpeg, pushes to AudioEmitter."""

    def __init__(
        self,
        *,
        tts: "EdgeTTS",
        input_text: str,
        conn_options: agents.APIConnectOptions,
        voice: str,
    ):
        super().__init__(tts=tts, input_text=input_text, conn_options=conn_options)
        self._voice = voice

    async def _run(self, output_emitter: AudioEmitter) -> None:
        output_emitter.initialize(
            request_id=uuid.uuid4().hex,
            sample_rate=16000,
            num_channels=1,
            mime_type="audio/pcm",
        )

        import edge_tts

        text = sanitize_tts_text(self._input_text)
        primary = [(self._voice, None)]
        fallbacks = TTS_FALLBACKS.get(self._voice, [])
        # Ahmet has been returning NoAudioReceived for minutes at a time. Once
        # it fails, prefer the working voice for the rest of the cooldown so
        # every reply does not pay the failed-request latency again.
        if _in_tts_cooldown(self._voice):
            voices = [*fallbacks, *primary]
        else:
            voices = [*primary, *fallbacks]

        audio_bytes = b""
        for voice, pitch in voices:
            attempts = 2 if voice != self._voice else 1
            for attempt in range(attempts):
                try:
                    kwargs = {"pitch": pitch} if pitch else {}
                    communicate = edge_tts.Communicate(text, voice, **kwargs)
                    audio_bytes = b""
                    async for chunk in communicate.stream():
                        if chunk["type"] == "audio":
                            audio_bytes += chunk["data"]
                    if audio_bytes:
                        if voice != self._voice:
                            logger.warning(
                                "edge-tts fallback voice=%s used for primary=%s",
                                voice, self._voice,
                            )
                        break
                    logger.warning("edge-tts produced no audio (voice=%s attempt=%s)", voice, attempt + 1)
                except Exception as exc:
                    logger.warning(
                        "edge-tts synthesis failed (voice=%s attempt=%s): %s",
                        voice, attempt + 1, exc,
                    )
                if voice == self._voice:
                    _mark_tts_failed(self._voice)
                await asyncio.sleep(0.35 * (attempt + 1))
            if audio_bytes:
                break

        if not audio_bytes:
            logger.error("edge-tts produced no audio for any voice: %r", text[:120])
            return

        # Convert MP3 → PCM 16kHz mono using ffmpeg via stdin/stdout pipe.
        # Must be async: EdgeTTSStream runs inside the LiveKit event loop, and
        # a blocking subprocess.run froze every other room for the duration of
        # the decode.
        try:
            proc = await asyncio.create_subprocess_exec(
                "ffmpeg",
                "-y",
                "-f",
                "mp3",
                "-i",
                "pipe:0",
                "-ar",
                "16000",
                "-ac",
                "1",
                "-f",
                "s16le",
                "pipe:1",
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
        except FileNotFoundError:
            logger.error("ffmpeg not found on PATH — edge-tts TTS cannot run")
            return
        pcm_data, stderr = await proc.communicate(audio_bytes)
        if proc.returncode != 0:
            logger.error(
                "ffmpeg MP3 decode failed (rc=%s): %s",
                proc.returncode,
                stderr.decode(errors="replace") if stderr else "",
            )
            return

        if not pcm_data:
            logger.error("ffmpeg produced no PCM data")
            return

        # Push audio in chunks to the emitter
        chunk_size = 3200  # ~100ms of 16kHz mono s16le
        for i in range(0, len(pcm_data), chunk_size):
            output_emitter.push(pcm_data[i : i + chunk_size])
            await asyncio.sleep(0.01)


class EdgeTTS(agents.tts.TTS):
    """edge-tts wrapper for livekit-agents. Free Turkish TTS, no API key needed."""

    def __init__(self, voice: str = "tr-TR-AhmetNeural"):
        super().__init__(
            capabilities=agents.tts.TTSCapabilities(
                streaming=False,
            ),
            sample_rate=16000,
            num_channels=1,
        )
        self._voice = voice

    def synthesize(
        self,
        text: str,
        *,
        conn_options: agents.APIConnectOptions = agents.DEFAULT_API_CONNECT_OPTIONS,
    ) -> ChunkedStream:
        return EdgeTTSStream(
            tts=self,
            input_text=text,
            conn_options=conn_options,
            voice=self._voice,
        )


# ── WhisperSTT implementation for livekit-agents ─────────────────────────


# One model per worker process, shared by every room. Without this cache a
# new WhisperModel (hundreds of MB) is loaded for every patient encounter.
_WHISPER_CACHE: dict[tuple[str, str, str], object] = {}
_WHISPER_LOCK = threading.Lock()

_WHISPER_ARTIFACT_RE = re.compile(
    r"^(?:altyazı|subtitle|izlediğiniz için teşekkürler|abone ol|m\.?k\.?)\W*$",
    re.IGNORECASE,
)


def _get_whisper(model: str, device: str, compute_type: str):
    key = (model, device, compute_type)
    with _WHISPER_LOCK:
        cached = _WHISPER_CACHE.get(key)
        if cached is not None:
            return cached
        from faster_whisper import WhisperModel

        logger.info("Loading faster-whisper model: %s (%s/%s)", model, device, compute_type)
        instance = WhisperModel(model, device=device, compute_type=compute_type)
        _WHISPER_CACHE[key] = instance
        logger.info("faster-whisper model loaded: %s", model)
        return instance


def _clean_transcript(text: str) -> str:
    text = re.sub(r"\s+", " ", text).strip()
    if not text or _WHISPER_ARTIFACT_RE.match(text):
        return ""
    return text


class WhisperSTT(agents.stt.STT):
    """faster-whisper based STT. Local, free, no API key needed."""

    def __init__(
        self,
        model: str = WHISPER_MODEL,
        language: str = "tr",
        initial_prompt: str | None = None,
    ):
        super().__init__(
            capabilities=agents.stt.STTCapabilities(
                streaming=False,
                interim_results=False,
            ),
        )
        self._model = model
        self._language = language
        self._initial_prompt = initial_prompt or DEFAULT_STT_PROMPT
        self._whisper = None

    def _ensure_whisper(self):
        if self._whisper is None:
            self._whisper = _get_whisper(
                self._model, WHISPER_DEVICE, WHISPER_COMPUTE_TYPE
            )

    def _transcribe_sync(self, audio, language: str) -> str:
        """Blocking whisper call — always run via asyncio.to_thread."""
        self._ensure_whisper()
        segments, _ = self._whisper.transcribe(
            audio,
            language=language,
            task="transcribe",
            beam_size=WHISPER_BEAM_SIZE,
            best_of=WHISPER_BEAM_SIZE,
            temperature=0.0,
            condition_on_previous_text=False,
            initial_prompt=self._initial_prompt,
            vad_filter=True,
            vad_parameters={
                "min_silence_duration_ms": 300,
                "speech_pad_ms": 200,
            },
            without_timestamps=True,
            no_speech_threshold=WHISPER_NO_SPEECH_THRESHOLD,
            log_prob_threshold=WHISPER_MIN_LOGPROB,
            compression_ratio_threshold=2.4,
        )
        parts: list[str] = []
        for seg in segments:
            text = seg.text.strip()
            if not text:
                continue
            # Drop silence/credit hallucinations and very low-confidence
            # decodes. Better to ask the learner to repeat than to feed the
            # patient LLM a fabricated question.
            if seg.no_speech_prob > WHISPER_NO_SPEECH_THRESHOLD:
                logger.debug("STT skipped no-speech segment: %r", text)
                continue
            if seg.avg_logprob < WHISPER_MIN_LOGPROB:
                logger.debug(
                    "STT skipped low-confidence segment (%.2f): %r",
                    seg.avg_logprob,
                    text,
                )
                continue
            parts.append(text)
        return _clean_transcript(" ".join(parts))

    async def _recognize_impl(
        self,
        buffer,
        *,
        language: agents.NotGivenOr[str] = agents.NOT_GIVEN,
        conn_options: agents.APIConnectOptions = agents.DEFAULT_API_CONNECT_OPTIONS,
    ) -> agents.stt.SpeechEvent:
        # Loading the model and transcribing are both CPU-blocking; offload
        # them so the voice worker can keep servicing other rooms.
        await asyncio.to_thread(self._ensure_whisper)

        # Convert AudioBuffer (list of AudioFrame or single AudioFrame) to
        # numpy float32 array
        import numpy as np

        # buffer may be a single AudioFrame or an iterable of frames
        if isinstance(buffer, rtc.AudioFrame):
            frames = [buffer]
        else:
            frames = list(buffer)  # type: ignore[arg-type]

        if not frames:
            return agents.stt.SpeechEvent(
                type=agents.stt.SpeechEventType.FINAL_TRANSCRIPT,
                alternatives=[],
            )

        sample_rate = frames[0].sample_rate
        num_channels = frames[0].num_channels or 1
        raw = b"".join(bytes(frame.data) for frame in frames)

        # WebRTC usually delivers 48 kHz audio. The old linear-interpolation
        # resampler aliased speech and hurt Turkish recognition; use the
        # sox-backed resampler that ships with LiveKit instead.
        if sample_rate != 16000:
            resampler = rtc.AudioResampler(
                sample_rate,
                16000,
                num_channels=num_channels,
                quality=rtc.AudioResamplerQuality.HIGH,
            )
            out_frames = resampler.push(bytearray(raw)) + resampler.flush()
            raw = b"".join(bytes(frame.data) for frame in out_frames)
            sample_rate = 16000

        audio = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0
        if num_channels > 1:
            audio = audio.reshape(-1, num_channels).mean(axis=1)

        # Run Whisper transcription off the event loop.
        text = await asyncio.to_thread(self._transcribe_sync, audio, self._language)

        return agents.stt.SpeechEvent(
            type=agents.stt.SpeechEventType.FINAL_TRANSCRIPT,
            alternatives=[
                agents.stt.SpeechData(
                    text=text,
                    language=self._language,
                )
            ],
        )


async def entrypoint(ctx: agents.JobContext):
    await ctx.connect()

    meta = parse_metadata(ctx.room.metadata)
    case_id = meta.get("caseId") or meta.get("case_id") or "unknown"
    speaker_gender = (meta.get("voiceGender") or meta.get("gender") or "M").upper()
    system_prompt = meta.get("systemPrompt") or DEFAULT_INSTRUCTIONS_TR
    initial_line = meta.get("initialLine") or DEFAULT_INITIAL_TR
    stt_prompt = meta.get("sttPrompt") or DEFAULT_STT_PROMPT

    voice_id = TURKISH_VOICES.get(speaker_gender, DEFAULT_VOICE)

    logger.info(
        "joining room=%s case=%s gender=%s voice=%s provider=%s whisper=%s",
        ctx.room.name, case_id, speaker_gender, voice_id, LLM_PROVIDER, WHISPER_MODEL,
    )

    cfg = _provider_cfg()
    if not cfg["api_key"]:
        raise RuntimeError(
            "No LLM API key configured for the voice worker. "
            "Set OPENROUTER_API_KEY (or NVIDIA_API_KEY + LLM_PROVIDER=nvidia) "
            "in backend/.env.local."
        )

    llm_kwargs = {
        "model": cfg["model"],
        # Patient answers must stay faithful to the case fact sheet. High
        # temperature made the model invent symptoms and answer the wrong
        # question when STT was noisy.
        "temperature": 0.3,
        "base_url": cfg["base_url"],
        "api_key": cfg["api_key"],
    }
    if "openrouter.ai" in cfg["base_url"]:
        llm_kwargs["extra_body"] = {"reasoning": {"enabled": False}}
    elif "nvidia.com" in cfg["base_url"]:
        # NIM keeps thinking enabled unless the chat template flag is passed;
        # long patient prompts otherwise spend seconds on hidden reasoning.
        llm_kwargs["reasoning_effort"] = "none"
        llm_kwargs["extra_body"] = {"chat_template_kwargs": {"enable_thinking": False}}

    stt = WhisperSTT(
        model=WHISPER_MODEL,
        language="tr",
        initial_prompt=stt_prompt,
    )

    async def _warm_whisper() -> None:
        try:
            await asyncio.to_thread(stt._ensure_whisper)
        except Exception:
            logger.exception("Whisper warm-up failed")

    # Load the model while the patient's opening line is being spoken, so the
    # first doctor question is not delayed by a cold model load.
    asyncio.create_task(_warm_whisper())

    session = AgentSession(
        stt=stt,
        llm=openai.LLM(**llm_kwargs),
        tts=EdgeTTS(voice=voice_id),
        vad=silero.VAD.load(),
        # Local LiveKit has no cloud turn detector/interruption service;
        # Silero VAD keeps turn-taking fully local and free.
        turn_handling={
            "turn_detection": "vad",
            "interruption": {"mode": "vad"},
        },
        # No local mic/echo path in headless/dev; skipping warmup avoids
        # suppressing the very first TTS greeting.
        aec_warmup_duration=0.0,
    )

    agent = Agent(instructions=system_prompt)

    await session.start(
        agent=agent,
        room=ctx.room,
        room_input_options=RoomInputOptions(),
    )

    FAREWELLS_TR = [
        "Teşekkür ederim doktora. Kendinize iyi bakın.",
        "Tamam, teşekkür ederim. Hoşça kalın.",
        "Yardımınız için teşekkürler. Görüşürüz.",
        "Peki, kendinize iyi bakın. Hoşça kal.",
    ]
    farewell_pick = FAREWELLS_TR[_hash_str(case_id) % len(FAREWELLS_TR)]

    @ctx.room.local_participant.register_rpc_method("farewell")
    async def _on_farewell(data: rtc.RpcInvocationData) -> str:
        logger.info("rpc farewell invoked by %s", data.caller_identity)
        try:
            await session.say(farewell_pick)
            logger.info("farewell speaking (edge-tts): %r", farewell_pick)
        except Exception as e:
            logger.exception("farewell TTS failed: %s", e)
            return "error"
        return "ok"

    # Patient blurts their chief complaint as soon as the doctor walks up.
    # Wait for the browser participant; otherwise the greeting can play to an
    # empty room and be lost before the doctor subscribes.
    await ctx.wait_for_participant()
    # Speak the known chief complaint directly. Routing the first line through
    # the LLM added 5–8 s of silence before the patient said anything, which
    # reads as a broken microphone to the learner.
    await session.say(initial_line, allow_interruptions=True)


if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(entrypoint_fnc=entrypoint, agent_name="medkit-voice")
    )
