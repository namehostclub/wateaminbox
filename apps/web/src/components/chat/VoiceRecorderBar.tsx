import { Loader2, Mic, Pause, Play, Send, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

export interface VoiceRecorderBarProps {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  audioLevels: number[];
  audioUrl: string | null;
  isSending?: boolean;
  onCancel: () => void;
  onPause: () => void;
  onResume: () => void;
  onSend: () => void;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export function VoiceRecorderBar({
  isRecording,
  isPaused,
  duration,
  audioLevels,
  audioUrl,
  isSending = false,
  onCancel,
  onPause,
  onResume,
  onSend,
}: VoiceRecorderBarProps) {
  const { t } = useTranslation();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);

  useEffect(() => {
    setIsPlaying(false);
    setPlaybackTime(0);
  }, [audioUrl]);

  const togglePlayback = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => console.error("Playback error:", err));
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setPlaybackTime(Math.floor(audioRef.current.currentTime));
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setPlaybackTime(0);
  };

  return (
    <div
      className="flex h-[44px] w-full items-center justify-between gap-3 rounded-2xl bg-white px-3 shadow-sm ring-1 ring-black/[0.08] dark:bg-dark-elevated dark:ring-white/[0.1]"
      role="region"
      aria-label={t("chat.voiceRecorder", "Voice recorder")}
    >
      {/* Hidden audio element for preview playback */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          className="hidden"
        />
      )}

      {/* Left: Recording state & Timer */}
      <div className="flex shrink-0 items-center gap-2.5">
        {isRecording && (
          <span className="relative flex size-3 items-center justify-center">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex size-2.5 rounded-full bg-red-500" />
          </span>
        )}

        <span className="font-mono text-sm font-semibold text-[#111b21] tabular-nums dark:text-dark-text-primary">
          {isPaused
            ? `${formatDuration(playbackTime)} / ${formatDuration(duration)}`
            : formatDuration(duration)}
        </span>
      </div>

      {/* Middle: Visualizer OR Preview scrubber */}
      <div className="flex h-7 flex-1 items-center justify-center overflow-hidden px-2">
        {isRecording ? (
          <div className="flex h-6 w-full max-w-[280px] items-center justify-between gap-[3px] sm:max-w-[360px]">
            {audioLevels.map((level, idx) => (
              <span
                key={idx}
                className="w-1 rounded-full bg-[#00a884] transition-all duration-75 dark:bg-emerald-400"
                style={{
                  height: `${Math.max(15, level)}%`,
                  opacity: Math.max(0.35, level / 100),
                }}
              />
            ))}
          </div>
        ) : (
          <div className="flex w-full max-w-[280px] items-center gap-3 sm:max-w-[360px]">
            <button
              type="button"
              onClick={togglePlayback}
              className="grid size-8 shrink-0 place-items-center rounded-full bg-[#00a884]/15 text-[#00a884] hover:bg-[#00a884]/25 dark:bg-emerald-500/20 dark:text-emerald-300"
              aria-label={
                isPlaying
                  ? t("chat.pause", "Pause")
                  : t("chat.play", "Play")
              }
            >
              {isPlaying ? (
                <Pause className="size-4 fill-current" aria-hidden="true" />
              ) : (
                <Play className="ml-0.5 size-4 fill-current" aria-hidden="true" />
              )}
            </button>
            <div className="relative h-1.5 flex-1 rounded-full bg-black/10 dark:bg-white/10">
              <div
                className="h-full rounded-full bg-[#00a884] dark:bg-emerald-400"
                style={{
                  width: `${duration > 0 ? (playbackTime / duration) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Right: Controls (Cancel, Pause/Resume, Send) */}
      <div className="flex shrink-0 items-center gap-1">
        {/* Cancel / Trash button */}
        <button
          type="button"
          onClick={onCancel}
          disabled={isSending}
          className="grid size-9 place-items-center rounded-full text-[#54656f] transition hover:bg-red-50 hover:text-red-500 active:scale-95 disabled:opacity-50 dark:text-dark-text-secondary dark:hover:bg-red-500/10 dark:hover:text-red-400"
          aria-label={t("chat.cancelRecording", "Cancel recording")}
          title={t("chat.cancelRecording", "Cancel recording")}
        >
          <Trash2 className="size-4.5" aria-hidden="true" />
        </button>

        {/* Pause/Stop OR Resume button */}
        {isRecording ? (
          <button
            type="button"
            onClick={onPause}
            disabled={isSending}
            className="grid size-9 place-items-center rounded-full text-[#54656f] transition hover:bg-black/[0.055] hover:text-[#111b21] active:scale-95 disabled:opacity-50 dark:text-dark-text-secondary dark:hover:bg-white/[0.06] dark:hover:text-white"
            aria-label={t("chat.pauseRecording", "Stop and preview")}
            title={t("chat.pauseRecording", "Stop and preview")}
          >
            <Pause className="size-4.5" aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onResume}
            disabled={isSending}
            className="grid size-9 place-items-center rounded-full text-[#54656f] transition hover:bg-black/[0.055] hover:text-[#008069] active:scale-95 disabled:opacity-50 dark:text-dark-text-secondary dark:hover:bg-white/[0.06] dark:hover:text-emerald-400"
            aria-label={t("chat.resumeRecording", "Resume recording")}
            title={t("chat.resumeRecording", "Resume recording")}
          >
            <Mic className="size-4.5" aria-hidden="true" />
          </button>
        )}

        {/* Send voice note button */}
        <button
          type="button"
          onClick={onSend}
          disabled={isSending}
          className="grid size-9 place-items-center rounded-full bg-[#00a884] text-white shadow-sm shadow-[#00a884]/25 transition hover:bg-[#008f72] active:scale-95 disabled:opacity-50 dark:bg-[#00a884] dark:hover:bg-[#008f72]"
          aria-label={t("chat.sendVoiceNote", "Send voice message")}
          title={t("chat.sendVoiceNote", "Send voice message")}
        >
          {isSending ? (
            <Loader2 className="size-4.5 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="size-4" strokeWidth={2.2} aria-hidden="true" />
          )}
        </button>
      </div>
    </div>
  );
}

