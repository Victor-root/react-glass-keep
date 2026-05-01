import React from "react";
import { t } from "../../i18n";

/**
 * Compact footer rendered at the bottom of a closed note card.
 * Displays the tags on the left and the optional note icon (logo
 * badge) on the right. Renders nothing when the note has neither —
 * we don't want to waste vertical space on cards that have nothing
 * to show down there.
 *
 * The component is purely presentational; the card decides which
 * tags / icon to pass in.
 */
export default function NoteCardFooter({
  tags = [],
  icon = null,
  maxChips = 3,
}) {
  const safeTags = Array.isArray(tags) ? tags : [];
  const hasTags = safeTags.length > 0;
  const hasIcon = !!(icon && icon.src);

  if (!hasTags && !hasIcon) return null;

  // Show only the first N tags as chips. Anything past that collapses
  // into a "+N" counter so cards with lots of tags stay compact.
  const visible = safeTags.slice(0, maxChips);
  const overflow = safeTags.length - visible.length;

  return (
    <div className="note-card-footer mt-2 pt-2 border-t border-black/10 dark:border-white/10 flex items-center gap-2">
      <div className="flex flex-wrap gap-1 items-center min-w-0 flex-1">
        {visible.map((tag) => (
          <span
            key={tag}
            className="bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200 text-[11px] font-medium px-2 py-0.5 rounded-full max-w-[140px] truncate"
            title={tag}
          >
            {tag}
          </span>
        ))}
        {overflow > 0 && (
          <span
            className="bg-gray-200/70 text-gray-600 dark:bg-gray-700/70 dark:text-gray-300 text-[11px] font-medium px-2 py-0.5 rounded-full"
            title={safeTags.slice(maxChips).join(", ")}
          >
            +{overflow}
          </span>
        )}
      </div>

      {hasIcon && (
        <div
          className="note-card-icon shrink-0 flex items-center justify-center rounded-md overflow-hidden bg-white/60 dark:bg-black/20 ring-1 ring-black/5 dark:ring-white/10"
          style={{ width: 28, height: 28 }}
          aria-label={icon.name || t("noteIcon")}
        >
          <img
            src={icon.src}
            alt={icon.name || t("noteIcon")}
            className="w-full h-full"
            style={{ objectFit: "contain" }}
            loading="lazy"
            draggable={false}
          />
        </div>
      )}
    </div>
  );
}
