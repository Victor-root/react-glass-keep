import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { t } from "../../i18n";
import { MicIcon, Trash } from "../../icons/index.jsx";
import useAudioRecorder, {
  RECORDER_STATE,
  RECORDER_ERROR,
} from "../../hooks/useAudioRecorder.js";
import {
  AUDIO_MAX_TOTAL_BYTES,
  blobToDataUrl,
  formatDuration,
  makeClip,
  parseAudioContent,
  serializeAudioContent,
  totalClipsBytes,
} from "../../utils/audioNote.js";
import AudioPlayer from "./AudioPlayer.jsx";

// AudioNoteEditor — body of an audio note inside the standard NoteModal.
//
// Reads/writes the note via setBody(serialize(...)). Holds no persisted
// state of its own; the surrounding modal owns autosave (just like the
// drawing editor for draw notes).
//
// UI states:
//  - 0 clips:  big "tap to record" CTA (recorder inline)
//  - ≥1 clip:  themed player for current clip + prev/next + add/delete
//  - recording: pulsing mic + timer + cancel/stop, on top of the same
//               coloured shell so the modal layout never jumps.
//
// Notes:
//  - clip.id is the React key for navigation; ordering is insertion order.
//  - On stop, the new clip becomes the current selection so the user
//    immediately hears their take. Cancel discards in the recorder hook.

export default function AudioNoteEditor({ body, setBody, title }) {
  const parsed = useMemo(() => parseAudioContent(body), [body]);
  const clips = parsed.clips;

  // currentIndex tracks the clip the player is showing. Defaults to 0; clamps
  // automatically when clips are added/removed so the carousel never points
  // at a missing clip.
  const [currentIndex, setCurrentIndex] = useState(0);
  useEffect(() => {
    if (currentIndex >= clips.length) {
      setCurrentIndex(Math.max(0, clips.length - 1));
    }
  }, [clips.length, currentIndex]);

  const [recording, setRecording] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const writeClips = useCallback(
    (nextClips) => {
      setBody(serializeAudioContent({ clips: nextClips, text: parsed.text }));
    },
    [setBody, parsed.text],
  );

  const onRecorderSave = useCallback(
    async ({ audioDataUrl, mimeType, duration, size }) => {
      const newClip = makeClip({ audioDataUrl, mimeType, duration, size });
      const next = [...clips, newClip];
      const projected = totalClipsBytes(next);
      if (projected > AUDIO_MAX_TOTAL_BYTES) {
        setSaveError(t("audioRecordingTooLarge"));
        return false;
      }
      writeClips(next);
      setCurrentIndex(next.length - 1);
      setRecording(false);
      setSaveError(null);
      return true;
    },
    [clips, writeClips],
  );

  const onDeleteCurrent = useCallback(() => {
    if (clips.length === 0) return;
    const next = clips.filter((_, i) => i !== currentIndex);
    writeClips(next);
    setCurrentIndex((i) => Math.max(0, Math.min(i, next.length - 1)));
  }, [clips, currentIndex, writeClips]);

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => (i > 0 ? i - 1 : 0));
  }, []);
  const goNext = useCallback(() => {
    setCurrentIndex((i) => (i < clips.length - 1 ? i + 1 : i));
  }, [clips.length]);

  const startRecording = useCallback(() => {
    setSaveError(null);
    setRecording(true);
  }, []);
  const cancelRecording = useCallback(() => {
    setRecording(false);
  }, []);

  if (recording) {
    return (
      <RecorderPanel
        onCancel={cancelRecording}
        onSave={onRecorderSave}
      />
    );
  }

  if (clips.length === 0) {
    return (
      <EmptyState onStart={startRecording} />
    );
  }

  const current = clips[Math.min(currentIndex, clips.length - 1)];
  return (
    <div className="flex flex-col gap-3">
      <AudioPlayer
        audio={current}
        title={title}
        variant="hero"
        showDownload
        showClipNav={clips.length > 1}
        clipIndex={currentIndex}
        clipCount={clips.length}
        onPrevClip={goPrev}
        onNextClip={goNext}
      />
      <div className="flex items-center justify-between gap-2 px-1">
        <button
          type="button"
          onClick={onDeleteCurrent}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-red-600 dark:text-red-300 bg-white/60 dark:bg-white/5 hover:bg-red-50 dark:hover:bg-red-900/30 border border-red-200/60 dark:border-red-800/40 active:scale-[0.98] transition focus:outline-none focus:ring-2 focus:ring-red-400/50"
          aria-label={t("audioDeleteClip")}
        >
          <Trash />
          <span>{t("audioDeleteClip")}</span>
        </button>
        <button
          type="button"
          onClick={startRecording}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white shadow-sm bg-gradient-to-br from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 active:scale-[0.98] transition focus:outline-none focus:ring-2 focus:ring-rose-400/50"
          aria-label={t("audioAddRecording")}
        >
          <MicIcon />
          <span>{t("audioAddRecording")}</span>
        </button>
      </div>
      {saveError && (
        <div role="alert" className="text-sm rounded-lg px-3 py-2 bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200">
          {saveError}
        </div>
      )}
    </div>
  );
}

function EmptyState({ onStart }) {
  return (
    <div className="flex flex-col items-center gap-4 py-6">
      <div className="w-20 h-20 rounded-full flex items-center justify-center text-white shadow-lg bg-gradient-to-br" style={{ backgroundImage: "linear-gradient(135deg, var(--note-color, #a78bfa), var(--note-color-opaque, #a78bfa))" }}>
        <span className="scale-150"><MicIcon /></span>
      </div>
      <div className="text-sm text-center text-gray-600 dark:text-gray-300 max-w-xs">
        {t("audioNoteEmptyHint")}
      </div>
      <button
        type="button"
        onClick={onStart}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-white shadow-md bg-gradient-to-br from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 active:scale-[0.98] transition focus:outline-none focus:ring-2 focus:ring-rose-400/50"
      >
        <MicIcon />
        <span className="text-sm font-semibold">{t("audioStartRecording")}</span>
      </button>
    </div>
  );
}

function RecorderPanel({ onCancel, onSave }) {
  const recorder = useAudioRecorder();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Auto-start when the panel mounts so the user only ever clicks once
  // ("add recording" button) before recording begins. Permission prompt
  // will surface here. If the user declines or recording isn't supported,
  // recorder.error handles the messaging.
  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    recorder.start();
    return () => {
      // Cancel any in-flight recording when this panel is unmounted.
      recorder.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStop = () => {
    recorder.stop();
  };

  const handleCancel = () => {
    recorder.cancel();
    onCancel?.();
  };

  // Once a recording is READY in the recorder, immediately push it up to the
  // editor via onSave. We don't show a separate preview step here — the user
  // will see the new clip in the player after this returns.
  useEffect(() => {
    if (recorder.state !== RECORDER_STATE.READY || !recorder.result || saving) return;
    let cancelled = false;
    setSaving(true);
    setError(null);
    (async () => {
      try {
        const dataUrl = await blobToDataUrl(recorder.result.blob);
        if (cancelled) return;
        const ok = await onSave({
          audioDataUrl: dataUrl,
          mimeType: recorder.result.mimeType,
          duration: recorder.result.duration,
          size: recorder.result.size,
        });
        if (!ok) {
          setError(t("audioRecordingFailed"));
          setSaving(false);
        }
      } catch {
        if (!cancelled) {
          setError(t("audioRecordingFailed"));
          setSaving(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [recorder.state, recorder.result, saving, onSave]);

  const errorMessage = (() => {
    if (error) return error;
    if (recorder.error === RECORDER_ERROR.NOT_SUPPORTED) return t("audioRecordingNotSupported");
    if (recorder.error === RECORDER_ERROR.PERMISSION_DENIED) return t("audioPermissionDenied");
    if (recorder.error === RECORDER_ERROR.EMPTY) return t("audioRecordingEmpty");
    if (recorder.error === RECORDER_ERROR.RECORDING_FAILED) return t("audioRecordingFailed");
    return null;
  })();

  const isRecording = recorder.state === RECORDER_STATE.RECORDING;
  const isPaused = recorder.state === RECORDER_STATE.PAUSED;
  const isError = recorder.state === RECORDER_STATE.ERROR;

  return (
    <div className="flex flex-col items-center gap-4 py-4">
      <div
        className={`w-20 h-20 rounded-full flex items-center justify-center text-white shadow-lg transition-colors ${
          isRecording ? "bg-rose-500 animate-pulse"
          : isPaused ? "bg-amber-500"
          : isError ? "bg-gray-400 dark:bg-gray-600"
          : "bg-rose-400/80"
        }`}
        aria-label={isRecording ? t("audioRecordingInProgress") : t("audioRecording")}
      >
        <span className="scale-150"><MicIcon /></span>
      </div>
      <div className="text-3xl font-semibold tabular-nums">
        {formatDuration(recorder.elapsed)}
      </div>
      <div className="text-xs text-gray-600 dark:text-gray-300 min-h-[1em]">
        {isRecording ? t("audioRecordingInProgress") : isPaused ? t("audioRecordingPaused") : ""}
      </div>

      {errorMessage && (
        <div role="alert" className="text-sm rounded-lg px-3 py-2 bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200 max-w-sm text-center">
          {errorMessage}
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleCancel}
          disabled={saving}
          className="px-4 py-2 rounded-full text-sm border border-[var(--border-light)] hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-50"
        >
          {t("audioCancelRecording")}
        </button>
        {isRecording && (
          <button
            type="button"
            onClick={() => recorder.pause()}
            className="px-4 py-2 rounded-full text-sm bg-amber-500 text-white hover:bg-amber-600 active:scale-[0.98] transition focus:outline-none focus:ring-2 focus:ring-amber-400/50"
          >
            {t("audioPauseRecording")}
          </button>
        )}
        {isPaused && (
          <button
            type="button"
            onClick={() => recorder.resume()}
            className="px-4 py-2 rounded-full text-sm bg-amber-500 text-white hover:bg-amber-600 active:scale-[0.98] transition focus:outline-none focus:ring-2 focus:ring-amber-400/50"
          >
            {t("audioResumeRecording")}
          </button>
        )}
        {(isRecording || isPaused) && (
          <button
            type="button"
            onClick={handleStop}
            disabled={saving}
            className="px-4 py-2 rounded-full text-sm bg-rose-600 text-white hover:bg-rose-700 active:scale-[0.98] transition focus:outline-none focus:ring-2 focus:ring-rose-400/50 disabled:opacity-50"
          >
            {t("audioStopRecording")}
          </button>
        )}
        {isError && (
          <button
            type="button"
            onClick={() => { recorder.reset(); recorder.start(); }}
            className="px-4 py-2 rounded-full text-sm bg-rose-600 text-white hover:bg-rose-700 active:scale-[0.98] transition focus:outline-none focus:ring-2 focus:ring-rose-400/50"
          >
            {t("audioStartRecording")}
          </button>
        )}
      </div>
    </div>
  );
}
