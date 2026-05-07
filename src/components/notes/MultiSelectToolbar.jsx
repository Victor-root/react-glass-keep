import React, { useEffect, useRef, useState } from "react";
import { t } from "../../i18n";
import { CloseIcon, PinIcon, ArchiveIcon, DownloadIcon, Trash, Kebab } from "../../icons/index.jsx";
import ColorPickerPanel from "../common/ColorPickerPanel.jsx";
import { COLOR_ORDER, LIGHT_COLORS } from "../../utils/colors.js";

const EXIT_MS = 200;

export default function MultiSelectToolbar({
  multiMode,
  dark,
  activeTagFilter,
  selectedIds,
  filteredNotes,
  onBulkDownloadZip,
  onBulkRestore,
  onBulkDelete,
  onBulkColor,
  onBulkPin,
  onBulkArchive,
  onSelectAll,
  onExitMulti,
  onOpenSideBySide,
}) {
  const multiColorBtnRef = useRef(null);
  const moreMenuBtnRef = useRef(null);
  const moreMenuRef = useRef(null);
  const [showMultiColorPop, setShowMultiColorPop] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // Keep mounted for the exit animation. shouldRender controls actual mount;
  // exiting drives the slide-down/fade keyframe.
  const [shouldRender, setShouldRender] = useState(multiMode);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (multiMode) {
      setShouldRender(true);
      setExiting(false);
      return;
    }
    if (shouldRender) {
      setExiting(true);
      const id = setTimeout(() => {
        setShouldRender(false);
        setExiting(false);
        setShowMoreMenu(false);
        setShowMultiColorPop(false);
      }, EXIT_MS);
      return () => clearTimeout(id);
    }
  }, [multiMode]); // eslint-disable-line

  // Close the more-menu when clicking outside
  useEffect(() => {
    if (!showMoreMenu) return;
    const onDocClick = (e) => {
      if (moreMenuRef.current?.contains(e.target)) return;
      if (moreMenuBtnRef.current?.contains(e.target)) return;
      setShowMoreMenu(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [showMoreMenu]);

  if (!shouldRender) return null;

  const isTrash = activeTagFilter === "TRASHED";
  const isArchive = activeTagFilter === "ARCHIVED";
  const allSelected =
    filteredNotes?.length > 0 &&
    filteredNotes.every((n) => selectedIds.includes(String(n.id)));
  const canSideBySide =
    selectedIds.length === 2 && !isTrash && typeof onOpenSideBySide === "function";

  // Shared button classes for the icon-style action buttons.
  const iconBtn =
    "h-9 w-9 sm:h-9 sm:w-auto sm:px-3 inline-flex items-center justify-center gap-1.5 rounded-lg text-sm font-medium border border-[var(--border-light)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors";
  const iconBtnDanger =
    "h-9 w-9 sm:h-9 sm:w-auto sm:px-3 inline-flex items-center justify-center gap-1.5 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 border border-red-300/60 dark:border-red-500/40 hover:bg-red-500/10 dark:hover:bg-red-500/15 transition-colors";

  return (
    <div
      className={`multi-select-dock${exiting ? " multi-select-dock--exiting" : ""}`}
      role="toolbar"
      aria-label={t("multiSelect")}
    >
      <div className="multi-select-dock__inner glass-card">
        {/* Left cluster: close + counter */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            className="h-9 w-9 inline-flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            data-tooltip={t("exitMultiSelect")}
            onClick={onExitMulti}
            aria-label={t("exitMultiSelect")}
          >
            <CloseIcon />
          </button>
          <span className="text-sm font-semibold tabular-nums px-1 select-none whitespace-nowrap">
            <span className="opacity-60 font-normal hidden sm:inline">
              {t("selectedPrefix")}{" "}
            </span>
            {selectedIds.length}
          </span>
        </div>

        <div className="multi-select-dock__divider" aria-hidden="true" />

        {/* Side-by-side highlight (when exactly 2 selected, not trashed) */}
        {canSideBySide && (
          <button
            type="button"
            onClick={() => onOpenSideBySide(selectedIds)}
            className="h-9 px-3 sm:px-4 inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold text-sm transition-all duration-200 bg-gradient-to-r from-indigo-500 to-violet-600 text-white hover:from-indigo-600 hover:to-violet-700 shadow-md shadow-indigo-300/40 dark:shadow-none hover:shadow-lg hover:shadow-indigo-300/50 hover:scale-[1.03] active:scale-[0.98] btn-gradient shrink-0"
          >
            <span className="hidden sm:inline">{t("openSideBySide")}</span>
            <span className="sm:hidden" aria-hidden="true">
              ⇆
            </span>
            <span className="sr-only sm:hidden">{t("openSideBySide")}</span>
          </button>
        )}

        {/* Main actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0 justify-center sm:justify-start overflow-x-auto multi-select-dock__actions">
          <button
            className={iconBtn}
            onClick={onBulkDownloadZip}
            data-tooltip={t("downloadZip")}
            aria-label={t("downloadZip")}
          >
            <DownloadIcon />
            <span className="hidden md:inline">{t("downloadZip")}</span>
          </button>

          {!isTrash && (
            <>
              <button
                ref={multiColorBtnRef}
                type="button"
                onClick={() => setShowMultiColorPop((v) => !v)}
                className={iconBtn}
                data-tooltip={t("color")}
                aria-label={t("color")}
              >
                <span className="text-base leading-none">{t("colorEmoji")}</span>
                <span className="hidden md:inline">{t("color")}</span>
              </button>
              <ColorPickerPanel
                anchorRef={multiColorBtnRef}
                open={showMultiColorPop}
                onClose={() => setShowMultiColorPop(false)}
                colors={COLOR_ORDER.filter((name) => LIGHT_COLORS[name])}
                selectedColor={null}
                darkMode={dark}
                onSelect={(name) => {
                  onBulkColor(name);
                }}
              />
              {!isArchive && (
                <button
                  className={iconBtn}
                  onClick={() => onBulkPin(true)}
                  data-tooltip={t("pin")}
                  aria-label={t("pin")}
                >
                  <PinIcon />
                  <span className="hidden md:inline">{t("pin")}</span>
                </button>
              )}
              <button
                className={iconBtn}
                onClick={onBulkArchive}
                data-tooltip={isArchive ? t("unarchive") : t("archive")}
                aria-label={isArchive ? t("unarchive") : t("archive")}
              >
                <ArchiveIcon />
                <span className="hidden md:inline">
                  {isArchive ? t("unarchive") : t("archive")}
                </span>
              </button>
            </>
          )}

          {isTrash && (
            <button
              className={iconBtn}
              onClick={onBulkRestore}
              data-tooltip={t("restoreFromTrash")}
              aria-label={t("restoreFromTrash")}
            >
              <span className="hidden md:inline">{t("restoreFromTrash")}</span>
              <span className="md:hidden text-base leading-none">↺</span>
            </button>
          )}

          <button
            className={iconBtnDanger}
            onClick={onBulkDelete}
            data-tooltip={isTrash ? t("permanentlyDelete") : t("moveToTrash")}
            aria-label={isTrash ? t("permanentlyDelete") : t("moveToTrash")}
          >
            <Trash />
            <span className="hidden md:inline">
              {isTrash ? t("permanentlyDelete") : t("moveToTrash")}
            </span>
          </button>
        </div>

        {/* "..." secondary menu — hosts Select all / Deselect all */}
        {filteredNotes?.length > 0 && (
          <>
            <div className="multi-select-dock__divider" aria-hidden="true" />
            <div className="relative shrink-0">
              <button
                ref={moreMenuBtnRef}
                type="button"
                onClick={() => setShowMoreMenu((v) => !v)}
                className="h-9 w-9 inline-flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                data-tooltip={t("moreOptions")}
                aria-label={t("moreOptions")}
                aria-expanded={showMoreMenu}
              >
                <Kebab />
              </button>
              {showMoreMenu && (
                <div
                  ref={moreMenuRef}
                  className="multi-select-dock__menu glass-card"
                  role="menu"
                >
                  <button
                    role="menuitem"
                    className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-black/5 dark:hover:bg-white/10"
                    onClick={() => {
                      onSelectAll?.(filteredNotes);
                      setShowMoreMenu(false);
                    }}
                  >
                    {allSelected ? t("deselectAll") : t("selectAll")}
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
