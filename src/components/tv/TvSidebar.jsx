import React, { useMemo } from "react";
import { t } from "../../i18n";
import { getContentImages } from "../../utils/noteIcon.js";

// Lightweight filter rail for the TV viewer. Mirrors the desktop
// TagSidebar's concept (All / Pinned / Tags / Images / Archived / Trash)
// but keeps everything large, focus-friendly and one tap deep — no
// nested popovers or kebab menus on a 10-foot UI.

export default function TvSidebar({
  notes,
  filter,           // { type: "all" | "pinned" | "tag" | "images" | "archived" | "trashed", value?: string }
  onSelectFilter,
  onExit,           // optional: back to phone layout
}) {
  const grouped = useMemo(() => {
    const tagCounts = new Map();
    let pinned = 0;
    let withImages = 0;
    for (const n of notes) {
      if (n?.archived || n?.trashed) continue;
      if (n.pinned) pinned += 1;
      const imgs = getContentImages(n.images);
      if (imgs.length > 0) withImages += 1;
      const tags = Array.isArray(n.tags) ? n.tags : [];
      for (const tag of tags) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      }
    }
    const tags = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    return { pinned, withImages, tags };
  }, [notes]);

  const totalActive = notes.filter((n) => !n?.archived && !n?.trashed).length;

  const isActive = (type, value) => {
    if (!filter) return type === "all";
    if (filter.type !== type) return false;
    if (type === "tag") return filter.value === value;
    return true;
  };

  return (
    <aside className="tv-sidebar" aria-label={t("filters") || "Filters"}>
      <div className="tv-sidebar__group-label">{t("allNotes") || "All notes"}</div>
      <button
        type="button"
        className="tv-sidebar__item tv-focusable tv-focusable--flat"
        data-active={isActive("all") ? "true" : "false"}
        onClick={() => onSelectFilter({ type: "all" })}
      >
        <span style={{ fontSize: 20 }}>🗒️</span>
        <span>{t("allNotes") || "All notes"}</span>
        <span className="tv-sidebar__item-count">{totalActive}</span>
      </button>
      <button
        type="button"
        className="tv-sidebar__item tv-focusable tv-focusable--flat"
        data-active={isActive("pinned") ? "true" : "false"}
        onClick={() => onSelectFilter({ type: "pinned" })}
      >
        <span style={{ fontSize: 20 }}>📌</span>
        <span>{t("pinned")}</span>
        <span className="tv-sidebar__item-count">{grouped.pinned}</span>
      </button>
      {grouped.withImages > 0 && (
        <button
          type="button"
          className="tv-sidebar__item tv-focusable tv-focusable--flat"
          data-active={isActive("images") ? "true" : "false"}
          onClick={() => onSelectFilter({ type: "images" })}
        >
          <span style={{ fontSize: 20 }}>🖼️</span>
          <span>{t("image") || "Images"}</span>
          <span className="tv-sidebar__item-count">{grouped.withImages}</span>
        </button>
      )}

      {grouped.tags.length > 0 && (
        <>
          <div className="tv-sidebar__group-label">{t("tagsLabel") || "Tags"}</div>
          {grouped.tags.map(([tag, count]) => (
            <button
              key={tag}
              type="button"
              className="tv-sidebar__item tv-focusable tv-focusable--flat"
              data-active={isActive("tag", tag) ? "true" : "false"}
              onClick={() => onSelectFilter({ type: "tag", value: tag })}
            >
              <span style={{ fontSize: 18, opacity: 0.7 }}>#</span>
              <span style={{
                flex: 1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}>{tag}</span>
              <span className="tv-sidebar__item-count">{count}</span>
            </button>
          ))}
        </>
      )}

      {typeof onExit === "function" && (
        <>
          <div className="tv-sidebar__group-label">{t("settings") || "Settings"}</div>
          <button
            type="button"
            className="tv-sidebar__item tv-focusable tv-focusable--flat"
            onClick={onExit}
            style={{ marginTop: 4 }}
          >
            <span style={{ fontSize: 18 }}>↩</span>
            <span>{t("backToNotes") || "Phone layout"}</span>
          </button>
        </>
      )}
    </aside>
  );
}

