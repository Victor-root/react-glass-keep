// CSS injected when the app boots in Android TV mode.
//
// Lives outside of the regular tailwind/globalCSS pipeline because all of
// these rules are TV-only and we don't want them ever leaking into the
// phone / tablet / desktop layouts. The whole sheet is gated on a single
// `<html data-tv="1">` selector so removing the attribute disables
// every override at once.
//
// Sizing philosophy:
//  - 16px base, not 22px. A 1080p TV at ~3m gives roughly the same
//    angular size as a phone at arm's length, so phone-grade type works
//    fine — we just need it sharp and well-spaced, not blown up.
//  - 5 cards per row on a 1080p layout, down-stepping to 4/3/2/1 as the
//    viewport shrinks. The previous 3-column grid only showed 4 cards
//    above the fold which is what made the viewer feel cramped.
//  - 4-5% safe-area inset around the title-safe zone.
//  - Focus: scale 1.025 only, the heavy lifting is the glow ring so the
//    transform never pushes content past the bezel.

export const TV_STYLE_ID = "tv-mode-styles";

export const TV_CSS = `
/* ------- Root layer ------- */
:root {
  --tv-safe-x: 4vw;
  --tv-safe-y: 4vh;
  --tv-focus-pad: 12px;
  --tv-gap: 14px;
}
html[data-tv="1"], html[data-tv="1"] body {
  background: #0b0d12 !important;
  color: #e5e7eb;
  font-size: 16px;
  line-height: 1.45;
  overflow: hidden !important;
  height: 100vh;
  width: 100vw;
  margin: 0;
  box-sizing: border-box;
}
html[data-tv="1"] body {
  background: radial-gradient(circle at 20% 0%, #1a1530 0%, #0b0d12 55%, #06070b 100%) !important;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
}
html[data-tv="1"] *, html[data-tv="1"] *::before, html[data-tv="1"] *::after {
  box-sizing: border-box;
}

/* No browser scrollbars — the focus glow is the user's position cue. */
html[data-tv="1"] *::-webkit-scrollbar { width: 0; height: 0; display: none; }
html[data-tv="1"] * { scrollbar-width: none; }

/* No text selection (remote has no caret). */
html[data-tv="1"] { user-select: none; -webkit-user-select: none; }
html[data-tv="1"] .tv-allow-select { user-select: text; -webkit-user-select: text; }

/* ------- Focus ring ------- */
html[data-tv="1"] *:focus { outline: none; }
html[data-tv="1"] .tv-focusable {
  position: relative;
  transition: transform 140ms ease, box-shadow 140ms ease, background-color 140ms ease;
  cursor: default;
  transform-origin: center center;
}
html[data-tv="1"] .tv-focusable:focus,
html[data-tv="1"] .tv-focusable[data-tv-focused="true"] {
  transform: scale(1.025);
  box-shadow:
    0 0 0 3px rgba(167, 139, 250, 0.95),
    0 0 18px 4px rgba(124, 58, 237, 0.45),
    0 14px 28px -10px rgba(0, 0, 0, 0.6);
  z-index: 50;
}
html[data-tv="1"] .tv-focusable.tv-focusable--flat:focus,
html[data-tv="1"] .tv-focusable.tv-focusable--flat[data-tv-focused="true"] {
  transform: none;
  box-shadow: 0 0 0 2px rgba(167, 139, 250, 0.95);
}

/* ------- Screen / header ------- */
html[data-tv="1"] .tv-screen {
  height: 100vh;
  width: 100vw;
  max-width: 100vw;
  max-height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

html[data-tv="1"] .tv-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: var(--tv-safe-y) var(--tv-safe-x) 10px;
  background: linear-gradient(180deg, rgba(11, 13, 18, 0.92) 0%, rgba(11, 13, 18, 0.0) 100%);
  position: relative;
  z-index: 20;
  flex-wrap: wrap;
}
html[data-tv="1"] .tv-header__hamburger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.07);
  color: #e5e7eb;
  flex-shrink: 0;
}
html[data-tv="1"] .tv-header__title-wrap { min-width: 0; }
html[data-tv="1"] .tv-header__title {
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.01em;
  background: linear-gradient(90deg, #c4b5fd, #f9a8d4);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  line-height: 1.1;
}
html[data-tv="1"] .tv-header__subtitle {
  font-size: 12px;
  color: #9ca3af;
  margin-top: 2px;
}
html[data-tv="1"] .tv-header__count {
  margin-left: auto;
  font-size: 13px;
  color: #c4b5fd;
  background: rgba(124, 58, 237, 0.15);
  border: 1px solid rgba(167, 139, 250, 0.35);
  padding: 6px 14px;
  border-radius: 999px;
}

/* ------- Main split layout ------- */
html[data-tv="1"] .tv-layout {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 12px;
  flex: 1 1 auto;
  min-height: 0;
  padding: 0 var(--tv-safe-x) var(--tv-safe-y);
  transition: grid-template-columns 220ms ease;
}
html[data-tv="1"] .tv-layout--sidebar-hidden {
  grid-template-columns: 0 1fr;
}
@media (max-width: 1280px) {
  html[data-tv="1"] .tv-layout { grid-template-columns: 200px 1fr; }
}

html[data-tv="1"] .tv-sidebar {
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow-y: auto;
  padding: var(--tv-focus-pad) var(--tv-focus-pad) 24px 0;
  min-width: 0;
  opacity: 1;
  transition: opacity 200ms ease, visibility 0s 0ms;
}
html[data-tv="1"] .tv-layout--sidebar-hidden .tv-sidebar {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity 200ms ease, visibility 0s 200ms;
}
html[data-tv="1"] .tv-sidebar__group-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #6b7280;
  padding: 14px 8px 4px;
}
html[data-tv="1"] .tv-sidebar__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  font-size: 14px;
  color: #d1d5db;
  text-align: left;
  width: 100%;
  scroll-margin: 24px 0;
}
html[data-tv="1"] .tv-sidebar__item[data-active="true"] {
  background: linear-gradient(90deg, rgba(99, 102, 241, 0.28), rgba(124, 58, 237, 0.18));
  border-color: rgba(167, 139, 250, 0.5);
  color: #f5f3ff;
}
html[data-tv="1"] .tv-sidebar__item-icon {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  color: currentColor;
  opacity: 0.85;
}
html[data-tv="1"] .tv-sidebar__item-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
html[data-tv="1"] .tv-sidebar__item-count {
  margin-left: auto;
  font-size: 11px;
  color: #9ca3af;
  background: rgba(255, 255, 255, 0.05);
  padding: 2px 8px;
  border-radius: 999px;
  min-width: 22px;
  text-align: center;
}

/* ------- Notes grid ------- */
html[data-tv="1"] .tv-notes-scroll {
  overflow-y: auto;
  overflow-x: hidden;
  padding: var(--tv-focus-pad) var(--tv-focus-pad) 60px var(--tv-focus-pad);
  scroll-behavior: smooth;
  scroll-padding-top: 24px;
  scroll-padding-bottom: 80px;
  min-width: 0;
}
html[data-tv="1"] .tv-notes-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: var(--tv-gap);
  padding: 4px 4px 12px;
}
@media (max-width: 1600px) {
  html[data-tv="1"] .tv-notes-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}
@media (max-width: 1280px) {
  html[data-tv="1"] .tv-notes-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
@media (max-width: 900px) {
  html[data-tv="1"] .tv-notes-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

/* ------- Note card (closed) ------- */
html[data-tv="1"] .tv-card {
  border-radius: 14px;
  padding: 14px 14px 12px;
  min-height: 160px;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: #111827;
  border: 1px solid rgba(255, 255, 255, 0.06);
  position: relative;
  overflow: hidden;
  text-align: left;
  scroll-margin: 60px 24px 80px 24px;
}
html[data-tv="1"] .tv-card__title {
  font-size: 15px;
  font-weight: 700;
  line-height: 1.25;
  word-break: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
html[data-tv="1"] .tv-card__preview {
  font-size: 12.5px;
  line-height: 1.4;
  flex: 1 1 auto;
  display: -webkit-box;
  -webkit-line-clamp: 7;
  -webkit-box-orient: vertical;
  overflow: hidden;
  opacity: 0.92;
  word-break: break-word;
}
html[data-tv="1"] .tv-card__preview * {
  font-size: inherit !important;
  margin: 0 0 0.3em !important;
}
html[data-tv="1"] .tv-card__preview h1,
html[data-tv="1"] .tv-card__preview h2,
html[data-tv="1"] .tv-card__preview h3 {
  font-weight: 700 !important;
  font-size: 13px !important;
}
html[data-tv="1"] .tv-card__preview ul,
html[data-tv="1"] .tv-card__preview ol { padding-left: 1.2em !important; }
html[data-tv="1"] .tv-card__preview pre,
html[data-tv="1"] .tv-card__preview code {
  font-family: 'Fira Code', 'JetBrains Mono', monospace !important;
  font-size: 11.5px !important;
  background: rgba(0,0,0,0.18);
  padding: 1px 6px;
  border-radius: 4px;
}
html[data-tv="1"] .tv-card--dark { color: #f3f4f6; }
html[data-tv="1"] .tv-card__footer {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  opacity: 0.7;
  margin-top: auto;
}
html[data-tv="1"] .tv-card__badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.18);
  font-size: 11px;
  font-weight: 600;
}
html[data-tv="1"] .tv-card--dark .tv-card__badge { background: rgba(255, 255, 255, 0.14); }
html[data-tv="1"] .tv-card__images {
  display: grid;
  grid-template-columns: 1fr;
  gap: 4px;
  margin-bottom: 4px;
}
html[data-tv="1"] .tv-card__images--multi { grid-template-columns: 1fr 1fr; }
html[data-tv="1"] .tv-card__images img {
  width: 100%;
  height: 64px;
  object-fit: cover;
  border-radius: 7px;
}

/* ------- Note detail (fullscreen viewer) ------- */
html[data-tv="1"] .tv-detail {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: stretch;
  justify-content: center;
  background: rgba(6, 7, 11, 0.86);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  padding: var(--tv-safe-y) calc(var(--tv-safe-x) * 1.2);
  animation: tv-detail-in 200ms ease-out;
}
@keyframes tv-detail-in {
  from { opacity: 0; transform: scale(0.98); }
  to { opacity: 1; transform: scale(1); }
}
html[data-tv="1"] .tv-detail__card {
  width: 100%;
  max-width: 1200px;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 24px 64px -12px rgba(0, 0, 0, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.08);
  min-height: 0;
}
html[data-tv="1"] .tv-detail__header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px 32px 8px;
  flex-wrap: wrap;
}
html[data-tv="1"] .tv-detail__title {
  font-size: 24px;
  font-weight: 800;
  line-height: 1.15;
  word-break: break-word;
}
html[data-tv="1"] .tv-detail__meta {
  margin-left: auto;
  font-size: 13px;
  opacity: 0.65;
  flex-shrink: 0;
}
html[data-tv="1"] .tv-detail__body {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 8px 32px 24px;
  font-size: 17px;
  line-height: 1.55;
}
html[data-tv="1"] .tv-detail__body * {
  max-width: 100%;
  word-break: break-word;
}
html[data-tv="1"] .tv-detail__body h1 { font-size: 26px; font-weight: 800; margin: 18px 0 8px; }
html[data-tv="1"] .tv-detail__body h2 { font-size: 22px; font-weight: 700; margin: 16px 0 8px; }
html[data-tv="1"] .tv-detail__body h3 { font-size: 19px; font-weight: 700; margin: 14px 0 6px; }
html[data-tv="1"] .tv-detail__body p { margin: 0 0 10px; }
html[data-tv="1"] .tv-detail__body ul,
html[data-tv="1"] .tv-detail__body ol { padding-left: 1.4em; margin: 0 0 10px; }
html[data-tv="1"] .tv-detail__body li { margin-bottom: 4px; }
html[data-tv="1"] .tv-detail__body blockquote {
  border-left: 3px solid currentColor;
  padding: 4px 14px;
  margin: 10px 0;
  opacity: 0.85;
  font-style: italic;
}
html[data-tv="1"] .tv-detail__body code {
  background: rgba(255, 255, 255, 0.08);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 15px;
}
html[data-tv="1"] .tv-detail__body pre {
  background: rgba(0, 0, 0, 0.35);
  padding: 14px 18px;
  border-radius: 10px;
  font-size: 14px;
  overflow-x: auto;
  margin: 10px 0;
}
html[data-tv="1"] .tv-detail__body img {
  max-width: 100%;
  border-radius: 10px;
  margin: 10px 0;
}

/* Checklist rendering inside the detail view */
html[data-tv="1"] .tv-checklist {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
html[data-tv="1"] .tv-checklist__section-title {
  font-size: 15px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin: 10px 0 2px;
  opacity: 0.85;
}
html[data-tv="1"] .tv-checklist__item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 6px 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
}
html[data-tv="1"] .tv-checklist__item--done { opacity: 0.45; text-decoration: line-through; }
html[data-tv="1"] .tv-checklist__box {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  border-radius: 5px;
  border: 2px solid currentColor;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 12px;
  margin-top: 2px;
}
html[data-tv="1"] .tv-checklist__item--done .tv-checklist__box { background: currentColor; color: rgba(255, 255, 255, 0.95); }

/* Empty / login screens */
html[data-tv="1"] .tv-empty {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 60px;
  text-align: center;
  color: #cbd5e1;
}
html[data-tv="1"] .tv-empty__title {
  font-size: 24px;
  font-weight: 700;
  background: linear-gradient(90deg, #c4b5fd, #f9a8d4);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
html[data-tv="1"] .tv-empty__hint {
  font-size: 14px;
  opacity: 0.7;
  max-width: 540px;
}

/* Buttons */
html[data-tv="1"] .tv-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #e5e7eb;
  font-size: 13px;
  font-weight: 600;
}
html[data-tv="1"] .tv-btn--primary {
  background: linear-gradient(90deg, #6366f1, #7c3aed);
  border-color: transparent;
  color: #ffffff;
  box-shadow: 0 8px 20px -8px rgba(124, 58, 237, 0.7);
}

/* Login surface */
html[data-tv="1"] .tv-login {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4vh 4vw;
  gap: 22px;
}
html[data-tv="1"] .tv-login__card {
  width: 100%;
  max-width: 520px;
  background: rgba(15, 17, 25, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  padding: 32px 34px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
html[data-tv="1"] .tv-login__title {
  font-size: 26px;
  font-weight: 800;
  background: linear-gradient(90deg, #c4b5fd, #f9a8d4);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
html[data-tv="1"] .tv-login__row { display: flex; flex-direction: column; gap: 4px; }
html[data-tv="1"] .tv-login__label { font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: #a78bfa; }
html[data-tv="1"] .tv-login__input {
  width: 100%;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  padding: 12px 14px;
  font-size: 16px;
  color: #f9fafb;
  outline: none;
}
html[data-tv="1"] .tv-login__input:focus { border-color: #a78bfa; box-shadow: 0 0 0 3px rgba(167, 139, 250, 0.4); }
html[data-tv="1"] .tv-login__submit { padding: 14px; font-size: 16px; }
html[data-tv="1"] .tv-login__error {
  color: #fca5a5;
  background: rgba(220, 38, 38, 0.12);
  border: 1px solid rgba(220, 38, 38, 0.3);
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 13px;
}

/* Status pill */
html[data-tv="1"] .tv-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.06);
  font-size: 11px;
  color: #d1d5db;
}
html[data-tv="1"] .tv-status__dot { width: 6px; height: 6px; border-radius: 50%; background: #10b981; }
html[data-tv="1"] .tv-status__dot--offline { background: #f59e0b; }
html[data-tv="1"] .tv-status__dot--error { background: #ef4444; }

/* Make sure fixed layers can't be pushed off-screen by the focus scale. */
html[data-tv="1"] .tv-detail,
html[data-tv="1"] .tv-screen { max-width: 100vw; max-height: 100vh; }
`;
