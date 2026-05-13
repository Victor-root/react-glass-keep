import React, { useEffect, useMemo, useState, useCallback } from "react";
import { t } from "../../i18n";
import TvNoteCard from "./TvNoteCard.jsx";
import TvNoteDetail from "./TvNoteDetail.jsx";
import TvSidebar from "./TvSidebar.jsx";
import useSpatialFocus from "./useSpatialFocus.js";
import { getContentImages } from "../../utils/noteIcon.js";

// The TV-mode "home" screen. Owns:
//  - the current filter (all / pinned / images / tag)
//  - the currently-open note (detail overlay)
//  - the spatial focus loop (via useSpatialFocus)
//  - a clock + connection pill in the header for the 10-foot ambience
//
// It receives notes already loaded and a reload callback so it never
// needs to know about the sync engine, IndexedDB layer or auth — those
// stay in App.jsx. Add nothing UI-shaped here that isn't TV-specific.

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30 * 1000);
    return () => clearInterval(id);
  }, []);
  return now;
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
    if (filter.type === "pinned") return !!n.pinned;
    if (filter.type === "images") {
      return getContentImages(n.images).length > 0;
    }
    if (filter.type === "tag") {
      return Array.isArray(n.tags) && n.tags.includes(filter.value);
    }
    return true;
  });
  const pinned = list.filter((n) => n.pinned);
  const others = list.filter((n) => !n.pinned);
  return { pinned, others, total: list.length };
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
  const [search] = useState(""); // search input wired up later if desired
  const clock = useClock();

  const { pinned, others, total } = useMemo(
    () => partitionNotes(notes, filter, search),
    [notes, filter, search]
  );

  const closeDetail = useCallback(() => setOpenNote(null), []);
  const openDetail = useCallback((note) => setOpenNote(note), []);

  useSpatialFocus({
    enabled: true,
    onBack: () => {
      if (openNote) closeDetail();
    },
  });

  // Reset the open note if it disappears from the filter (e.g. archived
  // from another device while the detail was visible).
  useEffect(() => {
    if (!openNote) return;
    const stillThere = notes.find((n) => n.id === openNote.id);
    if (!stillThere || stillThere.archived || stillThere.trashed) {
      closeDetail();
    } else if (stillThere !== openNote) {
      setOpenNote(stillThere);
    }
  }, [notes, openNote, closeDetail]);

  const timeStr = clock.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  const dateStr = clock.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });

  const filterLabel = (() => {
    if (!filter || filter.type === "all") return t("allNotes") || "All notes";
    if (filter.type === "pinned") return t("pinned");
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
        <div>
          <div className="tv-header__title">GlassKeep</div>
          <div className="tv-header__subtitle">
            {currentUser?.name || currentUser?.email || ""} · {dateStr} · {timeStr}
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          <span className="tv-status">
            <span className={`tv-status__dot ${statusVariant}`} />
            {statusLabel}
          </span>
          <span className="tv-header__count">
            {filterLabel} · {total}
          </span>
        </div>
      </header>

      <div className="tv-layout">
        <TvSidebar
          notes={notes}
          filter={filter}
          onSelectFilter={(next) => {
            setFilter(next);
            closeDetail();
          }}
          onExit={onExitTvMode}
        />

        <main className="tv-notes-scroll" aria-label={filterLabel}>
          {total === 0 ? (
            <div className="tv-empty">
              <div className="tv-empty__title">{t("noNotesYet") || "No notes yet"}</div>
              <div className="tv-empty__hint">
                {t("tvEmptyHint") ||
                  "Once you create notes from your phone or the web app they'll show up here, ready to read on the big screen."}
              </div>
            </div>
          ) : (
            <>
              {pinned.length > 0 && (
                <>
                  <div className="tv-section-title">📌 {t("pinned")}</div>
                  <div className="tv-notes-grid">
                    {pinned.map((n) => (
                      <TvNoteCard key={n.id} note={n} onActivate={openDetail} />
                    ))}
                  </div>
                </>
              )}
              {others.length > 0 && (
                <>
                  {pinned.length > 0 && (
                    <div className="tv-section-title">{t("others")}</div>
                  )}
                  <div className="tv-notes-grid">
                    {others.map((n) => (
                      <TvNoteCard key={n.id} note={n} onActivate={openDetail} />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </main>
      </div>

      {openNote && (
        <TvNoteDetail note={openNote} onClose={closeDetail} />
      )}

      {/* Tiny footer hint — Android TV users expect to see what the
          remote does. Hidden once the user has opened at least one note
          (they get the idea). */}
      {!openNote && (
        <div
          style={{
            position: "fixed",
            bottom: 18,
            right: 24,
            display: "flex",
            gap: 16,
            opacity: 0.55,
            fontSize: 14,
            color: "#9ca3af",
            pointerEvents: "none",
            zIndex: 60,
          }}
        >
          <span>← → ↑ ↓ navigate</span>
          <span>OK open</span>
          <span>Back exit</span>
          {/* Hint sign-out lives in the sidebar for now; surfaced here only if no other UI does. */}
          {onSignOut && null}
        </div>
      )}
    </div>
  );
}
