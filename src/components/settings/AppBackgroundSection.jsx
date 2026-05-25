import React, { useState, useRef, useEffect } from "react";
import { t } from "../../i18n";
import TI from "../../icons/editor/index.jsx";
import { RowIcon } from "../common/SettingsAccordion.jsx";
import DefaultBackdropPreview from "../common/DefaultBackdropPreview.jsx";
import { fileToCompressedDataURL } from "../../utils/helpers.js";
import { api } from "../../utils/api.js";
import { localizeServerError } from "../../utils/serverErrors.js";

// Per-user app background (image + blur) — same UX as the admin login
// background, but it applies behind the main app and each user sets their
// own. Writes go to the validated PUT /api/user/app-background; on success
// we update the App-level state (passed via setters) so the live backdrop
// re-renders. Dropped into the Settings panel's "UI preferences" section.

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_BG_BYTES = 4 * 1024 * 1024;
const MAX_BLUR = 20;

const SUBTLE_BTN =
  "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm border border-[var(--border-light)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors disabled:opacity-50 disabled:pointer-events-none";
const DANGER_BTN =
  "inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors disabled:opacity-50 disabled:pointer-events-none";

export default function AppBackgroundSection({
  token,
  appBackground,
  setAppBackground,
  appBackgroundBlur,
  setAppBackgroundBlur,
  showToast,
  dark,
}) {
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const persistedBlur = Number.isFinite(appBackgroundBlur) ? appBackgroundBlur : 0;
  const [blur, setBlur] = useState(persistedBlur);
  useEffect(() => {
    setBlur(persistedBlur);
  }, [persistedBlur]);

  const blurPct = (blur / MAX_BLUR) * 100;
  const trackColor = dark ? "rgba(255,255,255,0.14)" : "rgba(148,163,184,0.35)";

  const handlePick = async (file) => {
    if (!file) return;
    if (file.type && !ACCEPTED_TYPES.includes(file.type)) {
      showToast?.(t("brandingInvalidFormat"), "error");
      return;
    }
    setBusy(true);
    try {
      const dataUrl = await fileToCompressedDataURL(file, 1920, 0.8);
      if (dataUrl.length > MAX_BG_BYTES) {
        showToast?.(t("brandingImageTooLarge"), "error");
        return;
      }
      await api("/user/app-background", { method: "PUT", token, body: { image: dataUrl } });
      setAppBackground(dataUrl);
      showToast?.(t("brandingBackgroundUpdated"), "success", undefined, "camera");
    } catch (e) {
      showToast?.(localizeServerError(e?.message, "uploadFailed"), "error");
    } finally {
      setBusy(false);
    }
  };

  const removeImage = async () => {
    setBusy(true);
    try {
      await api("/user/app-background", { method: "PUT", token, body: { image: null } });
      setAppBackground(null);
      showToast?.(t("brandingBackgroundRemoved"), "info", undefined, "trash");
    } catch (e) {
      showToast?.(localizeServerError(e?.message, "removeFailed"), "error");
    } finally {
      setBusy(false);
    }
  };

  const commitBlur = async () => {
    if (blur === persistedBlur || busy) return;
    try {
      await api("/user/app-background", { method: "PUT", token, body: { blur } });
      setAppBackgroundBlur(blur);
    } catch (e) {
      showToast?.(localizeServerError(e?.message, "saveFailed"), "error");
    }
  };

  return (
    <div className="flex flex-col gap-3 px-3">
      <div className="flex items-center gap-3 min-w-0">
        <RowIcon icon={TI.Background} />
        <div className="min-w-0">
          <div className="font-medium">{t("appBackgroundImage")}</div>
          <div className="text-sm text-gray-500">{t("appBackgroundImageDesc")}</div>
        </div>
      </div>
      <div className="ml-11 space-y-3">
        <p className="text-xs text-gray-400 dark:text-gray-500">{t("loginBackgroundRecommend")}</p>
        {/* Preview. With a custom image: the real image + live blur +
            theme scrim + a sample card. Without one: the app's default
            floating-cards backdrop. */}
        <div className="relative w-full h-36 rounded-lg border border-[var(--border-light)] overflow-hidden flex items-center justify-center">
          {appBackground ? (
            <>
              <div
                className="absolute"
                style={{
                  inset: blur > 0 ? `-${blur * 2}px` : 0,
                  backgroundImage: `url(${appBackground})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  filter: blur > 0 ? `blur(${blur}px)` : "none",
                }}
              />
              <div
                className="absolute inset-0"
                style={{ background: dark ? "rgba(26,26,26,0.6)" : "transparent" }}
              />
              {/* A little cluster of sample notes so the preview reads as
                  "your notes over this wallpaper" rather than one box. */}
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
              <DefaultBackdropPreview dark={dark} />
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
              handlePick(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <button type="button" className={SUBTLE_BTN} disabled={busy} onClick={() => fileRef.current?.click()}>
            <TI.Upload className="tabler-icon w-4 h-4" />
            {appBackground ? t("changeImage") : t("uploadImage")}
          </button>
          {appBackground && (
            <button type="button" className={DANGER_BTN} disabled={busy} onClick={removeImage}>
              <TI.Trash className="tabler-icon w-4 h-4" />
              {t("remove")}
            </button>
          )}
        </div>

        {/* Blur slider */}
        <div className="pt-1">
          <div className="flex items-center gap-3 min-w-0 mb-2">
            <RowIcon icon={TI.DropletFilled} />
            <div className="min-w-0 flex-1">
              <div className="font-medium flex items-center justify-between gap-2">
                <span>{t("loginBackgroundBlurLabel")}</span>
                <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 tabular-nums">{blur} px</span>
              </div>
              <div className="text-sm text-gray-500">{t("appBackgroundBlurDesc")}</div>
            </div>
          </div>
          <div className="ml-11">
            <input
              type="range"
              min={0}
              max={MAX_BLUR}
              step={1}
              value={blur}
              onChange={(e) => setBlur(Number(e.target.value))}
              onPointerUp={commitBlur}
              onKeyUp={commitBlur}
              className="gk-range w-full"
              style={{
                background: `linear-gradient(to right, #6366f1 0%, #8b5cf6 ${blurPct}%, ${trackColor} ${blurPct}%, ${trackColor} 100%)`,
              }}
              aria-label={t("loginBackgroundBlurLabel")}
            />
            <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mt-1">
              <span>0</span>
              <span>{MAX_BLUR} px</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
