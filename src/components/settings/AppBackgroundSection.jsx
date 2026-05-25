import React, { useState, useRef, useEffect } from "react";
import { t } from "../../i18n";
import TI from "../../icons/editor/index.jsx";
import { RowIcon } from "../common/SettingsAccordion.jsx";
import DefaultBackdropPreview from "../common/DefaultBackdropPreview.jsx";
import { fileToCompressedDataURL } from "../../utils/helpers.js";
import { api } from "../../utils/api.js";
import { localizeServerError } from "../../utils/serverErrors.js";

// Per-user app background (image + blur), with an optional light/dark
// split. When "separate" is off, one shared background applies to both
// themes; when on, two tabs let the user set a distinct background per
// theme. Writes go to the validated PUT /api/user/app-background, which
// returns the full state — we rebuild the parent `appBg` object from it.

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_BG_BYTES = 4 * 1024 * 1024;
const MAX_BLUR = 20;

const SUBTLE_BTN =
  "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm border border-[var(--border-light)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors disabled:opacity-50 disabled:pointer-events-none";
const DANGER_BTN =
  "inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors disabled:opacity-50 disabled:pointer-events-none";

function fromResponse(res) {
  return {
    separate: !!res.appBackgroundSeparate,
    light: { image: res.appBackground || null, blur: res.appBackgroundBlur || 0 },
    dark: { image: res.appBackgroundDark || null, blur: res.appBackgroundBlurDark || 0 },
  };
}

// One background slot's controls: preview (real image + live blur + theme
// scrim, or the default floating-cards backdrop), upload/remove buttons,
// and a blur slider (disabled until an image is set). `previewDark` is the
// theme the slot targets (drives the preview); `dark` is the settings
// panel's current theme (drives the slider rail colours).
function BackgroundEditor({ image, blur, previewDark, dark, busy, onPick, onRemove, onCommitBlur }) {
  const fileRef = useRef(null);
  const [blurDraft, setBlurDraft] = useState(blur);
  useEffect(() => {
    setBlurDraft(blur);
  }, [blur]);

  const blurPct = (blurDraft / MAX_BLUR) * 100;
  const trackColor = dark ? "rgba(255,255,255,0.14)" : "rgba(148,163,184,0.35)";
  const scrim = previewDark ? "rgba(26,26,26,0.6)" : "transparent";

  const commitBlur = () => {
    if (blurDraft !== blur && !busy) onCommitBlur(blurDraft);
  };

  return (
    <div className="space-y-3">
      <div className="relative w-full h-36 rounded-lg border border-[var(--border-light)] overflow-hidden flex items-center justify-center">
        {image ? (
          <>
            <div
              className="absolute"
              style={{
                inset: blurDraft > 0 ? `-${blurDraft * 2}px` : 0,
                backgroundImage: `url(${image})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                filter: blurDraft > 0 ? `blur(${blurDraft}px)` : "none",
              }}
            />
            <div className="absolute inset-0" style={{ background: scrim }} />
            <div className="relative flex items-start gap-2">
              {[
                { bg: "bg-indigo-100", lines: 3 },
                { bg: "bg-rose-100", lines: 1 },
                { bg: "bg-amber-100", lines: 2 },
              ].map((card, i) => (
                <div key={i} className={`w-14 rounded-lg ${card.bg} shadow-md p-1.5`}>
                  <div className="h-1.5 w-3/4 rounded bg-gray-500/50 mb-1.5" />
                  {Array.from({ length: card.lines }).map((_, j) => (
                    <div key={j} className="h-1 w-full rounded bg-gray-400/45 mb-1 last:mb-0" />
                  ))}
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <DefaultBackdropPreview dark={previewDark} />
            <span className="relative glass-card rounded-full px-3 py-1 text-xs text-gray-600 dark:text-gray-300 shadow-sm">
              {t("loginBackgroundDefaultPreview")}
            </span>
          </>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            onPick(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <button type="button" className={SUBTLE_BTN} disabled={busy} onClick={() => fileRef.current?.click()}>
          <TI.Upload className="tabler-icon w-4 h-4" />
          {image ? t("changeImage") : t("uploadImage")}
        </button>
        {image && (
          <button type="button" className={DANGER_BTN} disabled={busy} onClick={onRemove}>
            <TI.Trash className="tabler-icon w-4 h-4" />
            {t("remove")}
          </button>
        )}
      </div>

      <div className={image ? "" : "opacity-50"}>
        <div className="flex items-center gap-3 min-w-0 mb-2">
          <RowIcon icon={TI.DropletFilled} />
          <div className="min-w-0 flex-1">
            <div className="font-medium flex items-center justify-between gap-2">
              <span>{t("loginBackgroundBlurLabel")}</span>
              <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 tabular-nums">{blurDraft} px</span>
            </div>
            <div className="text-sm text-gray-500">{image ? t("appBackgroundBlurDesc") : t("blurDisabledNoBg")}</div>
          </div>
        </div>
        <input
          type="range"
          min={0}
          max={MAX_BLUR}
          step={1}
          value={blurDraft}
          disabled={!image}
          onChange={(e) => setBlurDraft(Number(e.target.value))}
          onPointerUp={commitBlur}
          onKeyUp={commitBlur}
          className={`gk-range w-full ${image ? "" : "cursor-not-allowed"}`}
          style={{ background: `linear-gradient(to right, #6366f1 0%, #8b5cf6 ${blurPct}%, ${trackColor} ${blurPct}%, ${trackColor} 100%)` }}
          aria-label={t("loginBackgroundBlurLabel")}
        />
        <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mt-1">
          <span>0</span>
          <span>{MAX_BLUR} px</span>
        </div>
      </div>
    </div>
  );
}

export default function AppBackgroundSection({ token, appBg, setAppBg, showToast, dark }) {
  const [tab, setTab] = useState("light"); // active variant tab when separated
  const [busy, setBusy] = useState(null); // "light" | "dark" | "separate" | null

  const put = async (body) => {
    const res = await api("/user/app-background", { method: "PUT", token, body });
    if (res) setAppBg(fromResponse(res));
    return res;
  };

  const toggleSeparate = async () => {
    setBusy("separate");
    try {
      await put({ separate: !appBg.separate });
    } catch (e) {
      showToast?.(localizeServerError(e?.message, "saveFailed"), "error");
    } finally {
      setBusy(null);
    }
  };

  const pickImage = async (variant, file) => {
    if (!file) return;
    if (file.type && !ACCEPTED_TYPES.includes(file.type)) {
      showToast?.(t("brandingInvalidFormat"), "error");
      return;
    }
    setBusy(variant);
    try {
      const dataUrl = await fileToCompressedDataURL(file, 1920, 0.8);
      if (dataUrl.length > MAX_BG_BYTES) {
        showToast?.(t("brandingImageTooLarge"), "error");
        return;
      }
      const res = await put({ variant, image: dataUrl });
      if (res) showToast?.(t("brandingBackgroundUpdated"), "success", undefined, "camera");
    } catch (e) {
      showToast?.(localizeServerError(e?.message, "uploadFailed"), "error");
    } finally {
      setBusy(null);
    }
  };

  const removeImage = async (variant) => {
    setBusy(variant);
    try {
      const res = await put({ variant, image: null });
      if (res) showToast?.(t("brandingBackgroundRemoved"), "info", undefined, "trash");
    } catch (e) {
      showToast?.(localizeServerError(e?.message, "removeFailed"), "error");
    } finally {
      setBusy(null);
    }
  };

  const commitBlur = async (variant, value) => {
    try {
      await put({ variant, blur: value });
    } catch (e) {
      showToast?.(localizeServerError(e?.message, "saveFailed"), "error");
    }
  };

  const editorFor = (variant) => (
    <BackgroundEditor
      key={variant}
      image={appBg[variant].image}
      blur={appBg[variant].blur}
      previewDark={appBg.separate ? variant === "dark" : dark}
      dark={dark}
      busy={busy === variant}
      onPick={(f) => pickImage(variant, f)}
      onRemove={() => removeImage(variant)}
      onCommitBlur={(v) => commitBlur(variant, v)}
    />
  );

  const tabBtn = (key, label) => (
    <button
      type="button"
      onClick={() => setTab(key)}
      className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
        tab === key
          ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100"
          : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col gap-3 px-3">
      <div className="flex items-center gap-3 min-w-0">
        <RowIcon icon={TI.Background} />
        <div className="min-w-0">
          <div className="font-medium">{t("appBackgroundImage")}</div>
          <div className="text-sm text-gray-500">{t("appBackgroundImageDesc")}</div>
        </div>
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500">{t("loginBackgroundRecommend")}</p>

      {/* Separate light / dark toggle */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <RowIcon icon={TI.AdjustmentsHorizontal} />
          <div className="min-w-0">
            <div className="font-medium">{t("separateLightDark")}</div>
            <div className="text-sm text-gray-500">{t("separateLightDarkDesc")}</div>
          </div>
        </div>
        <button
          type="button"
          disabled={busy === "separate"}
          onClick={toggleSeparate}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
            appBg.separate ? "bg-indigo-600" : "bg-gray-300 dark:bg-gray-600"
          } disabled:opacity-50`}
          aria-pressed={appBg.separate}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              appBg.separate ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {appBg.separate ? (
        <>
          <div className="flex gap-1 rounded-lg bg-black/5 dark:bg-white/10 p-1">
            {tabBtn("light", t("lightMode"))}
            {tabBtn("dark", t("darkMode"))}
          </div>
          {editorFor(tab)}
        </>
      ) : (
        editorFor("light")
      )}
    </div>
  );
}
