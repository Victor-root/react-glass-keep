import { en } from "./locales/en";
import { fr } from "./locales/fr";

// Pick the first supported language from the user's prioritized list.
// `navigator.languages` reflects the user's content-language preferences
// (e.g. Firefox's "Preferred languages" panel), which can differ from the
// browser UI language exposed by `navigator.language`. Fall back to
// `navigator.language` and then "en" if nothing usable is set.
export function detectLanguage() {
  const candidates = [];
  if (typeof navigator !== "undefined") {
    if (Array.isArray(navigator.languages)) candidates.push(...navigator.languages);
    if (navigator.language) candidates.push(navigator.language);
  }
  for (const raw of candidates) {
    if (!raw) continue;
    const tag = String(raw).toLowerCase();
    if (tag.startsWith("fr")) return "fr";
    if (tag.startsWith("en")) return "en";
  }
  return "en";
}

export const locale = detectLanguage();
document.documentElement.lang = locale;
const dict = locale === "fr" ? fr : en;

export function t(key, params) {
  let str = dict[key] ?? (typeof params === "string" ? params : key);
  if (params && typeof params === "object") {
    for (const [k, v] of Object.entries(params)) {
      str = str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    }
  }
  return str;
}
