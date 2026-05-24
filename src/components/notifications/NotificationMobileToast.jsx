// Mobile notification dispatcher.
//
// Renders the same in-app CSS pill on every form factor — PWA,
// browser, AND inside the Android WebView wrapper. The native
// Toast.makeText bridge (window.AndroidToast) is still shipped by
// the APK but no longer invoked from here: a native OS toast can't
// carry our action buttons (e.g. "Mettre à jour maintenant") and
// it bypasses the variant palette / countdown bar that make the
// pill recognisable, so we keep one consistent visual across
// devices.
//
// The notification still lands in the provider's history list so
// the bell + panel work the same everywhere.

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNotifications } from "./NotificationProvider.jsx";
import TI from "../../icons/editor/index.jsx";

const VARIANT_GLYPH = {
  success: TI.CircleCheckFilled,
  warning: TI.AlertTriangleFilled,
  error: TI.AlertCircleFilled,
  info: TI.InfoCircleFilled,
};

const SEMANTIC_ICONS = {
  trash: TI.Trash,
  "trash-x": TI.TrashX,
  restore: TI.ArrowBackUp,
  archive: TI.Archive,
  "archive-off": TI.ArchiveOff,
  copy: TI.Copy,
  save: TI.DeviceFloppy,
  share: TI.UserShare,
  unshare: TI.UserX,
  "user-plus": TI.UserPlus,
  "user-check": TI.UserCheck,
  "user-x": TI.UserX,
  "user-clock": TI.UserClock,
  key: TI.Key,
  shield: TI.ShieldLock,
  qr: TI.Qrcode,
  camera: TI.Camera,
  refresh: TI.Refresh,
  power: TI.Power,
};

function pickGlyph(notif) {
  if (notif.icon && SEMANTIC_ICONS[notif.icon]) {
    return { Comp: SEMANTIC_ICONS[notif.icon], filled: false };
  }
  const Filled = VARIANT_GLYPH[notif.variant] || TI.InfoCircleFilled;
  return { Comp: Filled, filled: true };
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

// Native Toast.makeText bridge is intentionally disabled — we render
// the in-app pill on Android too so the visual + actions stay
// consistent with PWA / browser. Kept as a no-op stub (rather than
// removing the call sites) so the bridge can be re-enabled by
// returning the real probe if we ever want to toggle back.
function hasAndroidBridge() {
  return false;
}

// Build the plain-text payload for the native toast. The OS widget
// can't show inline bold anyway, and notification messages can now
// be either strings (legacy / system text) or React elements (any
// message that embeds a highlighted user-provided value — note title,
// user name, etc.), so we walk both into a flat string. Strings still
// get the legacy `**bold**` strip for callers that pre-date the JSX
// path. Title + message glued with a colon so a share notification
// reads as "Note partagée: Victor a partagé la note …".
function nodeToText(node) {
  if (node == null || node === false) return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeToText).join("");
  const children = node?.props?.children;
  if (children !== undefined) return nodeToText(children);
  return "";
}
function buildToastText(notif) {
  const flatten = (v) =>
    typeof v === "string"
      ? v.replace(/\*\*([^*]+)\*\*/g, "$1")
      : nodeToText(v);
  const title = flatten(notif.title);
  const message = flatten(notif.message);
  if (title && message) return `${title}: ${message}`;
  return title || message || "";
}

function shouldUseLong(notif) {
  if (notif.persistent) return true;
  if (typeof notif.duration === "number" && notif.duration > 3000) return true;
  return false;
}

export default function NotificationMobileToast({ onAction }) {
  const { notifications, remove, dismiss } = useNotifications();
  const current = notifications.find((n) => !n.dismissed) || null;
  const [visible, setVisible] = useState(false);
  const lastIdRef = useRef(null);
  // Ref mirror of the latest notifications array — the queue-cycle
  // effect reads queueSize ONCE per `current` change without having
  // to list `notifications` in its dependency array (which would
  // restart the share timer every time a sibling notif gets dismissed
  // by us, breaking the cycle).
  const notificationsRef = useRef(notifications);
  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  useEffect(() => {
    if (current && current.id !== lastIdRef.current) {
      lastIdRef.current = current.id;
      if (hasAndroidBridge()) {
        // Native Toast — fire-and-forget. The OS controls timing
        // and dismissal, so we don't render any DOM ourselves.
        try {
          window.AndroidToast.show(buildToastText(current), shouldUseLong(current));
        } catch (_e) {}
        setVisible(false);
      } else {
        // PWA / browser fallback: render the CSS pill.
        setVisible(true);
      }
    } else if (!current) {
      setVisible(false);
      lastIdRef.current = null;
    }
  }, [current]);

  // PWA queue cycler. The mobile pill shows one notification at a
  // time, but the provider's per-notification auto-dismiss timers
  // fire in parallel — so when four toasts arrive at the same moment
  // the user only ever sees the first, and all four dismiss together
  // when the duration elapses. To make every pending notification
  // visible inside roughly the user-configured window, we slice the
  // duration across the queue (with a floor of 800 ms per slice so
  // the user can actually read each one) and proactively dismiss the
  // current at its slice end. The provider's own timer still fires
  // at full duration, but the row is already dismissed by then so
  // its DISMISS becomes a no-op.
  useEffect(() => {
    if (!current || hasAndroidBridge()) return undefined;
    const userDuration = current.duration;
    if (typeof userDuration !== "number" || userDuration <= 0) return undefined;
    const queueSize = notificationsRef.current.reduce(
      (acc, n) => (n.dismissed ? acc : acc + 1),
      0,
    );
    if (queueSize <= 1) return undefined; // Single notif — let the provider's own timer handle it.
    const share = Math.max(800, Math.floor(userDuration / queueSize));
    const h = setTimeout(() => {
      // Soft dismiss — same path the provider's auto-dismiss takes,
      // so the row lands in the history panel like a normal toast.
      dismiss(current.id);
    }, share);
    return () => clearTimeout(h);
  }, [current?.id, dismiss]);

  // Countdown bar — declared at the top of the component so the hook
  // call site is stable across renders (the early returns below would
  // otherwise skip useRef / useLayoutEffect and trip React error #310).
  // Effective duration mirrors the queue-cycler's slice when several
  // notifs are pending so the bar finishes exactly when the pill
  // dismisses; falls back to the raw user duration otherwise.
  const queueSize = notificationsRef.current.reduce(
    (acc, n) => (n.dismissed ? acc : acc + 1),
    0,
  );
  let effectiveDuration = null;
  if (current && typeof current.duration === "number" && current.duration > 0) {
    effectiveDuration =
      queueSize > 1
        ? Math.max(800, Math.floor(current.duration / queueSize))
        : current.duration;
  }
  const showCountdown = !!(effectiveDuration && effectiveDuration > 0);
  const countdownFillRef = useRef(null);
  // Same mount-time anchor trick as the desktop card: feed the elapsed
  // time back as a NEGATIVE animation-delay so the scaleX(0) frame
  // lands at the exact moment dismiss() fires, even if React commit
  // happened a few ms / frames after notify().
  useLayoutEffect(() => {
    if (!showCountdown || !current) return;
    const el = countdownFillRef.current;
    if (!el || !current.createdAt) return;
    const elapsed = Math.max(
      0,
      Math.min(effectiveDuration, Date.now() - current.createdAt),
    );
    el.style.animationDelay = `-${elapsed}ms`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  if (typeof document === "undefined") return null;
  // Inside the Android wrapper we never render — the OS toast IS the
  // notification. Centre + bell still work because they read from
  // the same provider.
  if (hasAndroidBridge()) return null;
  if (!current || !visible) return null;

  const { Comp, filled } = pickGlyph(current);
  const stacked = current.actionLayout === "below" && !!current.action;
  const handleTap = () => {
    setVisible(false);
    remove(current.id);
  };
  const handleAction = (e) => {
    e.stopPropagation();
    if (onAction) onAction(current);
    setVisible(false);
    remove(current.id);
  };

  const node = (
    <div
      className={`gk-mobile-toast gk-mobile-toast--${current.variant || "info"}${stacked ? " gk-mobile-toast--stacked" : ""}`}
      role="status"
      onClick={handleTap}
    >
      <span className="gk-mobile-toast__icon" aria-hidden="true">
        <Comp
          className={`tabler-icon${filled ? " tabler-icon--filled" : ""}`}
          style={{ width: 18, height: 18 }}
        />
      </span>
      <span className="gk-mobile-toast__body">
        {current.title ? (
          <span className="gk-mobile-toast__title">{current.title}</span>
        ) : null}
        {current.message ? (
          <span className="gk-mobile-toast__message">
            {renderMessage(current.message)}
          </span>
        ) : null}
      </span>
      {current.action ? (
        <button
          type="button"
          className="gk-mobile-toast__action"
          onClick={handleAction}
        >
          {current.action.label}
        </button>
      ) : null}
      {showCountdown ? (
        <div className="gk-mobile-toast__countdown-clip" aria-hidden="true">
          <div className="gk-mobile-toast__countdown">
            <div
              ref={countdownFillRef}
              className="gk-mobile-toast__countdown-fill"
              style={{ animationDuration: `${effectiveDuration}ms` }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );

  return createPortal(node, document.body);
}
