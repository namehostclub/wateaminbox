import { useCallback, useEffect, useRef, useState } from "react";

export type VoiceRecorderState = "idle" | "recording" | "paused";

export interface UseVoiceRecorderOptions {
  maxDurationSeconds?: number;
  onMaxDurationReached?: () => void;
}

export interface UseVoiceRecorderReturn {
  state: VoiceRecorderState;
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  audioBlob: Blob | null;
  audioUrl: string | null;
  audioLevels: number[];
  error: string | null;
  mimeType: string;
  startRecording: () => Promise<boolean>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  stopRecording: () => Promise<Blob | null>;
  cancelRecording: () => void;
}

const CANDIDATE_MIME_TYPES = [
  "audio/ogg; codecs=opus",
  "audio/webm; codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/aac",
];

export function getSupportedAudioMimeType(): string {
  if (typeof MediaRecorder === "undefined") {
    return "";
  }
  for (const type of CANDIDATE_MIME_TYPES) {
    try {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    } catch {
      // Continue to next candidate
    }
  }
  return "";
}

export function useVoiceRecorder(
  options: UseVoiceRecorderOptions = {},
): UseVoiceRecorderReturn {
  const { maxDurationSeconds = 300, onMaxDurationReached } = options;

  const [state, setState] = useState<VoiceRecorderState>("idle");
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioLevels, setAudioLevels] = useState<number[]>(() =>
    Array(24).fill(15),
  );
  const [error, setError] = useState<string | null>(null);
  const [activeMimeType, setActiveMimeType] = useState<string>("");

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const blobResolveRef = useRef<((blob: Blob | null) => void) | null>(null);

  // Stop media tracks and release audio hardware
  const cleanupStream = useCallback(() => {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      void audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Animate audio levels from microphone in real-time
  const updateVisualizer = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    const barCount = 24;
    const step = Math.max(1, Math.floor(bufferLength / barCount));
    const levels: number[] = [];

    for (let i = 0; i < barCount; i++) {
      const value = dataArray[i * step] ?? 0;
      // Scale 0-255 to 15-100 for visually pleasing bars
      const scaled = Math.min(100, Math.max(15, Math.round((value / 255) * 85 + 15)));
      levels.push(scaled);
    }

    setAudioLevels(levels);
    animationFrameRef.current = requestAnimationFrame(updateVisualizer);
  }, []);

  // Start recording
  const startRecording = useCallback(async (): Promise<boolean> => {
    setError(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setAudioBlob(null);
    setDuration(0);
    chunksRef.current = [];

    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error("Microphone is not supported in this browser");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      // Audio analysis for waveform visualizer
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const audioCtx = new AudioCtx();
        audioContextRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        analyser.smoothingTimeConstant = 0.75;
        source.connect(analyser);
        analyserRef.current = analyser;
        updateVisualizer();
      } catch (e) {
        console.warn("Could not start audio visualizer analyser", e);
      }

      const mime = getSupportedAudioMimeType();
      setActiveMimeType(mime);

      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      recorderRef.current = recorder;

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        let mimeToUse = recorder.mimeType || mime || "audio/webm";
        if (mimeToUse.startsWith("video/")) {
          mimeToUse = mimeToUse.replace(/^video\//, "audio/");
        }
        const finalBlob = new Blob(chunksRef.current, { type: mimeToUse });
        setAudioBlob(finalBlob);
        const url = URL.createObjectURL(finalBlob);
        setAudioUrl(url);

        if (blobResolveRef.current) {
          blobResolveRef.current(finalBlob);
          blobResolveRef.current = null;
        }
      };

      recorder.start(250);
      setState("recording");

      // Start elapsed duration timer
      timerRef.current = setInterval(() => {
        setDuration((prev) => {
          const next = prev + 1;
          if (next >= maxDurationSeconds) {
            clearTimer();
            if (recorderRef.current && recorderRef.current.state === "recording") {
              recorderRef.current.stop();
              cleanupStream();
              setState("paused");
            }
            onMaxDurationReached?.();
          }
          return next;
        });
      }, 1000);

      return true;
    } catch (err) {
      cleanupStream();
      clearTimer();
      const message =
        err instanceof Error
          ? err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
            ? "Microphone access was denied. Please allow microphone permissions."
            : err.message
          : "Failed to access microphone";
      setError(message);
      setState("idle");
      return false;
    }
  }, [audioUrl, cleanupStream, clearTimer, maxDurationSeconds, onMaxDurationReached, updateVisualizer]);

  // Pause recording (enters preview mode)
  const pauseRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state === "recording") {
      clearTimer();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      recorderRef.current.stop();
      cleanupStream();
      setState("paused");
    }
  }, [cleanupStream, clearTimer]);

  // Resume recording
  const resumeRecording = useCallback(() => {
    // If resuming from paused, restart recording
    void startRecording();
  }, [startRecording]);

  // Stop recording and return final Blob
  const stopRecording = useCallback((): Promise<Blob | null> => {
    clearTimer();
    cleanupStream();

    if (!recorderRef.current || recorderRef.current.state === "inactive") {
      setState("idle");
      return Promise.resolve(audioBlob);
    }

    return new Promise<Blob | null>((resolve) => {
      blobResolveRef.current = (blob) => {
        setState("idle");
        resolve(blob);
      };
      recorderRef.current?.stop();
    });
  }, [audioBlob, cleanupStream, clearTimer]);

  // Cancel recording and discard data
  const cancelRecording = useCallback(() => {
    clearTimer();
    cleanupStream();
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.onstop = null;
      try {
        recorderRef.current.stop();
      } catch {}
    }
    recorderRef.current = null;
    chunksRef.current = [];
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setAudioBlob(null);
    setDuration(0);
    setError(null);
    setAudioLevels(Array(24).fill(15));
    setState("idle");
  }, [audioUrl, cleanupStream, clearTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimer();
      cleanupStream();
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl, cleanupStream, clearTimer]);

  return {
    state,
    isRecording: state === "recording",
    isPaused: state === "paused",
    duration,
    audioBlob,
    audioUrl,
    audioLevels,
    error,
    mimeType: activeMimeType,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    cancelRecording,
  };
}
