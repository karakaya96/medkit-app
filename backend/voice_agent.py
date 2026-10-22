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
    WHISPER_MODEL         — faster-whisper model: tiny, base, small, medium, large-v3 (default: base)
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
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
WHISPER_MODEL = os.getenv("WHISPER_MODEL", "base")

# Model map per provider. OpenRouter uses the same PATIENT_MODEL default as
# backend/server.py so text chat and voice never drift apart; NVIDIA has its
# own endpoint-qualified ID.
LLM_MODELS = {
    "openrouter": os.getenv("PATIENT_MODEL", os.getenv("FREE_MODEL", "openrouter/free")),
    "nvidia": os.getenv("NVIDIA_MODEL", "nvidia/nemotron-3.5-lightning"),
}

# ── Turkish TTS voices (edge-tts, ücretsiz, API anahtarı yok) ─────────────

TURKISH_VOICES = {
    "M": "tr-TR-AhmetNeural",
    "F": "tr-TR-EmelNeural",
}

DEFAULT_VOICE = TURKISH_VOICES["M"]
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

        # Generate MP3 with edge-tts (stream directly to bytes)
        import edge_tts
        import io

        communicate = edge_tts.Communicate(self._input_text, self._voice)
        audio_bytes = b""
        try:
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    audio_bytes += chunk["data"]
        except Exception:
            logger.exception("edge-tts synthesis failed (voice=%s)", self._voice)
            return

        if not audio_bytes:
            logger.error("edge-tts produced no audio bytes")
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


class WhisperSTT(agents.stt.STT):
    """faster-whisper based STT. Local, free, no API key needed."""

    def __init__(self, model: str = "base", language: str = "tr"):
        super().__init__(
            capabilities=agents.stt.STTCapabilities(
                streaming=False,
                interim_results=False,
            ),
        )
        self._model = model
        self._language = language
        self._whisper = None

    def _ensure_whisper(self):
        if self._whisper is None:
            from faster_whisper import WhisperModel

            logger.info("Loading faster-whisper model: %s", self._model)
            self._whisper = WhisperModel(
                self._model,
                device="cpu",
                compute_type="int8",
            )
            logger.info("faster-whisper model loaded: %s", self._model)

    def _transcribe_sync(self, audio, language: str) -> str:
        """Blocking whisper call — always run via asyncio.to_thread."""
        self._ensure_whisper()
        segments, _ = self._whisper.transcribe(
            audio,
            language=language,
            task="transcribe",
            vad_filter=True,
        )
        return " ".join(seg.text.strip() for seg in segments if seg.text.strip())

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

        all_samples = []
        sample_rate = None
        num_channels = None

        for frame in frames:
            if sample_rate is None:
                sample_rate = frame.sample_rate
                num_channels = frame.num_channels
            # frame.data is int16 PCM bytes
            samples = np.frombuffer(frame.data, dtype=np.int16).astype(np.float32)
            samples = samples / 32768.0  # normalize to [-1, 1]
            all_samples.append(samples)

        if not all_samples:
            return agents.stt.SpeechEvent(
                type=agents.stt.SpeechEventType.FINAL_TRANSCRIPT,
                alternatives=[],
            )

        audio = np.concatenate(all_samples).astype(np.float32)

        # Resample to 16kHz if needed using simple numpy interpolation
        if sample_rate is not None and sample_rate != 16000:
            num_samples = int(len(audio) * 16000 / sample_rate)
            audio = np.interp(
                np.linspace(0, len(audio) - 1, num_samples),
                np.arange(len(audio)),
                audio,
            ).astype(np.float32)
            sample_rate = 16000

        # Convert stereo to mono if needed
        if num_channels == 2:
            audio = audio.reshape(-1, 2).mean(axis=1)

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

    session = AgentSession(
        stt=WhisperSTT(model=WHISPER_MODEL, language="tr"),
        llm=openai.LLM(
            model=cfg["model"],
            temperature=0.8,
            base_url=cfg["base_url"],
            api_key=cfg["api_key"],
        ),
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
    await session.generate_reply(
        instructions=(
            f'Sen {speaker_gender} cinsiyetli bir hasta veya ebeveynsin. '
            f'Doktora doğru yöne doğru, bu satırı doğal bir hasta gibi söyle: '
            f'"{initial_line}". Tek kısa cümle.'
        ),
    )


if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(entrypoint_fnc=entrypoint, agent_name="medkit-voice")
    )
