// src/utils/logoLibrary.js
// Persistent per-user logo library. Logos live independently from the notes
// that reference them, so a user can curate the list, reuse logos across
// notes, and remove ones they no longer want — even if no note currently
// uses them.
//
// Storage: localStorage, keyed by user id. Each compressed data-URL logo is
// typically a few tens of KB; the typical localStorage 5-10 MB quota fits
// dozens of logos comfortably.

const KEY_PREFIX = "glass-keep-logo-library-";
const SEED_FLAG_PREFIX = "glass-keep-logo-library-seeded-";

function storageKey(userId) {
  return `${KEY_PREFIX}${userId || "anonymous"}`;
}

function seedFlagKey(userId) {
  return `${SEED_FLAG_PREFIX}${userId || "anonymous"}`;
}

export function loadLogoLibrary(userId) {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function persist(userId, logos) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(logos));
  } catch (e) {
    console.warn("[logoLibrary] persist failed", e);
  }
}

/** Adds a logo, deduping by src. Returns the updated list. */
export function addToLogoLibrary(userId, logo) {
  if (!logo?.src) return loadLogoLibrary(userId);
  const current = loadLogoLibrary(userId);
  if (current.some((l) => l.src === logo.src)) return current;
  const entry = {
    id: logo.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    src: logo.src,
    name: logo.name || "",
    createdAt: Date.now(),
  };
  const next = [...current, entry];
  persist(userId, next);
  return next;
}

/** Removes a logo by id. Returns the updated list. */
export function removeFromLogoLibrary(userId, id) {
  const current = loadLogoLibrary(userId);
  const next = current.filter((l) => l.id !== id);
  persist(userId, next);
  return next;
}

/**
 * One-shot seed: if this user's library has never been seeded, pull every
 * unique icon currently in their notes into the library so they don't
 * appear to "lose" logos when the library system rolls out.
 *
 * Subsequent calls are no-ops, so deleting a logo from the library will
 * stick even if the same logo is still embedded in a note.
 */
export function seedLogoLibraryFromNotes(userId, notes) {
  try {
    const flag = seedFlagKey(userId);
    if (localStorage.getItem(flag)) return loadLogoLibrary(userId);
    const seen = new Map(loadLogoLibrary(userId).map((l) => [l.src, l]));
    if (Array.isArray(notes)) {
      for (const n of notes) {
        const imgs = Array.isArray(n?.images) ? n.images : [];
        for (const im of imgs) {
          if (im && im.role === "icon" && im.src && !seen.has(im.src)) {
            seen.set(im.src, {
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              src: im.src,
              name: im.name || "",
              createdAt: Date.now(),
            });
          }
        }
      }
    }
    const merged = Array.from(seen.values());
    persist(userId, merged);
    localStorage.setItem(flag, "1");
    return merged;
  } catch {
    return loadLogoLibrary(userId);
  }
}
