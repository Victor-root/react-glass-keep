import React from "react";
import { t } from "../../i18n";

/**
 * Inline preview of the current note icon, shown inside the modal so
 * the user can see, replace or remove their logo without leaving the
 * note. Hidden entirely when the note has no icon — adding one is
 * still discoverable through the "Image" footer sub-menu.
 *
 * Replace / remove actions are disabled when the modal is in a
 * read-only context (view mode, except for checklists which always
 * stay editable, mirroring ModalImagesGrid's `canRemove` rule).
 */
export default function NoteIconEditor({
  icon,
  canEdit,
  onReplace,
  onRemove,
}) {
  if (!icon || !icon.src) return null;

  return (
    <div className="px-2 pb-2">
      <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10">
        <div
          className="shrink-0 flex items-center justify-center rounded-md overflow-hidden bg-white/80 dark:bg-black/30 ring-1 ring-black/10 dark:ring-white/10"
          style={{ width: 40, height: 40 }}
        >
          <img
            src={icon.src}
            alt={icon.name || t("noteIcon")}
            className="w-full h-full"
            style={{ objectFit: "contain" }}
            draggable={false}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold text-gray-700 dark:text-gray-200">
            {t("noteIcon")}
          </div>
          {icon.name && (
            <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
              {icon.name}
            </div>
          )}
        </div>
        {canEdit && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={onReplace}
              className="text-xs px-2 py-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 text-gray-700 dark:text-gray-200"
              data-tooltip={t("replaceLogo")}
            >
              {t("replace")}
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="text-xs px-2 py-1 rounded-md hover:bg-red-500/10 text-red-600 dark:text-red-400"
              data-tooltip={t("removeLogo")}
            >
              {t("remove")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
