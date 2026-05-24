// Mobile notification dispatcher.
//
// Inside the Android wrapper (window.AndroidToast bridge present)
// every new notification fires a real native Toast.makeText —
// platform-correct, exactly like the OS handles app toasts. The
// CSS pill below is the PWA-only fallback for browser sessions
// where there's no bridge to delegate to.
//
// The native toast carries the notification's text content; the
// action button (e.g. "Ouvrir" on a shared note) stays accessible
// through the in-app notification centre, since Android's native
// toast widget is intentionally passive (no inline buttons).
//
// Either way, the notification still lands in the provider's
// history list so the bell + panel work the same on every form
// factor.

import React, { useEffect, useRef, useState } from "react";
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

function hasAndroidBridge() {
  if (typeof window === "undefined") return false;
  const b = window.AndroidToast;
  return !!(b && typeof b.show === "function");
}

// Build the plain-text payload for the native toast. Strips the
// `**bold**` markers the in-app card uses; the OS widget can't show
// bold inline anyway. Title + message glued with a colon so a share
// notification reads as "Note partagée: Victor a partagé la note …".
function buildToastText(notif) {
  const stripBold = (s) => (s || "").replace(/\*\*([^*]+)\*\*/g, "$1");
  const title = stripBold(notif.title);
  const message = stripBold(notif.message);
  if (title && message) return `${title}: ${message}`;
  return title || message || "";
}

function shouldUseLong(notif) {
  if (notif.persistent) return true;
  if (typeof notif.duration === "number" && notif.duration > 3000) return true;
  return false;
}

export default function NotificationMobileToast({ onAction }) {
  const { notifications, remove } = useNotifications();
  const current = notifications.find((n) => !n.dismissed) || null;
  const [visible, setVisible] = useState(false);
  const lastIdRef = useRef(null);

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

  if (typeof document === "undefined") return null;
  // Inside the Android wrapper we never render — the OS toast IS the
  // notification. Centre + bell still work because they read from
  // the same provider.
  if (hasAndroidBridge()) return null;
  if (!current || !visible) return null;

  const { Comp, filled } = pickGlyph(current);
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
    <div className="gk-mobile-toast" role="status" onClick={handleTap}>
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
    </div>
  );

  return createPortal(node, document.body);
}
