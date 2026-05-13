import React, { useMemo } from "react";
import { t } from "../../i18n";
import { bgFor, solid, parseRGBA } from "../../utils/colors.js";
import { renderSafeMarkdown } from "../../utils/markdown.jsx";
import { isRichContent, contentToHTML } from "../../utils/richText.js";
import { getNoteIcon, getContentImages } from "../../utils/noteIcon.js";
import { PinFilled, ImageIcon, MicrophoneFilledIcon } from "../../icons/index.jsx";
import { countItems, countChecked, isItem } from "../../utils/checklist.js";
import { parseAudioContent } from "../../utils/audioNote.js";

const PREVIEW_MAX_CHARS = 360;

// Decide whether a color background is light or dark, so we can pick the
// matching text colour (white on red/blue, dark on yellow/sand/...). The
// existing card uses Tailwind's dark mode, but in TV mode we ignore the
// system dark setting and always render against the deep-black 10-foot
// theme — so we need to recompute the contrast per-card.
function isColorDark(rgba) {
  const { r, g, b } = parseRGBA(rgba);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.55;
}

function buildPreviewHtml(n) {
  if (n.type === "text") {
    const raw = n.content || "";
    if (!raw) return "";
    if (isRichContent(raw)) return contentToHTML(raw);
    const sliced = raw.length > PREVIEW_MAX_CHARS
      ? raw.slice(0, PREVIEW_MAX_CHARS).trimEnd() + "…"
      : raw;
    return renderSafeMarkdown(sliced);
  }
  if (n.type === "draw") {
    try {
      const parsed = typeof n.content === "string" ? JSON.parse(n.content) : n.content;
      const txt = parsed?.text || "";
      if (!txt) return "";
      return isRichContent(txt) ? contentToHTML(txt) : renderSafeMarkdown(txt);
    } catch { return ""; }
  }
  return "";
}

export default function TvNoteCard({ note, onActivate }) {
  // TV layout is dark-only — we still let the user's chosen note color
  // bleed through (red/yellow/green stickers etc), but we sample it from
  // the TV-friendly palette and decide text contrast per-card.
  const bg = bgFor(note.color, true);
  const isDark = isColorDark(bg);

  const imgs = useMemo(() => getContentImages(note.images), [note.images]);
  const icon = useMemo(() => getNoteIcon(note.images), [note.images]);
  const previewHtml = useMemo(() => buildPreviewHtml(note), [note]);
  const isChecklist = note.type === "checklist";
  const isDraw = note.type === "draw";
  const isAudio = note.type === "audio";

  const audioClips = useMemo(() => {
    if (!isAudio) return [];
    try { return parseAudioContent(note.content).clips; } catch { return []; }
  }, [isAudio, note.content]);

  const checklistSummary = useMemo(() => {
    if (!isChecklist) return null;
    const total = countItems(note.items);
    const done = countChecked(note.items);
    const unchecked = (note.items || [])
      .filter(it => isItem(it) && !it.done)
      .slice(0, 6);
    return { total, done, unchecked };
  }, [isChecklist, note.items]);

  const handleActivate = (e) => {
    e?.preventDefault?.();
    onActivate?.(note);
  };

  return (
    <button
      type="button"
      className={`tv-card tv-focusable ${isDark ? "tv-card--dark" : ""}`}
      style={{ background: solid(bg) }}
      onClick={handleActivate}
      data-note-id={note.id}
      aria-label={note.title || (isChecklist ? t("checklist") : t("note"))}
    >
      {note.pinned && (
        <span className="tv-card__pin" aria-label={t("pinned")}>
          <PinFilled className="w-4 h-4" />
        </span>
      )}

      {icon && (
        <img
          src={icon.src}
          alt=""
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 14,
            right: note.pinned ? 56 : 14,
            width: 32,
            height: 32,
            objectFit: "contain",
            pointerEvents: "none",
          }}
        />
      )}

      {note.title && (
        <h3 className="tv-card__title">{note.title}</h3>
      )}

      {imgs.length > 0 && (
        <div className="tv-card__images">
          {imgs.slice(0, 2).map((im) => (
            <img key={im.id} src={im.src} alt={im.name || ""} />
          ))}
        </div>
      )}

      {isChecklist && checklistSummary ? (
        <div className="tv-card__preview" style={{ fontSize: 16 }}>
          {checklistSummary.unchecked.length === 0 && checklistSummary.total > 0 ? (
            <div style={{ opacity: 0.7, fontStyle: "italic" }}>
              {t("completedFraction")
                .replace("{done}", String(checklistSummary.done))
                .replace("{total}", String(checklistSummary.total))}
            </div>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {checklistSummary.unchecked.map((it) => (
                <li
                  key={it.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    margin: "4px 0",
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      flexShrink: 0,
                      width: 16,
                      height: 16,
                      marginTop: 4,
                      border: "2px solid currentColor",
                      borderRadius: 4,
                      opacity: 0.8,
                    }}
                  />
                  <span style={{ flex: 1, lineHeight: 1.35 }}>{it.text}</span>
                </li>
              ))}
              {checklistSummary.total > checklistSummary.unchecked.length && (
                <li style={{ opacity: 0.65, marginTop: 6, fontSize: 14 }}>
                  +{checklistSummary.total - checklistSummary.unchecked.length} {t("moreItems").replace("{count}", "")}
                </li>
              )}
            </ul>
          )}
        </div>
      ) : isAudio ? (
        <div className="tv-card__preview" style={{ fontSize: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 600 }}>
            <MicrophoneFilledIcon className="w-5 h-5" />
            <span>{audioClips.length || 0} {t("audioRecording")}</span>
          </div>
        </div>
      ) : isDraw ? (
        <div className="tv-card__preview">
          {previewHtml ? (
            <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
          ) : (
            <div style={{ opacity: 0.7, fontStyle: "italic" }}>{t("drawing")}</div>
          )}
        </div>
      ) : (
        previewHtml && (
          <div
            className="tv-card__preview"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        )
      )}

      <div className="tv-card__footer">
        {imgs.length > 0 && !isDraw && (
          <span className="tv-card__badge">
            <ImageIcon className="w-3.5 h-3.5" />
            {imgs.length}
          </span>
        )}
        {Array.isArray(note.tags) && note.tags.length > 0 && (
          <span className="tv-card__badge" style={{ maxWidth: "70%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            #{note.tags.slice(0, 2).join(" #")}
            {note.tags.length > 2 ? ` +${note.tags.length - 2}` : ""}
          </span>
        )}
      </div>
    </button>
  );
}

