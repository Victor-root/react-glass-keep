import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api } from "../utils/api.js";

// Instance-wide login/app branding (custom app name, logo, login
// background image + blur). Configured by an admin in the "Login page
// settings" section and served, unauthenticated, from GET /api/branding
// so the login screen can read it before any token exists.
//
// Everything is optional: when a field is empty/null the consuming
// component falls back to the bundled default, so an instance that never
// touches branding renders exactly as before.

// Default app name — the historical hard-coded wordmark. Kept in one
// place so every consumer falls back to the same string.
export const DEFAULT_APP_NAME = "Glass Keep";

const DEFAULT_BRANDING = {
  appName: "",
  logo: null,
  loginBackground: null,
  loginBackgroundBlur: 0,
};

// Last-known branding is cached in localStorage so a reload paints the
// correct name/logo (and favicon/tab title) on the very first render,
// instead of flashing the bundled defaults until GET /api/branding
// resolves. The login background is intentionally NOT cached: it can be
// several MB (localStorage quota) and it's only a login backdrop, so a
// brief default backdrop before it loads is acceptable.
const CACHE_KEY = "gk:branding";

function readCachedBranding() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return DEFAULT_BRANDING;
    const c = JSON.parse(raw);
    return {
      appName: typeof c.appName === "string" ? c.appName : "",
      logo: c.logo || null,
      loginBackground: null,
      loginBackgroundBlur: Number.isFinite(c.loginBackgroundBlur) ? c.loginBackgroundBlur : 0,
    };
  } catch {
    return DEFAULT_BRANDING;
  }
}

function writeCachedBranding(b) {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        appName: b.appName || "",
        logo: b.logo || null,
        loginBackgroundBlur: b.loginBackgroundBlur || 0,
      }),
    );
  } catch {
    // Quota exceeded or storage disabled — caching is best-effort.
  }
}

const BrandingContext = createContext({
  branding: DEFAULT_BRANDING,
  refreshBranding: () => {},
});

// --- Document <head> branding (tab title + favicon) -------------------
// The custom app name drives the browser tab title and the custom logo
// replaces the favicon. We capture the page's original icon links once
// so clearing the custom logo restores the bundled favicons exactly.
const ICON_SELECTOR = 'link[rel~="icon"], link[rel="apple-touch-icon"]';
let originalIconLinksHTML = null;

function applyDocumentTitle(appName) {
  document.title = appName || DEFAULT_APP_NAME;
}

function getOriginalIconLinksHTML() {
  if (originalIconLinksHTML !== null) return originalIconLinksHTML;
  // Prefer the snapshot the index.html boot script took BEFORE it may
  // have swapped in a cached custom logo — that's the only place the
  // bundled defaults still exist verbatim. Fall back to the live DOM
  // when the boot script didn't run (e.g. SSR/tests).
  if (typeof window !== "undefined" && typeof window.__GK_DEFAULT_ICONS__ === "string") {
    originalIconLinksHTML = window.__GK_DEFAULT_ICONS__;
  } else {
    originalIconLinksHTML = Array.from(document.head.querySelectorAll(ICON_SELECTOR))
      .map((l) => l.outerHTML)
      .join("");
  }
  return originalIconLinksHTML;
}

function applyFavicon(logo) {
  const head = document.head;
  const originals = getOriginalIconLinksHTML();
  head.querySelectorAll(ICON_SELECTOR).forEach((l) => l.remove());
  if (logo) {
    const icon = document.createElement("link");
    icon.rel = "icon";
    icon.href = logo;
    head.appendChild(icon);
    const apple = document.createElement("link");
    apple.rel = "apple-touch-icon";
    apple.href = logo;
    head.appendChild(apple);
  } else if (originals) {
    // Restore the bundled <link rel="icon"> set from index.html.
    head.insertAdjacentHTML("beforeend", originals);
  }
}

export function BrandingProvider({ children }) {
  // Lazy init from the cache so the first render already has the right
  // branding (no flash of the default name/logo on reload).
  const [branding, setBranding] = useState(readCachedBranding);

  const refreshBranding = useCallback(async () => {
    try {
      // The background can be a multi-MB data URL, so give this fetch
      // more headroom than the 6 s default used for the small endpoints.
      const data = await api("/branding", { timeoutMs: 15000 });
      if (data && typeof data === "object") {
        const next = {
          appName: typeof data.appName === "string" ? data.appName : "",
          logo: data.logo || null,
          loginBackground: data.loginBackground || null,
          loginBackgroundBlur: Number.isFinite(data.loginBackgroundBlur)
            ? data.loginBackgroundBlur
            : 0,
        };
        setBranding(next);
        writeCachedBranding(next);
      }
    } catch (e) {
      // Non-fatal — the app keeps the cached / bundled default branding.
      console.error("Failed to load branding:", e);
    }
  }, []);

  useEffect(() => {
    refreshBranding();
  }, [refreshBranding]);

  // Reflect the custom name/logo in the browser tab (title + favicon).
  useEffect(() => {
    applyDocumentTitle(branding.appName);
  }, [branding.appName]);
  useEffect(() => {
    applyFavicon(branding.logo);
  }, [branding.logo]);

  return (
    <BrandingContext.Provider value={{ branding, refreshBranding }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  return useContext(BrandingContext);
}
