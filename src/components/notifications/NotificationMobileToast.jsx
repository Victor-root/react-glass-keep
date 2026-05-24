// Android-style toast for touch devices.
//
// Replaces the floating glass cards on mobile (PWA + Android WebView)
// because the user wanted the small dark pill that slides up from
// the bottom — the platform's native toast aesthetic — rather than
// the desktop-style stacked cards.
//
// Behaviour:
//   - One toast at a time. A new arrival hides the previous and
//     slides up in its place (mirrors Android's queue-of-one).
//   - Auto-dismisses on the notification's `duration` (10 s default
//     unless the caller passed something else / `persistent: true`).
//   - Tap-anywhere dismisses early.
//   - When an action is present (e.g. "Ouvrir" on a shared-note),
//     it renders as an inline accent label on the right; tapping it
//     triggers the App-level onAction handler and dismisses.
//   - Doesn't show a close button (Android toasts don't have one);
//     the X stays exclusive to the notification centre.
//
// The notification centre + bell still work as on desktop — only the
// floating viewport changes.
//
// Uses the same NotificationProvider so the history list stays
// consistent with the desktop tree.

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNotifications } from "./NotificationProvider.jsx";
import TI from "../../icons/editor/index.jsx";
import { t } from "../../i18n";

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

export default function NotificationMobileToast({ onAction }) {
  const { notifications, remove } = useNotifications();
  // Newest non-dismissed entry. Auto-dismissed (timer) and X-removed
  // (REMOVE) entries both stop appearing here.
  const current = notifications.find((n) => !n.dismissed) || null;
  const [visible, setVisible] = useState(false);
  const lastIdRef = useRef(null);

  // Slide-in on each new notification; let the provider's own
  // timer drive auto-dismiss so the duration stays user-controlled.
  useEffect(() => {
    if (current && current.id !== lastIdRef.current) {
      lastIdRef.current = current.id;
      setVisible(true);
    } else if (!current) {
      setVisible(false);
      lastIdRef.current = null;
    }
  }, [current]);

  if (typeof document === "undefined") return null;
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
