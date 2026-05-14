import React from "react";
import { t } from "../../i18n";

// Resolve which palette the confirm button should use. Accepts either
// the legacy `danger: true` boolean or an explicit `variant` string
// ("default" | "danger" | "success"). Defaults to the indigo/violet
// brand gradient.
function resolveVariant(config) {
    if (config?.variant) return config.variant;
    if (config?.danger) return "danger";
    return "default";
}

const VARIANT_CLASSES = {
    danger:
        "bg-red-600 text-white hover:bg-red-700 shadow-md shadow-red-300/40 dark:shadow-none hover:shadow-lg hover:shadow-red-300/50 dark:hover:shadow-none",
    success:
        "bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700 shadow-md shadow-emerald-300/40 dark:shadow-none hover:shadow-lg hover:shadow-emerald-300/50 dark:hover:shadow-none",
    default:
        "bg-gradient-to-r from-indigo-500 to-violet-600 text-white hover:from-indigo-600 hover:to-violet-700 shadow-md shadow-indigo-300/40 dark:shadow-none hover:shadow-lg hover:shadow-indigo-300/50 dark:hover:shadow-none",
};

export default function GenericConfirmDialog({ open, dark, config, onClose }) {
  if (!open) return null;

  const variantClass = VARIANT_CLASSES[resolveVariant(config)] || VARIANT_CLASSES.default;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div
        className="glass-card rounded-xl shadow-2xl w-[90%] max-w-sm p-6 relative"
        style={{
          backgroundColor: dark
            ? "rgba(40,40,40,0.95)"
            : "rgba(255,255,255,0.95)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-2">
          {config.title || "Confirm Action"}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {config.message}
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <button
            className="px-4 py-2 rounded-lg border border-[var(--border-light)] hover:bg-black/5 dark:hover:bg-white/10"
            onClick={onClose}
          >
            {config.cancelText || t("cancel")}
          </button>
          <button
            className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 hover:scale-[1.03] active:scale-[0.98] btn-gradient ${variantClass}`}
            onClick={async () => {
              onClose();
              if (config.onConfirm) {
                await config.onConfirm();
              }
            }}
          >
            {config.confirmText || "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
