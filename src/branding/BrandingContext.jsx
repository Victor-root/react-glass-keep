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

function applyFavicon(logo) {
  const head = document.head;
  if (originalIconLinksHTML === null) {
    originalIconLinksHTML = Array.from(head.querySelectorAll(ICON_SELECTOR))
      .map((l) => l.outerHTML)
      .join("");
  }
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
  } else if (originalIconLinksHTML) {
    // Restore the bundled <link rel="icon"> set from index.html.
    head.insertAdjacentHTML("beforeend", originalIconLinksHTML);
  }
}

export function BrandingProvider({ children }) {
  const [branding, setBranding] = useState(DEFAULT_BRANDING);

  const refreshBranding = useCallback(async () => {
    try {
      // The background can be a multi-MB data URL, so give this fetch
      // more headroom than the 6 s default used for the small endpoints.
      const data = await api("/branding", { timeoutMs: 15000 });
      if (data && typeof data === "object") {
        setBranding({
          appName: typeof data.appName === "string" ? data.appName : "",
          logo: data.logo || null,
          loginBackground: data.loginBackground || null,
          loginBackgroundBlur: Number.isFinite(data.loginBackgroundBlur)
            ? data.loginBackgroundBlur
            : 0,
        });
      }
    } catch (e) {
      // Non-fatal — the app keeps the bundled default branding.
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
