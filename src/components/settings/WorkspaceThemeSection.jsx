import React, { useState } from "react";
import { t } from "../../i18n";
import TI from "../../icons/editor/index.jsx";
import { RowIcon } from "../common/SettingsAccordion.jsx";
import { SHELL_THEMES, getStoredShellTheme, setShellTheme } from "../../theme/shellTheme.js";

// Workspace (shell) colour-theme picker. Themes recolour ONLY the header +
// sidebar chrome (via --gk-chrome-* token overrides on <html>); notes, note
// cards, panels, the notes-area background and the login page are untouched.
// Selection applies live, is saved to localStorage, and is re-applied at boot
// (see src/theme/shellTheme.js). GlassKeep is the default fallback.
export default function WorkspaceThemeSection() {
  const [selected, setSelected] = useState(() => getStoredShellTheme());

  const choose = (id) => {
    if (id === selected) return;
    setShellTheme(id);
    setSelected(id);
  };

  return (
    <div className="space-y-3 px-3">
      <div className="flex items-center gap-3 min-w-0">
        <RowIcon icon={TI.DropletFilled} />
        <div className="min-w-0">
          <div className="font-medium">{t("workspaceTheme")}</div>
          <div className="text-sm text-gray-500">{t("workspaceThemeDesc")}</div>
        </div>
      </div>

      <div
        className="grid grid-cols-2 sm:grid-cols-3 gap-2"
        role="radiogroup"
        aria-label={t("workspaceTheme")}
      >
        {SHELL_THEMES.map((theme) => {
          const isSel = theme.id === selected;
          const [primary, secondary, surface] = theme.swatch;
          return (
            <button
              key={theme.id}
              type="button"
              role="radio"
              aria-checked={isSel}
              onClick={() => choose(theme.id)}
              className={`relative flex flex-col overflow-hidden rounded-xl border text-left transition-all active:scale-[0.99] ${
                isSel
                  ? "border-indigo-500 ring-2 ring-indigo-500/60"
                  : "border-[var(--border-light)] hover:border-indigo-400/60"
              }`}
            >
              <span
                className="h-9 w-full flex items-center px-2"
                style={{ background: surface }}
              >
                <span
                  className="h-3.5 w-12 rounded-full"
                  style={{ background: `linear-gradient(to right, ${primary}, ${secondary})` }}
                />
              </span>
              <span className="flex items-center justify-between gap-1 px-2.5 py-1.5 bg-white dark:bg-gray-800">
                <span className="text-sm font-medium truncate">{theme.label}</span>
                {isSel && (
                  <TI.Check className="tabler-icon w-4 h-4 shrink-0 text-indigo-600 dark:text-indigo-300" />
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
