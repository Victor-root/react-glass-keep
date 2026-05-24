// Single notification card. macOS Notification Centre styling with
// the app's violet/blue/pink gradient + heavy blur instead of a flat
// white surface — see globalCSS.
//
// Layout:
//   [variant icon]  [title]                      [time]
//                   [message…]
//                                                [action]
//
// The action button is anchored to the bottom-right of the card so
// it never crowds the timestamp at the top-right.
//
// Message content can be a plain string OR contain `**bold**` markers
// (parsed into <strong> spans). React escapes the surrounding text
// children, so title / message remain XSS-safe even when the values
// originate from the server.

import React, { useRef, useState, useEffect } from "react";
import TI from "../../icons/editor/index.jsx";
import { t } from "../../i18n";

const VARIANT_CLASS = {
  success: "gk-notif-card--success",
  error: "gk-notif-card--error",
  warning: "gk-notif-card--warning",
  info: "gk-notif-card--info",
};

// Semantic icon keys → Tabler component. Callers pass an explicit
// `icon` field on the notification spec (e.g. `icon: "trash"` for a
// move-to-trash toast). The mapping keeps the choice in one place
// rather than scattering icon references across the codebase. When
// the key is missing or unknown we fall back to the variant glyph.
const SEMANTIC_ICONS = {
  trash: { Comp: TI.Trash, filled: false },
  "trash-x": { Comp: TI.TrashX, filled: false },
  restore: { Comp: TI.ArrowBackUp, filled: false },
  archive: { Comp: TI.Archive, filled: false },
  "archive-off": { Comp: TI.ArchiveOff, filled: false },
  copy: { Comp: TI.Copy, filled: false },
  save: { Comp: TI.DeviceFloppy, filled: false },
  note: { Comp: TI.Note, filled: false },
  edit: { Comp: TI.Pencil, filled: false },
  share: { Comp: TI.UserShare, filled: false },
  unshare: { Comp: TI.UserX, filled: false },
  "user-plus": { Comp: TI.UserPlus, filled: false },
  "user-check": { Comp: TI.UserCheck, filled: false },
  "user-x": { Comp: TI.UserX, filled: false },
  "user-clock": { Comp: TI.UserClock, filled: false },
  users: { Comp: TI.Users, filled: false },
  key: { Comp: TI.Key, filled: false },
  shield: { Comp: TI.ShieldLock, filled: false },
  qr: { Comp: TI.Qrcode, filled: false },
  camera: { Comp: TI.Camera, filled: false },
  refresh: { Comp: TI.Refresh, filled: false },
  power: { Comp: TI.Power, filled: false },
};

function VariantGlyph({ variant, iconKey }) {
  const className = "tabler-icon gk-notif-card__icon-glyph";
  const semantic = iconKey ? SEMANTIC_ICONS[iconKey] : null;
  if (semantic && semantic.Comp) {
    const Comp = semantic.Comp;
    return (
      <Comp
        className={`${className}${semantic.filled ? " tabler-icon--filled" : ""}`}
      />
    );
  }
  // Fallback: variant-coloured filled glyph (info / success / warning
  // / error). These are always filled, so the --filled modifier flips
  // the default outline-icon CSS to fill: currentColor.
  const filledClass = `${className} tabler-icon--filled`;
  if (variant === "success") return <TI.CircleCheckFilled className={filledClass} />;
  if (variant === "warning") return <TI.AlertTriangleFilled className={filledClass} />;
  if (variant === "error") return <TI.AlertCircleFilled className={filledClass} />;
  return <TI.InfoCircleFilled className={filledClass} />;
}

function fallbackTitle(variant) {
  if (variant === "success") return t("notifFallbackSuccess");
  if (variant === "warning") return t("notifFallbackWarning");
  if (variant === "error") return t("notifFallbackError");
  return t("notifFallbackInfo");
}

export function formatRelativeTime(ts) {
  if (!ts) return "";
  const diff = Date.now() - ts;
  if (diff < 60_000) return t("relativeJustNow");
  if (diff < 3_600_000)
    return t("relativeMinutesAgo", { n: Math.floor(diff / 60_000) });
  if (diff < 86_400_000)
    return t("relativeHoursAgo", { n: Math.floor(diff / 3_600_000) });
  return t("relativeDaysAgo", { n: Math.floor(diff / 86_400_000) });
}

function renderMessage(message) {
  if (message == null) return null;
  if (typeof message !== "string") return message;
  if (!message.includes("**")) return message;
  const parts = message.split(/(\*\*[^*]+\*\*)/);
  return parts.map((p, i) => {
    if (!p) return null;
    if (p.startsWith("**") && p.endsWith("**")) {
      return <strong key={i}>{p.slice(2, -2)}</strong>;
    }
    return <React.Fragment key={i}>{p}</React.Fragment>;
  });
}

// Swipe-to-dismiss threshold in pixels.
const SWIPE_DISMISS_THRESHOLD = 80;
// translateX applied when flinging off-screen.
const SWIPE_EXIT_PX = 500;

export default function NotificationCard({
  notification,
  onDismiss,
  onAction,
  compact = false,
  closeSide = "left",
  // "toast" (default): premium glass with violet/blue gradient + LED
  // halo, used by the floating viewport. "center": neutral, near-
  // transparent glass that lets the panel surface show through — the
  // variant identity falls back to the icon + a thin accent bar on
  // the left edge so the panel doesn't stack two heavy gradients.
  mode = "toast",
  // When true (mobile panel): hides the X button and enables horizontal
  // swipe to dismiss the card.
  swipeable = false,
}) {
  const cardRef = useRef(null);
  // Touch tracking — refs so event handlers never go stale.
  const startXRef = useRef(null);
  const deltaRef = useRef(0);
  // Latest onDismiss / id via ref so the single useEffect never needs
  // to re-register listeners when props update.
  const onDismissRef = useRef(onDismiss);
  const notifIdRef = useRef(notification?.id);
  useEffect(() => { onDismissRef.current = onDismiss; });
  useEffect(() => { notifIdRef.current = notification?.id; });

  const [translate, setTranslate] = useState(0);
  // animated=true → apply CSS transition (spring-back or exit fling).
  // animated=false → raw tracking, no transition lag.
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    if (!swipeable) return undefined;
    const el = cardRef.current;
    if (!el) return undefined;

    const onTouchStart = (e) => {
      startXRef.current = e.touches[0].clientX;
      deltaRef.current = 0;
      setAnimated(false);
      setTranslate(0);
    };

    const onTouchMove = (e) => {
      if (startXRef.current === null) return;
      const dx = e.touches[0].clientX - startXRef.current;
      deltaRef.current = dx;
      setTranslate(dx);
    };

    const onTouchEnd = () => {
      if (startXRef.current === null) return;
      startXRef.current = null;
      const dx = deltaRef.current;
      setAnimated(true);
      if (Math.abs(dx) >= SWIPE_DISMISS_THRESHOLD) {
        const dir = dx > 0 ? 1 : -1;
        setTranslate(dir * SWIPE_EXIT_PX);
        setTimeout(() => {
          onDismissRef.current?.(notifIdRef.current);
        }, 220);
      } else {
        setTranslate(0);
        setTimeout(() => setAnimated(false), 300);
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    el.addEventListener("touchcancel", onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [swipeable]);

  if (!notification) return null;
  const { id, title, message, variant, dismissible, action, createdAt, icon: iconKey } =
    notification;
  const klass = VARIANT_CLASS[variant] || VARIANT_CLASS.info;
  const closeKlass =
    closeSide === "right" ? " gk-notif-card--close-right" : "";
  const modeKlass = mode === "center" ? " gk-notif-card--center" : "";
  const time = formatRelativeTime(createdAt);
  const headline = title || fallbackTitle(variant);

  const swipeStyle = swipeable
    ? {
        transform: `translateX(${translate}px)`,
        opacity: Math.max(0, 1 - Math.abs(translate) / 200),
        transition: animated
          ? "transform 0.25s ease, opacity 0.25s ease"
          : "none",
        touchAction: "pan-y",
        userSelect: "none",
        willChange: "transform",
      }
    : {};

  return (
    <div
      ref={cardRef}
      role="status"
      aria-live={variant === "error" ? "assertive" : "polite"}
      className={`gk-notif-card ${klass}${compact ? " gk-notif-card--compact" : ""}${closeKlass}${modeKlass}`}
      style={swipeStyle}
    >
      {dismissible !== false && !swipeable ? (
        <button
          type="button"
          aria-label={t("close")}
          className="gk-notif-card__close"
          onClick={() => onDismiss && onDismiss(id)}
        >
          ✕
        </button>
      ) : null}

      {time ? <span className="gk-notif-card__time">{time}</span> : null}

      <span className="gk-notif-card__icon" aria-hidden="true">
        <VariantGlyph variant={variant} iconKey={iconKey} />
      </span>

      <div className="gk-notif-card__body">
        <div className="gk-notif-card__title">{headline}</div>
        <div className="gk-notif-card__body-end">
          {message ? (
            <div className="gk-notif-card__message">{renderMessage(message)}</div>
          ) : (
            // Spacer so the action button still right-aligns inside
            // the flex row when no message is set.
            <div className="gk-notif-card__message" aria-hidden="true" />
          )}
          {action ? (
            <button
              type="button"
              className="gk-notif-card__action-btn"
              onClick={() => onAction && onAction(notification)}
            >
              {action.label}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
