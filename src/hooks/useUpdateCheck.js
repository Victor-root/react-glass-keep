import { useEffect, useRef, useState } from "react";
import { api } from "../utils/api.js";
import { t } from "../i18n";

const initialState = () => ({
  updateAvailable: false,
  latestVersion: null,
  releaseUrl: null,
  currentVersion:
    typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : null,
});

export function useUpdateCheck({ token, isAdmin, showToast }) {
  const [info, setInfo] = useState(initialState);
  // Guards against double-toasting from a quick re-mount (e.g. React
  // strict mode in dev) within a single admin session. We still toast
  // again on every fresh login because the hook re-mounts when the
  // auth token changes.
  const toastedRef = useRef(false);

  useEffect(() => {
    if (!token || !isAdmin) return;
    let cancelled = false;
    toastedRef.current = false;
    (async () => {
      try {
        const data = await api("/update-check", { token, timeoutMs: 8000 });
        if (cancelled || !data) return;
        setInfo({
          updateAvailable: !!data.updateAvailable,
          latestVersion: data.latestVersion || null,
          releaseUrl: data.releaseUrl || null,
          currentVersion:
            data.currentVersion ||
            (typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : null),
        });
        if (
          data.updateAvailable &&
          data.latestVersion &&
          !toastedRef.current
        ) {
          toastedRef.current = true;
          const msg = t("newVersionAvailable").replace(
            "{version}",
            data.latestVersion,
          );
          showToast?.(msg, "info");
        }
      } catch (_) {
        /* fail silently */
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isAdmin]);

  return info;
}
