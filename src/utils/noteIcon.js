// src/utils/noteIcon.js
// Note icon (logo badge) helpers.
//
// The note icon is a small visual identifier — a logo or pictogram — that the
// user pins to a note to make it easier to spot in the closed-card grid. It is
// conceptually distinct from regular content images, but to avoid touching the
// server schema, sync queue and at-rest encryption we piggy-back on the
// existing `images` array: an icon is just an image entry tagged with
// role: "icon". Helpers in this module isolate that detail so the rest of the
// app can treat icons as a first-class concept.
//
// Backward compatibility: existing notes have no `role` property on their
// images, so they continue to behave as content images and have no icon.

export const ICON_ROLE = "icon";

/** Returns the single icon entry from a note's images array, or null. */
export function getNoteIcon(images) {
  if (!Array.isArray(images)) return null;
  const found = images.find((im) => im && im.role === ICON_ROLE);
  return found || null;
}

/** Returns content images (everything that is NOT the icon). */
export function getContentImages(images) {
  if (!Array.isArray(images)) return [];
  return images.filter((im) => im && im.role !== ICON_ROLE);
}

/**
 * Returns a new images array with the icon replaced (or removed when
 * `icon` is null/undefined). The icon is always stored at the end of the
 * array so its index is irrelevant to the content-image grid.
 */
export function setNoteIcon(images, icon) {
  const content = getContentImages(images);
  if (!icon) return content;
  return [...content, { ...icon, role: ICON_ROLE }];
}
