import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { t } from "../../i18n";
import TvNoteCard from "./TvNoteCard.jsx";
import TvNoteDetail from "./TvNoteDetail.jsx";
import TvSidebar from "./TvSidebar.jsx";
import useSpatialFocus from "./useSpatialFocus.js";
import { getContentImages } from "../../utils/noteIcon.js";
import { Menu } from "lucide-react";

// TV-mode "home" screen. Owns:
//  - filter state (all / images / tag)
//  - sidebar visibility (toggled by the hamburger button)
//  - detail viewer state + Back key wiring via window.history
//  - spatial focus loop (useSpatialFocus)
//
// Notes come in already loaded so this stays a pure consumer.

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30 * 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function sortNotes(list) {
  // Pinned still rank first inside the flat grid — there's just no
  // dedicated "Pinned" section header any more. Stable within each
  // bucket via updated_at desc fallback.
  return [...list].sort((a, b) => {
    if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
    const at = a.updated_at || a.created_at || "";
    const bt = b.updated_at || b.created_at || "";
    return bt.localeCompare(at);
  });
}

function partitionNotes(notes, filter, search) {
  const q = String(search || "").trim().toLowerCase();
  const matchesSearch = (n) => {
    if (!q) return true;
    const haystack = [
      n.title || "",
      typeof n.content === "string" ? n.content : "",
      Array.isArray(n.tags) ? n.tags.join(" ") : "",
    ].join(" ").toLowerCase();
    return haystack.includes(q);
  };
  const list = notes.filter((n) => {
    if (!n) return false;
    if (n.archived || n.trashed) return false;
    if (!matchesSearch(n)) return false;
    if (!filter || filter.type === "all") return true;
    if (filter.type === "images") return getContentImages(n.images).length > 0;
    if (filter.type === "tag") return Array.isArray(n.tags) && n.tags.includes(filter.value);
    return true;
  });
  return sortNotes(list);
}

export default function TvNotesViewer({
  notes,
  currentUser,
  onSignOut,
  onExitTvMode,
  isOnline,
  sseConnected,
  syncState,
}) {
  const [filter, setFilter] = useState({ type: "all" });
  const [openNote, setOpenNote] = useState(null);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [search] = useState("");
  const clock = useClock();
  const detailHistoryRef = useRef(null);

  const visible = useMemo(
    () => partitionNotes(notes, filter, search),
    [notes, filter, search]
  );

  const closeDetail = useCallback(() => setOpenNote(null), []);
  const openDetail = useCallback((note) => setOpenNote(note), []);

  // Back key handling. The Android wrapper turns KEYCODE_BACK into a
  // window.history.back() call, so wiring popstate covers both the
  // physical Back button on the remote AND a stray Escape on a desktop
  // browser. We push a sentinel state when a detail opens and pop it
  // when the detail closes by any other means, keeping the history
  // stack tidy.
  useEffect(() => {
    if (!openNote) {
      detailHistoryRef.current = null;
      return undefined;
    }
    const marker = { tvDetail: openNote.id, ts: Date.now() };
    window.history.pushState(marker, "");
    detailHistoryRef.current = marker;

    const onPop = () => {
      // popstate fires AFTER the navigation has happened — at this
      // point we just need to drop the open note.
      detailHistoryRef.current = null;
      setOpenNote(null);
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      // If we're tearing down because the user closed via the in-page
      // button (not popstate), rewind the history we pushed so it
      // doesn't accumulate "phantom" entries.
      if (detailHistoryRef.current && window.history.state?.tvDetail === marker.tvDetail) {
        window.history.back();
      }
      detailHistoryRef.current = null;
    };
  }, [openNote?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync the open-note object when the source list changes (a remote
  // edit replaces the reference) and drop it if the note vanished.
  useEffect(() => {
    if (!openNote) return;
    const stillThere = notes.find((n) => n.id === openNote.id);
    if (!stillThere || stillThere.archived || stillThere.trashed) {
      closeDetail();
    } else if (stillThere !== openNote) {
      setOpenNote(stillThere);
    }
  }, [notes, openNote, closeDetail]);

  // D-pad / Back fallback for browsers where popstate doesn't fire
  // (e.g. iframe previews). useSpatialFocus handles Esc/Backspace.
  useSpatialFocus({
    enabled: true,
    onBack: () => {
      if (openNote) {
        closeDetail();
        return;
      }
      if (!sidebarVisible) {
        setSidebarVisible(true);
      }
    },
  });

  const toggleSidebar = useCallback(() => setSidebarVisible((v) => !v), []);

  const timeStr = clock.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  const dateStr = clock.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });

  const filterLabel = (() => {
    if (!filter || filter.type === "all") return t("allNotes") || "All notes";
    if (filter.type === "images") return t("image") || "Images";
    if (filter.type === "tag") return `#${filter.value}`;
    return "";
  })();

  let statusLabel = t("syncOnline") || "Online";
  let statusVariant = "";
  if (!isOnline) {
    statusLabel = t("syncOffline") || "Offline";
    statusVariant = "tv-status__dot--offline";
  } else if (syncState === "error") {
    statusLabel = t("syncError") || "Sync error";
    statusVariant = "tv-status__dot--error";
  } else if (!sseConnected) {
    statusVariant = "tv-status__dot--offline";
    statusLabel = t("syncReconnecting") || "Reconnecting…";
  }

  return (
    <div className="tv-screen">
      <header className="tv-header">
        <button
          type="button"
          className="tv-header__hamburger tv-focusable tv-focusable--flat"
          aria-label={t("toggleSidebar") || "Toggle sidebar"}
          onClick={toggleSidebar}
        >
          <Menu size={20} />
        </button>
        <div className="tv-header__title-wrap">
          <div className="tv-header__title">GlassKeep</div>
          <div className="tv-header__subtitle">
            {currentUser?.name || currentUser?.email || ""} · {dateStr} · {timeStr}
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          <span className="tv-status">
            <span className={`tv-status__dot ${statusVariant}`} />
            {statusLabel}
          </span>
          <span className="tv-header__count">
            {filterLabel} · {visible.length}
          </span>
        </div>
      </header>

      <div className={`tv-layout${sidebarVisible ? "" : " tv-layout--sidebar-hidden"}`}>
        <TvSidebar
          notes={notes}
          filter={filter}
          onSelectFilter={(next) => {
            setFilter(next);
            closeDetail();
          }}
          onExit={onExitTvMode}
          onSignOut={onSignOut}
        />

        <main className="tv-notes-scroll" aria-label={filterLabel}>
          {visible.length === 0 ? (
            <div className="tv-empty">
              <div className="tv-empty__title">{t("noNotesYet") || "No notes yet"}</div>
              <div className="tv-empty__hint">
                {t("tvEmptyHint") ||
                  "Once you create notes from your phone or the web app they'll show up here, ready to read on the big screen."}
              </div>
            </div>
          ) : (
            <div className="tv-notes-grid">
              {visible.map((n) => (
                <TvNoteCard key={n.id} note={n} onActivate={openDetail} />
              ))}
            </div>
          )}
        </main>
      </div>

      {openNote && <TvNoteDetail note={openNote} onClose={closeDetail} />}
    </div>
  );
}
