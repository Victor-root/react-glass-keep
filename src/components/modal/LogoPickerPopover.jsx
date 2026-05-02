import React, { useRef, useState, useEffect, useLayoutEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { t } from "../../i18n";
import { getNoteIcon } from "../../utils/noteIcon.js";

/**
 * Logo picker popover.
 *
 * Shows a grid of all logos previously imported across the user's notes
 * plus a "+" upload tile. Clicking a tile sets that logo as the active
 * note's icon; clicking "+" opens the OS file picker.
 *
 * Visually inspired by ColorPickerPanel (rounded-2xl, backdrop blur,
 * portal positioning, smart drop direction).
 */
export default function LogoPickerPopover({
  anchorRef,
  open,
  onClose,
  dark,
  notes,
  selectedSrc,
  onPickExisting,
  onUploadNew,
}) {
  const panelRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0, dropUp: false, arrowLeft: 0 });

  const PANEL_W = 256;

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const a = anchorRef?.current;
      if (!a) return;
      const r = a.getBoundingClientRect();
      const spaceBelow = window.innerHeight - r.bottom;
      const dropUp = spaceBelow < 280;
      let left = Math.min(r.left, window.innerWidth - PANEL_W - 8);
      left = Math.max(8, left);
      const arrowLeft = r.left + r.width / 2 - left - 6;
      setPos({ top: dropUp ? r.top - 8 : r.bottom + 8, left, dropUp, arrowLeft });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, anchorRef]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (panelRef.current?.contains(e.target)) return;
      if (anchorRef?.current?.contains(e.target)) return;
      onClose?.();
    };
    document.addEventListener("mousedown", onDown, true);
    return () => document.removeEventListener("mousedown", onDown, true);
  }, [open, onClose, anchorRef]);

  // Aggregate every unique icon across all notes (dedup by src).
  const logos = useMemo(() => {
    if (!Array.isArray(notes)) return [];
    const seen = new Map();
    for (const n of notes) {
      const icon = getNoteIcon(n?.images);
      if (icon?.src && !seen.has(icon.src)) {
        seen.set(icon.src, { id: icon.id, src: icon.src, name: icon.name });
      }
    }
    return Array.from(seen.values());
  }, [notes]);

  if (!open) return null;

  const panelStyle = {
    position: "fixed",
    left: pos.left,
    zIndex: 99999,
    width: PANEL_W,
    ...(pos.dropUp
      ? { bottom: window.innerHeight - pos.top }
      : { top: pos.top }),
  };

  const arrowDir = pos.dropUp ? "down" : "up";
  const nearLeft = (pos.arrowLeft || 0) < 20;
  const nearRight = (pos.arrowLeft || 0) > PANEL_W - 32;

  return createPortal(
    <div
      ref={panelRef}
      data-arrow={arrowDir}
      style={{
        ...panelStyle,
        '--arrow-left': `${pos.arrowLeft || 0}px`,
        ...(nearLeft && arrowDir === "up" && { borderTopLeftRadius: '4px' }),
        ...(nearLeft && arrowDir === "down" && { borderBottomLeftRadius: '4px' }),
        ...(nearRight && arrowDir === "up" && { borderTopRightRadius: '4px' }),
        ...(nearRight && arrowDir === "down" && { borderBottomRightRadius: '4px' }),
      }}
      className={`rounded-2xl shadow-2xl backdrop-blur-xl border ring-1 ring-black/5 dark:ring-white/5 p-3 ${
        dark ? "bg-gray-900/98 border-gray-700/50" : "bg-white/98 border-gray-100/80"
      }`}
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 48px)", gap: "12px" }}>
        {logos.map((logo) => {
          const isSelected = selectedSrc && logo.src === selectedSrc;
          return (
            <button
              key={logo.id || logo.src}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPickExisting?.(logo);
                onClose?.();
              }}
              aria-label={logo.name || t("noteIcon")}
              data-tooltip={logo.name || t("noteIcon")}
              className={`w-12 h-12 rounded-xl transition-transform active:scale-95 hover:scale-110 focus:outline-none flex items-center justify-center overflow-hidden ${
                dark ? "bg-white/5 hover:bg-white/10" : "bg-gray-100 hover:bg-gray-200"
              } ${
                isSelected
                  ? "ring-[3px] ring-indigo-500 ring-offset-2 dark:ring-offset-gray-900"
                  : ""
              }`}
            >
              <img
                src={logo.src}
                alt={logo.name || ""}
                className="w-full h-full"
                style={{ objectFit: "contain" }}
                draggable={false}
              />
            </button>
          );
        })}

        {/* Upload tile — always last, dashed border to read as "add new" */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onUploadNew?.();
            onClose?.();
          }}
          aria-label={t("addLogo")}
          data-tooltip={t("addLogo")}
          className={`w-12 h-12 rounded-xl transition-transform active:scale-95 hover:scale-110 focus:outline-none flex items-center justify-center border-2 border-dashed ${
            dark
              ? "border-gray-500 text-gray-300 hover:border-indigo-400 hover:text-indigo-300"
              : "border-gray-300 text-gray-500 hover:border-indigo-500 hover:text-indigo-600"
          }`}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
        </button>
      </div>

      {logos.length === 0 && (
        <div className={`text-xs text-center mt-3 ${dark ? "text-gray-400" : "text-gray-500"}`}>
          {t("noLogosYet")}
        </div>
      )}
    </div>,
    document.body
  );
}
