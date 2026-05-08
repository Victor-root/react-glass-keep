import React from "react";
import { t } from "../../i18n";
import TI from "../../icons/editor/index.jsx";

const REPO_URL = "https://github.com/Victor-root/glasskeep-enhanced";

export default function AdminUpdateSection({ updateInfo }) {
  const fallback =
    typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "";
  const currentVersion = updateInfo?.currentVersion || fallback;
  const updateAvailable =
    !!updateInfo?.updateAvailable && !!updateInfo?.latestVersion;
  const latestVersion = updateInfo?.latestVersion;

  const HeaderIcon = updateAvailable ? TI.Sparkles : TI.Refresh;
  const headerColor = updateAvailable
    ? "text-emerald-600 dark:text-emerald-300 bg-emerald-500/10 dark:bg-emerald-400/15"
    : "text-indigo-600 dark:text-indigo-300 bg-indigo-500/10 dark:bg-indigo-400/15";

  return (
    <div
      className={`mb-6 rounded-xl border ${
        updateAvailable
          ? "border-emerald-300/60 dark:border-emerald-500/30"
          : "border-[var(--border-light)]"
      } bg-white/60 dark:bg-white/5 p-4`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${headerColor}`}
        >
          <HeaderIcon className="tabler-icon w-6 h-6" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <h4 className="text-base font-semibold">
              {t("appVersionSectionTitle")}
            </h4>
            <span className="text-sm tabular-nums text-gray-500 dark:text-gray-400">
              v{currentVersion}
            </span>
            {updateAvailable && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                {t("updateAvailable")} · v{latestVersion}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            {updateAvailable
              ? t("updateAvailableDescription").replace(
                  "{version}",
                  latestVersion,
                )
              : t("updateUpToDateDescription")}
          </p>

          {updateAvailable && (
            <div className="mt-3 rounded-lg bg-gray-50 dark:bg-black/30 border border-[var(--border-light)] p-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                <TI.Terminal2 className="tabler-icon w-4 h-4" />
                {t("updateHowToInstall")}
              </div>
              <ol className="list-decimal pl-5 text-sm text-gray-700 dark:text-gray-200 space-y-1">
                <li>{t("updateStepPull")}</li>
                <li>{t("updateStepBuild")}</li>
                <li>{t("updateStepRestart")}</li>
              </ol>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {t("updateStepNote")}
              </p>
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg bg-gray-900 text-white hover:bg-gray-800 dark:bg-white/10 dark:hover:bg-white/15"
            >
              <TI.BrandGithub className="tabler-icon w-4 h-4" />
              {t("openRepo")}
              <TI.ExternalLink className="tabler-icon w-3.5 h-3.5 opacity-70" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
