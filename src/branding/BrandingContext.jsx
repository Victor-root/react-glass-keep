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

  return (
    <BrandingContext.Provider value={{ branding, refreshBranding }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  return useContext(BrandingContext);
}
