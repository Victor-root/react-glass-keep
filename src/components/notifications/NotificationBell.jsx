// Header button: bell-ringing icon + unread badge + click to open
// the notification center. Sized to match the sibling header icons
// (list view, theme toggle, …) — the filled tabler glyph is
// constrained to 20×20 inside the same 8-px padded rounded-full
// hit area so it sits at the exact same baseline as its neighbours.
//
// Opening the panel also marks any still-visible toasts as dismissed
// — the user explicitly wants the open / close action to clear the
// floating stack so the panel becomes the single source of truth for
// what's still actionable.
//
// "Unread" = active (not yet dismissed). Badge hides itself when the
// count drops to zero so the bell sits flush in the header during
// quiet periods.

import React, { useRef } from "react";
import { useNotifications } from "./NotificationProvider.jsx";
import NotificationCenter from "./NotificationCenter.jsx";
import TI from "../../icons/editor/index.jsx";
import { t } from "../../i18n";

export default function NotificationBell({
  dark,
  onAction,
  onClearAll,
  // Controlled state — callers lift open/setOpen so the notification
  // center can be included in the app-level overlay count (back button,
  // AndroidTheme.setRefreshEnabled, etc.).
  open,
  onSetOpen,
}) {
  const { notifications, dismissAll, markDelivered } = useNotifications();
  const buttonRef = useRef(null);

  const unread = notifications.reduce(
    (acc, n) => (n.dismissed ? acc : acc + 1),
    0,
  );

  // Filled bell uses the indigo accent — #6366f1 (indigo-500) in light
  // mode, #9c9ddb (a desaturated indigo) in dark — so the icon reads as
  // a coloured indicator rather than a neutral chrome glyph. Hover and
  // focus stay subtle so the button still sits inside the utility row.
  const baseClass =
    "relative inline-flex items-center justify-center w-9 h-9 rounded-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors";
  const themeClass = dark
    ? "hover:bg-white/10 focus:ring-indigo-400"
    : "hover:bg-indigo-100 focus:ring-indigo-400";
  const iconColor = dark ? "#9c9ddb" : "#6366f1";

  const handleToggle = () => {
    // Opening = move everything currently floating into the panel,
    // and acknowledge any still-pending server-side rows. Without
    // the server ack, a second device reconnecting later would
    // re-fetch the same notifications from /pending and replay
    // them, even though the user has already seen the cards here.
    // markDelivered comes from the provider context and dedupes
    // internally, so any ids already acked (e.g. by an earlier X
    // click) won't trigger a second POST.
    if (!open && unread > 0) {
      const serverIds = [];
      for (const n of notifications) {
        if (n.dismissed) continue;
        const sid = n.metadata?.serverNotificationId;
        if (sid != null) serverIds.push(sid);
      }
      if (serverIds.length > 0) markDelivered(serverIds);
      dismissAll();
    }
    onSetOpen?.(!open);
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className={`${baseClass} ${themeClass}`}
        data-tooltip={t("notifications")}
        aria-label={t("notifications")}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        {/* Outline bell at rest, filled bell while the panel is open
            — gives the header button a "the panel is up" affordance
            without changing the accent colour. */}
        {open ? (
          <TI.BellFilled
            className="tabler-icon tabler-icon--filled"
            style={{ color: iconColor }}
          />
        ) : (
          <TI.Bell
            className="tabler-icon"
            style={{ color: iconColor }}
          />
        )}
        {unread > 0 ? (
          <span className="gk-notif-bell-badge" aria-hidden="true">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>
      <NotificationCenter
        open={open}
        anchor={buttonRef.current}
        onClose={() => onSetOpen?.(false)}
        onAction={onAction}
        onClearAll={onClearAll}
      />
    </>
  );
}
