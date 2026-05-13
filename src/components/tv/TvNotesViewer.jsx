import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import Masonry from "react-masonry-css";
import { t } from "../../i18n";
import TvNoteCard from "./TvNoteCard.jsx";
import TvNoteDetail from "./TvNoteDetail.jsx";
import TvSidebar from "./TvSidebar.jsx";
import useSpatialFocus from "./useSpatialFocus.js";
import { getContentImages } from "../../utils/noteIcon.js";
import { Menu, LayoutGrid, Rows3, Sun, Moon, ChevronLeft, ChevronRight } from "lucide-react";

// TV-mode "home" screen.
//
// Two layouts:
//   - "grid": real Pinterest-style masonry (react-masonry-css). Cards
//     keep their natural height and stack without horizontal gaps,
//     exactly like the phone and desktop views.
//   - "carousel": single row, horizontal scroll-snap. Cards are roughly
//     twice the grid size; 2-3 fit on screen and you flick between them.
//
// Sidebar is closed by default. Both preferences persisted in
// localStorage so the user lands on the same view next time.

const STORAGE_VIEW = "tv-view-mode";
const STORAGE_SIDEBAR = "tv-sidebar";
const STORAGE_THEME = "tv-theme";

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30 * 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function useViewportWidth() {
  const [w, setW] = useState(() => window.innerWidth || 1280);
  useEffect(() => {
    const onResize = () => setW(window.innerWidth || 1280);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return w;
}

function sortNotes(list) {
  return [...list].sort((a, b) => {
    if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
    const at = a.updated_at || a.created_at || "";
    const bt = b.updated_at || b.created_at || "";
    return bt.localeCompare(at);
  });
}

function partitionNotes(notes, filter) {
  const list = notes.filter((n) => {
    if (!n) return false;
    if (n.archived || n.trashed) return false;
    if (!filter || filter.type === "all") return true;
    if (filter.type === "images") return getContentImages(n.images).length > 0;
    if (filter.type === "tag") return Array.isArray(n.tags) && n.tags.includes(filter.value);
    return true;
  });
  return sortNotes(list);
}

function loadPref(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v == null ? fallback : v;
  } catch { return fallback; }
}
function savePref(key, value) {
  try { localStorage.setItem(key, value); } catch { /* ignore */ }
}

// Column count from viewport width — independent of sidebar state so
// toggling the rail doesn't force the masonry to re-bucket every card
// (the root cause of the 3-4s freeze on older Shields). With ~7 cols
// at 1080p, each card still gets a comfortable ~220-260px regardless
// of whether the sidebar is open.
function pickColumnCount(width) {
  if (width < 700) return 2;
  if (width < 950) return 3;
  if (width < 1200) return 4;
  if (width < 1500) return 5;
  if (width < 1800) return 6;
  return 7;
}

// Two-cards-at-a-time pager. The user explicitly asked for fixed
// viewport (no half-cards peeking, no smooth scroll) — just two
// cards, two arrows, click an arrow and the page flips by 2.
function TvPager({ notes, onActivate }) {
  const PAGE_SIZE = 2;
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(notes.length / PAGE_SIZE));
  // Clamp the current page back to range when the source list shrinks
  // (e.g. a filter activated). React state isn't ideal for this — a
  // single useEffect keeps it cheap and avoids derived-state bugs.
  useEffect(() => {
    if (page >= totalPages) setPage(Math.max(0, totalPages - 1));
  }, [page, totalPages]);

  const start = page * PAGE_SIZE;
  const slice = notes.slice(start, start + PAGE_SIZE);
  const canPrev = page > 0;
  const canNext = page < totalPages - 1;

  return (
    <div className="tv-pager">
      <button
        type="button"
        className="tv-pager__arrow tv-focusable tv-focusable--flat"
        aria-label="Previous page"
        disabled={!canPrev}
        onClick={() => canPrev && setPage((p) => Math.max(0, p - 1))}
      >
        <ChevronLeft size={32} />
      </button>
      <div className="tv-pager__page">
        {slice.map((n) => (
          <TvNoteCard key={n.id} note={n} variant="carousel" onActivate={onActivate} />
        ))}
        {/* Fill empty slot(s) on the last page so the grid keeps two columns. */}
        {slice.length < PAGE_SIZE && Array.from({ length: PAGE_SIZE - slice.length }).map((_, i) => (
          <div key={`pad-${i}`} aria-hidden="true" />
        ))}
      </div>
      <button
        type="button"
        className="tv-pager__arrow tv-focusable tv-focusable--flat"
        aria-label="Next page"
        disabled={!canNext}
        onClick={() => canNext && setPage((p) => Math.min(totalPages - 1, p + 1))}
      >
        <ChevronRight size={32} />
      </button>
      <div className="tv-pager__indicator" aria-hidden="true">
        {page + 1} / {totalPages}
      </div>
    </div>
  );
}

function HeaderUserChip({ currentUser }) {
  const initial = (currentUser?.name?.[0] || currentUser?.email?.[0] || "?").toUpperCase();
  const label = currentUser?.name || currentUser?.email || "";
  return (
    <span className="tv-header__user" aria-label={label}>
      <span className="tv-header__avatar">
        {currentUser?.avatar_url
          ? <img src={currentUser.avatar_url} alt="" />
          : <span>{initial}</span>}
      </span>
      <span style={{ maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {label}
      </span>
    </span>
  );
}

export default function TvNotesViewer({
  notes,
  currentUser,
  onSignOut,
  onExitTvMode,
}) {
  const [filter, setFilter] = useState({ type: "all" });
  const [openNote, setOpenNote] = useState(null);
  const [sidebarVisible, setSidebarVisible] = useState(() => loadPref(STORAGE_SIDEBAR, "closed") === "open");
  // Remember the *preference* (= the state set by the hamburger button)
  // separately from the *current* state. Left-edge reveal toggles the
  // current state but never updates the preference, so closing via
  // right-edge only kicks in when the user prefers the sidebar hidden.
  const sidebarPrefHiddenRef = useRef(loadPref(STORAGE_SIDEBAR, "closed") !== "open");
  const [viewMode, setViewMode] = useState(() => loadPref(STORAGE_VIEW, "grid") === "carousel" ? "carousel" : "grid");
  const [theme, setTheme] = useState(() => loadPref(STORAGE_THEME, "dark") === "light" ? "light" : "dark");
  const clock = useClock();
  const width = useViewportWidth();
  const detailHistoryRef = useRef(null);

  // NOTE: do NOT auto-persist sidebarVisible. The preference is only
  // updated when the user explicitly toggles the hamburger (or the
  // remote MENU key). Auto-revealing the rail by D-pad-left shouldn't
  // change the stored default.
  useEffect(() => { savePref(STORAGE_VIEW, viewMode); }, [viewMode]);

  // Reflect the theme on <html> so all CSS rules under
  // html[data-tv-theme="..."] flip atomically.
  useEffect(() => {
    savePref(STORAGE_THEME, theme);
    if (theme === "light") document.documentElement.setAttribute("data-tv-theme", "light");
    else document.documentElement.removeAttribute("data-tv-theme");
    return () => document.documentElement.removeAttribute("data-tv-theme");
  }, [theme]);

  const visible = useMemo(() => partitionNotes(notes, filter), [notes, filter]);
  const colCount = useMemo(() => pickColumnCount(width), [width]);

  // Remember the card the user activated so we can drop focus back on
  // it when the detail closes — otherwise the focus loop snaps to the
  // first focusable on screen (the hamburger) and the user has to
  // re-navigate down to where they were.
  const lastFocusedNoteIdRef = useRef(null);
  const closeDetail = useCallback(() => setOpenNote(null), []);
  const openDetail = useCallback((note) => {
    lastFocusedNoteIdRef.current = note.id;
    setOpenNote(note);
  }, []);

  // Detail viewer just closed — refocus the originating card. We wait
  // a frame so the masonry/carousel layer is mounted again before we
  // try to grab a ref to it.
  useEffect(() => {
    if (openNote) return undefined;
    const id = lastFocusedNoteIdRef.current;
    if (!id) return undefined;
    const raf = requestAnimationFrame(() => {
      const el = document.querySelector(`[data-note-id="${CSS.escape(id)}"]`);
      if (el instanceof HTMLElement) {
        window.dispatchEvent(new CustomEvent("tv-focus", { detail: { target: el } }));
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [openNote]);

  // Back key: push a history marker on detail-open, listen popstate.
  useEffect(() => {
    if (!openNote) {
      detailHistoryRef.current = null;
      return undefined;
    }
    const marker = { tvDetail: openNote.id, ts: Date.now() };
    window.history.pushState(marker, "");
    detailHistoryRef.current = marker;
    const onPop = () => {
      detailHistoryRef.current = null;
      setOpenNote(null);
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      if (detailHistoryRef.current && window.history.state?.tvDetail === marker.tvDetail) {
        window.history.back();
      }
      detailHistoryRef.current = null;
    };
  }, [openNote?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!openNote) return;
    const stillThere = notes.find((n) => n.id === openNote.id);
    if (!stillThere || stillThere.archived || stillThere.trashed) closeDetail();
    else if (stillThere !== openNote) setOpenNote(stillThere);
  }, [notes, openNote, closeDetail]);

  useSpatialFocus({
    enabled: true,
    onBack: () => {
      if (openNote) { closeDetail(); return; }
      if (sidebarVisible) setSidebarVisible(false);
    },
    onEdgeReached: (direction, anchor) => {
      if (direction === "left") {
        // Left from the leftmost card → pop the rail open.
        if (!sidebarVisible) revealSidebarFromEdge();
        return;
      }
      if (direction === "right") {
        const inSidebar = anchor?.closest?.(".tv-sidebar");
        if (inSidebar && sidebarVisible) hideSidebarFromEdge();
      }
    },
  });

  // Hamburger / MENU-key toggle updates BOTH the current state and
  // the stored preference (so the next launch lands on the user's
  // last explicit choice).
  const toggleSidebar = useCallback(() => {
    setSidebarVisible((v) => {
      const next = !v;
      savePref(STORAGE_SIDEBAR, next ? "open" : "closed");
      sidebarPrefHiddenRef.current = !next;
      return next;
    });
  }, []);

  // Left-edge: reveal the sidebar (without touching the preference)
  // and drop focus on its first focusable so the user can browse it.
  const revealSidebarFromEdge = useCallback(() => {
    setSidebarVisible(true);
    requestAnimationFrame(() => {
      const first = document.querySelector(".tv-sidebar .tv-focusable");
      if (first instanceof HTMLElement) {
        window.dispatchEvent(new CustomEvent("tv-focus", { detail: { target: first } }));
      }
    });
  }, []);

  // Right-edge: only auto-hide if the user prefers the rail hidden.
  // Otherwise leave it open — they've asked for the rail to stay.
  const hideSidebarFromEdge = useCallback(() => {
    if (!sidebarPrefHiddenRef.current) return;
    setSidebarVisible(false);
    requestAnimationFrame(() => {
      // Drop focus on the first card so the user lands somewhere useful.
      const firstCard = document.querySelector("[data-note-id]");
      if (firstCard instanceof HTMLElement) {
        window.dispatchEvent(new CustomEvent("tv-focus", { detail: { target: firstCard } }));
      }
    });
  }, []);
  const toggleView = useCallback(() => setViewMode((v) => v === "grid" ? "carousel" : "grid"), []);
  const toggleTheme = useCallback(() => setTheme((t) => t === "dark" ? "light" : "dark"), []);

  // The Android wrapper forwards KEYCODE_MENU (the "options" / "kebab"
  // key on most TV remotes — the same one Android TV uses to open the
  // settings rail in its home launcher) as a custom 'tv-menu-key'
  // window event. Wire it to the sidebar so the user gets the same
  // muscle memory as system apps.
  useEffect(() => {
    const onMenuKey = () => toggleSidebar();
    window.addEventListener("tv-menu-key", onMenuKey);
    return () => window.removeEventListener("tv-menu-key", onMenuKey);
  }, [toggleSidebar]);

  const timeStr = clock.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  const dateStr = clock.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });

  const filterLabel = (() => {
    if (!filter || filter.type === "all") return t("allNotes") || "All notes";
    if (filter.type === "images") return t("image") || "Images";
    if (filter.type === "tag") return `#${filter.value}`;
    return "";
  })();

  return (
    <div className="tv-screen">
      <header className="tv-header">
        <button
          type="button"
          className="tv-header__hamburger tv-focusable tv-focusable--flat"
          aria-label={t("toggleSidebar") || "Toggle sidebar"}
          onClick={toggleSidebar}
        >
          <Menu size={18} />
        </button>
        <button
          type="button"
          className="tv-header__viewtoggle tv-focusable tv-focusable--flat"
          aria-label={t("toggleView") || "Toggle view"}
          onClick={toggleView}
        >
          {viewMode === "grid" ? <Rows3 size={18} /> : <LayoutGrid size={18} />}
        </button>
        <button
          type="button"
          className="tv-header__themetoggle tv-focusable tv-focusable--flat"
          aria-label={t("toggleTheme") || "Toggle theme"}
          onClick={toggleTheme}
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <div className="tv-header__title-wrap">
          <div className="tv-header__title">GlassKeep</div>
          <div className="tv-header__subtitle">{dateStr} · {timeStr}</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <span className="tv-header__count">{filterLabel} · {visible.length}</span>
          <HeaderUserChip currentUser={currentUser} />
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
          ) : viewMode === "carousel" ? (
            <TvPager notes={visible} onActivate={openDetail} />
          ) : (
            <Masonry
              breakpointCols={colCount}
              className="tv-masonry"
              columnClassName="tv-masonry__col"
            >
              {visible.map((n) => (
                <TvNoteCard key={n.id} note={n} variant="grid" onActivate={openDetail} />
              ))}
            </Masonry>
          )}
        </main>
      </div>

      {openNote && <TvNoteDetail note={openNote} onClose={closeDetail} />}
    </div>
  );
}
