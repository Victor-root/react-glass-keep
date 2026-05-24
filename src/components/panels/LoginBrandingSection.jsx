import React, { useState, useRef, useEffect } from "react";
import { t } from "../../i18n";
import TI from "../../icons/editor/index.jsx";
import { RowIcon } from "../common/SettingsAccordion.jsx";
import { fileToCompressedDataURL } from "../../utils/helpers.js";
import { DEFAULT_APP_NAME } from "../../branding/BrandingContext.jsx";

// Admin controls for the login-page branding (custom app name, logo,
// background image, background blur). Lives in its own file and is
// dropped into AdminPanel's existing "Login page settings" section so
// the panel stays a thin launcher. Saving goes through the same
// updateAdminSettings() the rest of the panel uses; on success we call
// refreshBranding() so the live header / next login render immediately.

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_LOGO_BYTES = 2 * 1024 * 1024; // mirror of the server cap
const MAX_BG_BYTES = 4 * 1024 * 1024;
const MAX_BLUR = 20;

// Shared button styles, matching the rest of the admin panel.
const PRIMARY_BTN =
  "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 bg-gradient-to-r from-indigo-500 to-violet-600 text-white hover:from-indigo-600 hover:to-violet-700 shadow-md shadow-indigo-300/40 dark:shadow-none hover:shadow-lg hover:shadow-indigo-300/50 dark:hover:shadow-none hover:scale-[1.03] active:scale-[0.98] btn-gradient disabled:opacity-50 disabled:pointer-events-none disabled:hover:scale-100";
const SUBTLE_BTN =
  "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm border border-[var(--border-light)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors disabled:opacity-50 disabled:pointer-events-none";
const DANGER_BTN =
  "inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors disabled:opacity-50 disabled:pointer-events-none";

// A few representative floating cards — a subset of the real login
// backdrop. Positioned across a virtual canvas that gets scaled down so
// several small cards fit inside the preview box.
const PREVIEW_CARDS = [
  { rot: "-12deg", dur: "7s", delay: "0s", top: "6%", left: "5%", c: "99,102,241" },
  { rot: "6deg", dur: "9s", delay: "-2s", top: "10%", left: "62%", c: "168,85,247" },
  { rot: "8deg", dur: "8s", delay: "-4s", top: "55%", left: "8%", c: "16,185,129" },
  { rot: "-8deg", dur: "10s", delay: "-1s", top: "52%", left: "66%", c: "245,158,11" },
  { rot: "10deg", dur: "8.5s", delay: "-3s", top: "30%", left: "34%", c: "236,72,153" },
  { rot: "-6deg", dur: "9.5s", delay: "-6s", top: "74%", left: "40%", c: "14,165,233" },
];

// Mirror of the login page's default backdrop (body gradient in light /
// solid dark) with the colored floating cards, scaled to fit the preview
// box. Shown when no custom background is configured so the admin sees
// exactly what "no image" looks like. The .login-deco-card CSS already
// flips opacity/colors for dark mode, so this adapts to the theme.
function DefaultBackdropPreview({ dark }) {
  const bg = dark
    ? "#1a1a1a"
    : "linear-gradient(135deg, #f0e8ff 0%, #e8f4fd 50%, #fde8f0 100%)";
  return (
    <div className="absolute inset-0" style={{ background: bg, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "278%",
          height: "278%",
          transform: "scale(0.36)",
          transformOrigin: "top left",
        }}
      >
        {PREVIEW_CARDS.map((k, i) => (
          <div
            key={i}
            className="login-deco-card"
            style={{ "--rot": k.rot, "--dur": k.dur, "--delay": k.delay, top: k.top, left: k.left, borderTop: `3px solid rgba(${k.c},0.7)` }}
          >
            <div className="deco-title" style={{ background: `rgba(${k.c},0.5)` }} />
            <div className="deco-line" style={{ width: "85%" }} />
            <div className="deco-line" style={{ width: "60%" }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// Custom app name — own draft + explicit Save, mirroring LoginSloganRow.
function AppNameRow({ value, onSave, showToast }) {
  const [draft, setDraft] = useState(value || "");
  const [busy, setBusy] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    setDraft((prev) => (prev === (value || "") ? prev : value || ""));
  }, [value]);

  const dirty = (draft || "") !== (value || "");

  const save = async () => {
    if (!dirty || busy) return;
    setBusy(true);
    const res = await onSave(draft.trim());
    setBusy(false);
    if (res) {
      setSavedFlash(true);
      showToast?.(t("saved"), "success");
      setTimeout(() => setSavedFlash(false), 1500);
    }
  };

  return (
    <div className="flex flex-col gap-2 px-3">
      <div className="flex items-center gap-3 min-w-0">
        <RowIcon icon={TI.Signature} />
        <div className="min-w-0">
          <div className="font-medium">{t("customAppName")}</div>
          <div className="text-sm text-gray-500">{t("customAppNameDesc")}</div>
        </div>
      </div>
      <div className="ml-11 flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          maxLength={10}
          className="flex-1 px-3 py-2 border border-[var(--border-light)] rounded-lg bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-500 dark:placeholder-gray-400 text-sm"
          placeholder={DEFAULT_APP_NAME}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              save();
            }
          }}
          disabled={busy}
        />
        <button type="button" onClick={save} disabled={!dirty || busy} className={`shrink-0 ${PRIMARY_BTN}`}>
          {busy ? t("saving") : savedFlash ? t("saved") : t("save")}
        </button>
      </div>
      <p className="ml-11 text-xs text-gray-400 dark:text-gray-500">{t("brandingResetHint")}</p>
    </div>
  );
}

export default function LoginBrandingSection({ dark, adminSettings, updateAdminSettings, showToast }) {
  const logoInputRef = useRef(null);
  const bgInputRef = useRef(null);
  const [busyField, setBusyField] = useState(null); // "logo" | "background" | "blur" | null

  const appName = adminSettings?.appName || "";
  const logo = adminSettings?.logo || null;
  const background = adminSettings?.loginBackground || null;
  const persistedBlur = Number.isFinite(adminSettings?.loginBackgroundBlur)
    ? adminSettings.loginBackgroundBlur
    : 0;

  // Live blur value for the slider + preview; commits to the server on
  // release so dragging stays smooth and doesn't spam PATCHes.
  const [blur, setBlur] = useState(persistedBlur);
  useEffect(() => {
    setBlur(persistedBlur);
  }, [persistedBlur]);

  // Slider rail: indigo→violet fill up to the current value, neutral
  // track after it (theme-aware).
  const blurPct = (blur / MAX_BLUR) * 100;
  const trackColor = dark ? "rgba(255,255,255,0.14)" : "rgba(148,163,184,0.35)";

  // updateAdminSettings persists + updates adminSettings; App's
  // onSettingsUpdated callback then refreshes the live branding context.
  const saveField = (patch) => updateAdminSettings(patch);

  // Shared upload path for logo + background: validate, compress to a
  // data URL, enforce the size cap, then persist.
  const handlePick = async (file, { field, maxDim, quality, maxBytes, successKey }) => {
    if (!file) return;
    if (file.type && !ACCEPTED_TYPES.includes(file.type)) {
      showToast?.(t("brandingInvalidFormat"), "error");
      return;
    }
    setBusyField(field);
    try {
      const dataUrl = await fileToCompressedDataURL(file, maxDim, quality);
      if (dataUrl.length > maxBytes) {
        showToast?.(t("brandingImageTooLarge"), "error");
        return;
      }
      const patch = field === "logo" ? { logo: dataUrl } : { loginBackground: dataUrl };
      const res = await saveField(patch);
      if (res) showToast?.(t(successKey), "success", undefined, "camera");
    } catch {
      showToast?.(t("uploadFailed"), "error");
    } finally {
      setBusyField(null);
    }
  };

  const removeImage = async (field, removedKey) => {
    setBusyField(field);
    const patch = field === "logo" ? { logo: null } : { loginBackground: null };
    const res = await saveField(patch);
    setBusyField(null);
    if (res) showToast?.(t(removedKey), "info", undefined, "trash");
  };

  const commitBlur = async () => {
    if (blur === persistedBlur || busyField) return;
    setBusyField("blur");
    await saveField({ loginBackgroundBlur: blur });
    setBusyField(null);
  };

  return (
    <div className="space-y-6">
      {/* 1 — Custom app name */}
      <AppNameRow value={appName} onSave={(name) => saveField({ appName: name })} showToast={showToast} />

      {/* 2 — Custom logo */}
      <div className="flex flex-col gap-3 px-3">
        <div className="flex items-center gap-3 min-w-0">
          <RowIcon icon={TI.PhotoHexagon} />
          <div className="min-w-0">
            <div className="font-medium">{t("customLogo")}</div>
            <div className="text-sm text-gray-500">{t("customLogoDesc")}</div>
          </div>
        </div>
        <div className="ml-11 space-y-3">
          <p className="text-xs text-gray-400 dark:text-gray-500">{t("customLogoRecommend")}</p>
          {/* Light + dark legibility preview */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { isDark: false, label: t("lightMode"), bg: "#ffffff" },
              { isDark: true, label: t("darkMode"), bg: "#222222" },
            ].map((sw) => (
              <div key={sw.label} className="flex flex-col items-center gap-1.5">
                <div
                  className="w-full h-20 rounded-lg border border-[var(--border-light)] flex items-center justify-center overflow-hidden"
                  style={{ background: sw.bg }}
                >
                  <img
                    src={logo || "/pwa-192.png"}
                    alt={appName || DEFAULT_APP_NAME}
                    className="h-12 w-12 rounded-xl object-contain select-none pointer-events-none"
                    draggable="false"
                  />
                </div>
                <span className="text-xs text-gray-400 dark:text-gray-500">{sw.label}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              ref={logoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                handlePick(e.target.files?.[0], {
                  field: "logo",
                  maxDim: 512,
                  quality: 0.92,
                  maxBytes: MAX_LOGO_BYTES,
                  successKey: "brandingLogoUpdated",
                });
                e.target.value = "";
              }}
            />
            <button type="button" className={SUBTLE_BTN} disabled={busyField === "logo"} onClick={() => logoInputRef.current?.click()}>
              <TI.Upload className="tabler-icon w-4 h-4" />
              {logo ? t("changeImage") : t("uploadImage")}
            </button>
            {logo && (
              <button type="button" className={DANGER_BTN} disabled={busyField === "logo"} onClick={() => removeImage("logo", "brandingLogoRemoved")}>
                <TI.Trash className="tabler-icon w-4 h-4" />
                {t("remove")}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3 — Login background image */}
      <div className="flex flex-col gap-3 px-3">
        <div className="flex items-center gap-3 min-w-0">
          <RowIcon icon={TI.Background} />
          <div className="min-w-0">
            <div className="font-medium">{t("loginBackgroundImage")}</div>
            <div className="text-sm text-gray-500">{t("loginBackgroundImageDesc")}</div>
          </div>
        </div>
        <div className="ml-11 space-y-3">
          <p className="text-xs text-gray-400 dark:text-gray-500">{t("loginBackgroundRecommend")}</p>
          {/* Preview. With a custom image: the real image + live blur +
              theme scrim + a sample card. Without one: the app's default
              floating-cards backdrop, so the admin sees the fallback. */}
          <div className="relative w-full h-36 rounded-lg border border-[var(--border-light)] overflow-hidden flex items-center justify-center">
            {background ? (
              <>
                <div
                  className="absolute"
                  style={{
                    inset: blur > 0 ? `-${blur * 2}px` : 0,
                    backgroundImage: `url(${background})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    filter: blur > 0 ? `blur(${blur}px)` : "none",
                  }}
                />
                <div
                  className="absolute inset-0"
                  style={{ background: dark ? "rgba(17,17,17,0.55)" : "rgba(255,255,255,0.45)" }}
                />
                <div className="relative glass-card rounded-lg px-4 py-3 flex items-center gap-2 shadow-lg">
                  <img src={logo || "/pwa-192.png"} alt="" className="h-6 w-6 rounded-md object-contain" draggable="false" />
                  <span className="text-sm font-bold">{appName || DEFAULT_APP_NAME}</span>
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
              ref={bgInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                handlePick(e.target.files?.[0], {
                  field: "background",
                  maxDim: 2560,
                  quality: 0.82,
                  maxBytes: MAX_BG_BYTES,
                  successKey: "brandingBackgroundUpdated",
                });
                e.target.value = "";
              }}
            />
            <button type="button" className={SUBTLE_BTN} disabled={busyField === "background"} onClick={() => bgInputRef.current?.click()}>
              <TI.Upload className="tabler-icon w-4 h-4" />
              {background ? t("changeImage") : t("uploadImage")}
            </button>
            {background && (
              <button type="button" className={DANGER_BTN} disabled={busyField === "background"} onClick={() => removeImage("background", "brandingBackgroundRemoved")}>
                <TI.Trash className="tabler-icon w-4 h-4" />
                {t("remove")}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4 — Background blur slider */}
      <div className="flex flex-col gap-3 px-3">
        <div className="flex items-center gap-3 min-w-0">
          <RowIcon icon={TI.DropletFilled} />
          <div className="min-w-0 flex-1">
            <div className="font-medium flex items-center justify-between gap-2">
              <span>{t("loginBackgroundBlurLabel")}</span>
              <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 tabular-nums">{blur} px</span>
            </div>
            <div className="text-sm text-gray-500">{t("loginBackgroundBlurDesc")}</div>
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
  );
}
