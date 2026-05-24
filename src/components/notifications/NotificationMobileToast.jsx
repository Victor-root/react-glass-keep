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

// ── Debug logger ────────────────────────────────────────────────────
// Logs all mobile-toast lifecycle events to the console with a
// monotonic timestamp so we can reconstruct the exact sequence from
// a copy-paste. Filter the devtools console by "[gkn]" to keep only
// these lines.
const __gkn_t0 = Date.now();
function dlog(...args) {
  try {
    const dt = Date.now() - __gkn_t0;
    // eslint-disable-next-line no-console
    console.log(`[gkn +${dt}ms]`, ...args);
  } catch (_e) {}
}
function idsShort(arr) {
  return arr
    .map(
      (n) =>
        `${(n.id || "?").slice(-4)}${n.dismissed ? "✗" : "✓"}`,
    )
    .join(",");
}

export default function NotificationMobileToast({ onAction, suppressed = false }) {
  const { notifications, remove, dismissLocal } = useNotifications();
  const [visible, setVisible] = useState(false);
  const lastIdRef = useRef(null);
  const notificationsRef = useRef(notifications);
  // Log every notifications array mutation so we can see arrivals
  // and external dismissals as the provider sees them.
  const prevNotifIdsRef = useRef("");
  useEffect(() => {
    notificationsRef.current = notifications;
    const snapshot = idsShort(notifications);
    if (snapshot !== prevNotifIdsRef.current) {
      dlog("notifications=", snapshot, `(len=${notifications.length})`);
      prevNotifIdsRef.current = snapshot;
    }
  }, [notifications]);

  // ── Sticky displayed-id ────────────────────────────────────────────
  // The pill shows ONE notification at a time. A newly arriving
  // notification must NOT pre-empt the one currently on screen —
  // otherwise rapid bursts of 4+ notifs cause the earlier ones to
  // flash for a single frame each as `find(!dismissed)` rotates to
  // the newest every render. We keep showing the same id until
  // either the cycler dismisses it OR the provider's own auto-dismiss
  // timer fires.
  const displayedIdRef = useRef(null);
  // Wall-clock moment the current notif first became visible. Used
  // by the bar's animation-delay anchor so the countdown measures
  // from "now I'm on screen", not from createdAt (which can be far
  // in the past for notifs that sat queued behind earlier ones).
  const displayStartRef = useRef(0);

  let current = null;
  let pickReason = "none";
  if (displayedIdRef.current != null) {
    const sticky = notifications.find(
      (n) => n.id === displayedIdRef.current && !n.dismissed,
    );
    if (sticky) {
      current = sticky;
      pickReason = "sticky";
    }
  }
  if (!current) {
    current = notifications.find((n) => !n.dismissed) || null;
    if (current && current.id !== displayedIdRef.current) {
      const prev = displayedIdRef.current;
      displayedIdRef.current = current.id;
      displayStartRef.current = Date.now();
      dlog(
        "display-start",
        `id=…${current.id.slice(-4)}`,
        `prev=${prev ? "…" + prev.slice(-4) : "null"}`,
        `t=${displayStartRef.current - __gkn_t0}ms`,
      );
      pickReason = "fresh";
    } else if (!current) {
      if (displayedIdRef.current != null) {
        dlog("display-end (no active notif)");
      }
      displayedIdRef.current = null;
      displayStartRef.current = 0;
    }
  }

  // ── Burst-slice snapshot ───────────────────────────────────────────
  // burstSlice is the FROZEN per-notif display duration for the
  // current burst. Captured at burst start (= when active count
  // transitions 0 → ≥1) after a short 100 ms settling window so
  // SSE arrivals that fire in separate task ticks group into the
  // same snapshot. Stays the same for every notif in the burst —
  // no live `remaining / queueCount` recalc. Reset to null when
  // the burst exhausts (no more active notifs).
  const [burstSlice, setBurstSlice] = useState(null);
  // End burst when nothing's active anymore.
  useEffect(() => {
    const anyActive = notifications.some((n) => !n.dismissed);
    if (!anyActive && burstSlice != null) {
      dlog("burst-end (no active notif), was slice=", burstSlice);
      setBurstSlice(null);
    }
  }, [notifications, burstSlice]);
  // Start burst (with settling) when one isn't running and there's
  // an eligible notif on screen. The settling timer restarts every
  // time the effect re-runs (new arrival), so its callback fires
  // 100 ms after the LAST arrival — that's when we snapshot the
  // queue size.
  useEffect(() => {
    if (burstSlice != null) return undefined;
    if (hasAndroidBridge()) return undefined;
    if (!current) return undefined;
    const dur = current.duration;
    if (typeof dur !== "number" || dur <= 0) {
      dlog("burst-settle skipped (persistent / no duration)", `id=…${current.id.slice(-4)}`);
      return undefined;
    }
    dlog("burst-settle scheduled (100ms)", `seed=…${current.id.slice(-4)}`, `dur=${dur}`);
    const h = setTimeout(() => {
      const fresh = notificationsRef.current;
      const queueSize = fresh.reduce(
        (acc, n) => (n.dismissed ? acc : acc + 1),
        0,
      );
      if (queueSize <= 0) {
        dlog("burst-settle fired but queueSize=0, abort");
        return;
      }
      const slice =
        queueSize > 1
          ? Math.max(800, Math.floor(dur / queueSize))
          : dur;
      dlog(
        "burst-settle fired",
        `queueSize=${queueSize}`,
        `dur=${dur}`,
        `slice=${slice}ms`,
      );
      setBurstSlice(slice);
    }, 100);
    return () => {
      clearTimeout(h);
    };
    // notifications is in the dep array on purpose: the settle
    // timer must restart on every new arrival so it fires 100ms
    // after the LAST arrival of the burst, not 100ms after the
    // first. Once burstSlice is set, the early return at the top
    // makes subsequent re-runs cheap no-ops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [burstSlice, current?.id, notifications]);

  useEffect(() => {
    if (current && current.id !== lastIdRef.current) {
      lastIdRef.current = current.id;
      if (hasAndroidBridge()) {
        try {
          window.AndroidToast.show(buildToastText(current), shouldUseLong(current));
        } catch (_e) {}
        setVisible(false);
      } else {
        dlog("setVisible(true)", `id=…${current.id.slice(-4)}`, `pick=${pickReason}`);
        setVisible(true);
      }
    } else if (!current) {
      dlog("setVisible(false) (no current)");
      setVisible(false);
      lastIdRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  // Cycler — dismisses the displayed notification after burstSlice ms.
  // Anchored on displayStartRef so remaining time is measured from the
  // moment the notif became visible, not from when the effect runs
  // (which can be a frame or two later because of React batching).
  useEffect(() => {
    if (!current || hasAndroidBridge()) return undefined;
    if (!burstSlice || burstSlice <= 0) return undefined;
    const elapsed = Date.now() - displayStartRef.current;
    const remaining = Math.max(0, burstSlice - elapsed);
    dlog(
      "cycler-set",
      `id=…${current.id.slice(-4)}`,
      `burstSlice=${burstSlice}`,
      `elapsedSinceDisplay=${elapsed}`,
      `remaining=${remaining}`,
    );
    const h = setTimeout(() => {
      dlog("cycler-fire → dismissLocal", `id=…${current.id.slice(-4)}`);
      dismissLocal(current.id);
    }, remaining);
    return () => {
      dlog("cycler-cleanup", `id=…${current.id.slice(-4)}`);
      clearTimeout(h);
    };
  }, [current?.id, burstSlice, dismissLocal]);

  const showCountdown = !!(burstSlice && burstSlice > 0 && current);
  const countdownFillRef = useRef(null);
  // Detects the burstSlice null → value transition (settle just
  // fired) so we can reset displayStartRef. Without this, the
  // first notif of a burst is "visible without bar" during the
  // settling window (100–300ms), and when the bar finally appears
  // it's anchored on displayStart from BEFORE the settle, so it
  // starts at e.g. 19% depleted and the cycler shortens its slice
  // accordingly. Resetting at the settle moment realigns both.
  const prevBurstSliceRef = useRef(null);
  useLayoutEffect(() => {
    // Snapshot the previous value and update the ref UNCONDITIONALLY
    // before any early-return, otherwise renders where showCountdown
    // is false (between bursts) skip the update and the ref stays
    // pinned at the previous burst's slice — making the next
    // null→value transition look like value→value and skipping the
    // reset.
    const prevSlice = prevBurstSliceRef.current;
    prevBurstSliceRef.current = burstSlice;

    if (!showCountdown || !current) return;
    const el = countdownFillRef.current;
    if (!el) {
      dlog("bar-anchor skipped (no fill el)", `id=…${current.id.slice(-4)}`);
      return;
    }
    // burstSlice just became non-null → the bar is rendering for
    // the first time on this notif. Anchor "display start" at now
    // so the bar runs the full slice and the cycler does too.
    if (prevSlice == null && burstSlice != null) {
      displayStartRef.current = Date.now();
      dlog(
        "display-start reset (burst settle)",
        `id=…${current.id.slice(-4)}`,
        `t=${displayStartRef.current - __gkn_t0}ms`,
      );
    }
    const elapsed = Math.max(
      0,
      Math.min(burstSlice, Date.now() - displayStartRef.current),
    );
    el.style.animationDelay = `-${elapsed}ms`;
    dlog(
      "bar-anchor",
      `id=…${current.id.slice(-4)}`,
      `animDuration=${burstSlice}ms`,
      `animDelay=-${elapsed}ms`,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, burstSlice]);

  if (typeof document === "undefined") return null;
  if (hasAndroidBridge()) return null;
  if (!current || !visible) {
    dlog("render → null", `current=${current ? "…" + current.id.slice(-4) : "null"}`, `visible=${visible}`);
    return null;
  }
  if (suppressed) {
    dlog("render → null (suppressed by panel)");
    return null;
  }
  dlog(
    "render → pill",
    `id=…${current.id.slice(-4)}`,
    `variant=${current.variant || "info"}`,
    `showCountdown=${showCountdown}`,
    `burstSlice=${burstSlice}`,
  );

  const { Comp, filled } = pickGlyph(current);
  const stacked = current.actionLayout === "below" && !!current.action;
  const handleTap = () => {
    dlog("tap → remove", `id=…${current.id.slice(-4)}`);
    setVisible(false);
    remove(current.id);
  };
  const handleAction = (e) => {
    e.stopPropagation();
    dlog("action → remove", `id=…${current.id.slice(-4)}`);
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
            {/* key={current.id} forces React to re-mount this DOM
                node every time the cycler advances. Without it, the
                bar element stays alive across cycles, its CSS
                animation has already run to scaleX(0), and changing
                style.animationDelay imperatively does NOT restart
                a completed animation. Remount = fresh animation
                from full to empty for every notif of the burst. */}
            <div
              key={current.id}
              ref={countdownFillRef}
              className="gk-mobile-toast__countdown-fill"
              style={{ animationDuration: `${burstSlice}ms` }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );

  return createPortal(node, document.body);
}
