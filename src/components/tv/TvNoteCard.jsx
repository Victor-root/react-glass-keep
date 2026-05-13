import React, { useMemo } from "react";
import { t } from "../../i18n";
import { bgFor, solid, parseRGBA } from "../../utils/colors.js";
import { renderSafeMarkdown } from "../../utils/markdown.jsx";
import { isRichContent, contentToHTML } from "../../utils/richText.js";
import { getNoteIcon, getContentImages } from "../../utils/noteIcon.js";
import { Image as ImageLucide, Mic, Pencil, CheckSquare } from "lucide-react";
import { countItems, countChecked, isItem } from "../../utils/checklist.js";
import { parseAudioContent } from "../../utils/audioNote.js";

const PREVIEW_MAX_CHARS = 360;

// Pick text color (light/dark) based on background luminance — the
// closed-TV palette gets a mix of pastel and saturated note colours
// and we always render against the dark 10-foot theme, so contrast
// has to be recomputed per card.
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
  // Dark-only TV theme always uses the dark palette as a base; we still
  // honour the user-picked note colour for visual identity (the red
  // sticker note stays red on TV) but the contrast helper picks
  // black/white text per-card.
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
      .slice(0, 5);
    return { total, done, unchecked };
  }, [isChecklist, note.items]);

  const handleActivate = (e) => {
    e?.preventDefault?.();
    onActivate?.(note);
  };

  // The pin/pin-popup is deliberately *not* rendered on TV — there's
  // no pointer to reach it and the user explicitly asked for it gone.
  // Pinning still happens on phone; we just hide the UI cue here.

  return (
    <button
      type="button"
      className={`tv-card tv-focusable ${isDark ? "tv-card--dark" : ""}`}
      style={{ background: solid(bg) }}
      onClick={handleActivate}
      data-note-id={note.id}
      aria-label={note.title || (isChecklist ? t("checklist") : t("note"))}
    >
      {icon && (
        <img
          src={icon.src}
          alt=""
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            width: 22,
            height: 22,
            objectFit: "contain",
            pointerEvents: "none",
          }}
        />
      )}

      {note.title && (
        <h3 className="tv-card__title" style={{ paddingRight: icon ? 26 : 0 }}>
          {note.title}
        </h3>
      )}

      {imgs.length > 0 && (
        <div className={`tv-card__images${imgs.length > 1 ? " tv-card__images--multi" : ""}`}>
          {imgs.slice(0, 2).map((im) => (
            <img key={im.id} src={im.src} alt={im.name || ""} />
          ))}
        </div>
      )}

      {isChecklist && checklistSummary ? (
        <div className="tv-card__preview" style={{ fontSize: 12.5 }}>
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
                    gap: 6,
                    margin: "2px 0",
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      flexShrink: 0,
                      width: 11,
                      height: 11,
                      marginTop: 3,
                      border: "1.5px solid currentColor",
                      borderRadius: 3,
                      opacity: 0.75,
                    }}
                  />
                  <span style={{ flex: 1, lineHeight: 1.3 }}>{it.text}</span>
                </li>
              ))}
              {checklistSummary.total > checklistSummary.unchecked.length && (
                <li style={{ opacity: 0.65, marginTop: 4, fontSize: 11 }}>
                  +{checklistSummary.total - checklistSummary.unchecked.length}
                </li>
              )}
            </ul>
          )}
        </div>
      ) : isAudio ? (
        <div className="tv-card__preview" style={{ fontSize: 12.5 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600 }}>
            <Mic size={14} />
            <span>{audioClips.length || 0} {t("audioRecording")}</span>
          </div>
        </div>
      ) : isDraw ? (
        <div className="tv-card__preview">
          {previewHtml ? (
            <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
          ) : (
            <div style={{ opacity: 0.7, fontStyle: "italic", display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Pencil size={14} />
              {t("drawing")}
            </div>
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
            <ImageLucide size={11} />
            {imgs.length}
          </span>
        )}
        {isChecklist && checklistSummary && (
          <span className="tv-card__badge">
            <CheckSquare size={11} />
            {checklistSummary.done}/{checklistSummary.total}
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
