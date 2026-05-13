// CSS injected when the app boots in Android TV mode.
//
// Gated entirely on `<html data-tv="1">` — removing the attribute kills
// every override at once. Nothing in this sheet should ever apply to the
// phone or desktop layouts; if a rule needs to leak there it doesn't
// belong here.

export const TV_STYLE_ID = "tv-mode-styles";

export const TV_CSS = `
/* ------- Root layer ------- */
:root {
  /* Tighter safe-area — most modern TVs have no overscan and Nvidia
     Shield exposes the full panel. We still keep a small inset so the
     focus glow + scrollbars don't kiss the bezel. */
  --tv-safe-x: 2vw;
  --tv-safe-y: 2.2vh;
  --tv-focus-pad: 14px;
  --tv-gap: 12px;
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
  /* Static gradient — radial-gradient is cheap on the GPU, no
     repaint cost. Backdrop-filter is reserved for the detail overlay. */
  background: radial-gradient(circle at 20% 0%, #1a1530 0%, #0b0d12 55%, #06070b 100%) !important;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
}
html[data-tv="1"] *, html[data-tv="1"] *::before, html[data-tv="1"] *::after {
  box-sizing: border-box;
}
html[data-tv="1"] *::-webkit-scrollbar { width: 0; height: 0; display: none; }
html[data-tv="1"] * { scrollbar-width: none; }
html[data-tv="1"] { user-select: none; -webkit-user-select: none; }
html[data-tv="1"] .tv-allow-select { user-select: text; -webkit-user-select: text; }

/* ------- Focus ring ------- */
html[data-tv="1"] *:focus { outline: none; }
html[data-tv="1"] .tv-focusable {
  position: relative;
  /* Hint the compositor — pre-rasterise the transform so the focus
     animation stays on the GPU and doesn't repaint the whole grid. */
  will-change: transform;
  transition: transform 140ms ease, box-shadow 140ms ease;
  cursor: default;
  transform-origin: center center;
}
html[data-tv="1"] .tv-focusable:focus,
html[data-tv="1"] .tv-focusable[data-tv-focused="true"] {
  transform: scale(1.025);
  box-shadow:
    0 0 0 3px rgba(167, 139, 250, 0.95),
    0 0 14px 2px rgba(124, 58, 237, 0.4),
    0 10px 22px -8px rgba(0, 0, 0, 0.55);
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
  gap: 12px;
  padding: var(--tv-safe-y) var(--tv-safe-x) 8px;
  background: linear-gradient(180deg, rgba(11, 13, 18, 0.92) 0%, rgba(11, 13, 18, 0.0) 100%);
  position: relative;
  z-index: 20;
  min-height: 0;
}
html[data-tv="1"] .tv-header__hamburger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.07);
  color: #e5e7eb;
  flex-shrink: 0;
}
html[data-tv="1"] .tv-header__viewtoggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.07);
  color: #e5e7eb;
  flex-shrink: 0;
}
html[data-tv="1"] .tv-header__title-wrap { min-width: 0; }
html[data-tv="1"] .tv-header__title {
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -0.01em;
  background: linear-gradient(90deg, #c4b5fd, #f9a8d4);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  line-height: 1.1;
}
html[data-tv="1"] .tv-header__subtitle {
  font-size: 11px;
  color: #9ca3af;
  margin-top: 2px;
}
html[data-tv="1"] .tv-header__user {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 10px 4px 4px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.07);
  font-size: 12px;
  color: #e5e7eb;
}
html[data-tv="1"] .tv-header__avatar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(124, 58, 237, 0.35);
  color: #fff;
  font-weight: 700;
  font-size: 12px;
  overflow: hidden;
}
html[data-tv="1"] .tv-header__avatar img {
  width: 100%; height: 100%; object-fit: cover;
}
html[data-tv="1"] .tv-header__count {
  font-size: 12px;
  color: #c4b5fd;
  background: rgba(124, 58, 237, 0.15);
  border: 1px solid rgba(167, 139, 250, 0.35);
  padding: 4px 12px;
  border-radius: 999px;
}

/* ------- Main split layout ------- */
html[data-tv="1"] .tv-layout {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 10px;
  flex: 1 1 auto;
  min-height: 0;
  padding: 0 var(--tv-safe-x) var(--tv-safe-y);
  /* transition only the column track — cheap, and the right-hand grid
     reflows automatically because we use minmax(220px, 1fr) inside. */
  transition: grid-template-columns 220ms ease;
}
html[data-tv="1"] .tv-layout--sidebar-hidden {
  grid-template-columns: 0 1fr;
}

html[data-tv="1"] .tv-sidebar {
  display: flex;
  flex-direction: column;
  gap: 5px;
  overflow-y: auto;
  /* Padding on the LEFT too so the focus glow has room to bloom
     without being clipped by the parent's overflow:hidden. The
     previous "0" left-padding cut the ring on the screen edge. */
  padding: 8px 8px 24px 8px;
  min-width: 0;
  opacity: 1;
  transition: opacity 200ms ease, visibility 0s 0ms;
}
html[data-tv="1"] .tv-layout--sidebar-hidden .tv-sidebar {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity 180ms ease, visibility 0s 180ms;
  padding: 0;
}
html[data-tv="1"] .tv-sidebar__group-label {
  font-size: 9px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #6b7280;
  padding: 10px 6px 2px;
}
html[data-tv="1"] .tv-sidebar__item {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px 10px;
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  font-size: 13px;
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
  width: 16px;
  height: 16px;
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
  font-size: 10px;
  color: #9ca3af;
  background: rgba(255, 255, 255, 0.05);
  padding: 1px 7px;
  border-radius: 999px;
  min-width: 20px;
  text-align: center;
}

/* ------- Notes scroll + grid ------- */
html[data-tv="1"] .tv-notes-scroll {
  overflow-y: auto;
  overflow-x: hidden;
  padding: 10px 10px 56px 10px;
  scroll-behavior: smooth;
  scroll-padding-top: 20px;
  scroll-padding-bottom: 80px;
  min-width: 0;
}
/* Grid view — auto-fills so the row reflows the moment the sidebar
   collapses (width grows ⇒ more columns appear). Min card width 200px
   means roughly 6-7 cards at 1080p with the sidebar hidden, 5-6 when
   it's shown. */
html[data-tv="1"] .tv-notes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--tv-gap);
  /* align-items: start lets each card take its natural height, so the
     library doesn't look like a wall of identical rectangles any more. */
  align-items: start;
  grid-auto-rows: min-content;
  padding: 2px 2px 8px;
}
/* List view — horizontal cards (title left, preview right). One card
   per row, scrollable vertically. TV space is mostly horizontal, so
   wide cards make better use of it than tall ones. */
html[data-tv="1"] .tv-notes-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 2px 2px 8px;
}
html[data-tv="1"] .tv-notes-list .tv-card {
  flex-direction: row;
  align-items: stretch;
  min-height: 0;
  padding: 12px 18px;
  gap: 18px;
}
html[data-tv="1"] .tv-notes-list .tv-card__title {
  -webkit-line-clamp: 1;
  font-size: 16px;
  flex-shrink: 0;
  width: 280px;
  align-self: center;
}
html[data-tv="1"] .tv-notes-list .tv-card__preview {
  -webkit-line-clamp: 2;
  flex: 1 1 auto;
  align-self: center;
  font-size: 13px;
}
html[data-tv="1"] .tv-notes-list .tv-card__images {
  width: 120px;
  flex-shrink: 0;
  align-self: center;
  margin: 0;
}
html[data-tv="1"] .tv-notes-list .tv-card__images img { height: 56px; }
html[data-tv="1"] .tv-notes-list .tv-card__footer {
  align-self: center;
  margin: 0;
  flex-shrink: 0;
}

/* ------- Note card (closed, grid view) ------- */
html[data-tv="1"] .tv-card {
  border-radius: 12px;
  padding: 11px 12px 10px;
  /* No min-height — the card takes the height of its content so the
     library has actual visual variety. The container's grid still
     lines up rows; align-items: start gives top alignment. */
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 5px;
  color: #111827;
  border: 1px solid rgba(255, 255, 255, 0.06);
  position: relative;
  overflow: hidden;
  text-align: left;
  scroll-margin: 40px 24px 60px 24px;
  /* Hint the GPU — these cards are the busiest layer of the home view. */
  contain: layout style paint;
}
html[data-tv="1"] .tv-card__title {
  font-size: 14px;
  font-weight: 700;
  line-height: 1.25;
  word-break: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
html[data-tv="1"] .tv-card__preview {
  font-size: 12px;
  line-height: 1.4;
  /* Hard cap on height (instead of -webkit-line-clamp) so blocks like
     <pre>, <hr> and code chunks don't render past the visible area. */
  max-height: 9.6em; /* roughly 8 lines */
  overflow: hidden;
  opacity: 0.92;
  word-break: break-word;
  /* Make the bottom of the preview fade out — clean visual cutoff
     that doesn't look like a clipped element. */
  mask-image: linear-gradient(to bottom, #000 78%, transparent 100%);
  -webkit-mask-image: linear-gradient(to bottom, #000 78%, transparent 100%);
}
html[data-tv="1"] .tv-card__preview > * {
  margin: 0 0 0.35em !important;
}
html[data-tv="1"] .tv-card__preview > *:last-child { margin-bottom: 0 !important; }
html[data-tv="1"] .tv-card__preview h1,
html[data-tv="1"] .tv-card__preview h2,
html[data-tv="1"] .tv-card__preview h3 {
  font-weight: 700 !important;
  font-size: 12.5px !important;
  margin: 0.2em 0 0.35em !important;
}
html[data-tv="1"] .tv-card__preview ul,
html[data-tv="1"] .tv-card__preview ol { padding-left: 1.1em !important; }
html[data-tv="1"] .tv-card__preview pre {
  display: block;
  font-family: 'Fira Code', 'JetBrains Mono', monospace !important;
  font-size: 11px !important;
  background: rgba(0, 0, 0, 0.18) !important;
  padding: 5px 8px !important;
  border-radius: 5px !important;
  margin: 4px 0 !important;
  white-space: pre;
  overflow: hidden;
  max-height: 5.5em;
}
html[data-tv="1"] .tv-card__preview code {
  font-family: 'Fira Code', 'JetBrains Mono', monospace !important;
  font-size: 11px !important;
  background: rgba(0, 0, 0, 0.18) !important;
  padding: 1px 5px !important;
  border-radius: 4px !important;
}
html[data-tv="1"] .tv-card__preview pre code {
  padding: 0 !important;
  background: transparent !important;
}
html[data-tv="1"] .tv-card__preview hr {
  border: none;
  border-top: 1px solid currentColor;
  opacity: 0.18;
  margin: 6px 0 !important;
}
html[data-tv="1"] .tv-card__preview blockquote {
  border-left: 2px solid currentColor;
  padding: 1px 8px;
  opacity: 0.75;
  margin: 4px 0 !important;
}
html[data-tv="1"] .tv-card__preview img {
  max-width: 100%;
  border-radius: 6px;
  margin: 3px 0 !important;
}
html[data-tv="1"] .tv-card--dark { color: #f3f4f6; }
html[data-tv="1"] .tv-card__footer {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 5px;
  font-size: 11px;
  opacity: 0.7;
  margin-top: 4px;
}
html[data-tv="1"] .tv-card__badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 1px 7px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.18);
  font-size: 10.5px;
  font-weight: 600;
}
html[data-tv="1"] .tv-card--dark .tv-card__badge { background: rgba(255, 255, 255, 0.14); }
html[data-tv="1"] .tv-card__images {
  display: grid;
  grid-template-columns: 1fr;
  gap: 3px;
  margin-bottom: 3px;
}
html[data-tv="1"] .tv-card__images--multi { grid-template-columns: 1fr 1fr; }
html[data-tv="1"] .tv-card__images img {
  width: 100%;
  height: 56px;
  object-fit: cover;
  border-radius: 6px;
  background: rgba(0,0,0,0.15);
}

/* ------- Note detail (fullscreen viewer) ------- */
html[data-tv="1"] .tv-detail {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: stretch;
  justify-content: center;
  /* Solid background (no backdrop-filter blur) — blur kills the
     compositor on older Shields. We still get the dim-out effect. */
  background: rgba(6, 7, 11, 0.94);
  padding: var(--tv-safe-y) calc(var(--tv-safe-x) * 1.4);
  animation: tv-detail-in 180ms ease-out;
}
@keyframes tv-detail-in {
  from { opacity: 0; transform: scale(0.98); }
  to { opacity: 1; transform: scale(1); }
}
html[data-tv="1"] .tv-detail__card {
  width: 100%;
  max-width: 1200px;
  border-radius: 18px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 18px 48px -16px rgba(0, 0, 0, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.08);
  min-height: 0;
}
html[data-tv="1"] .tv-detail__header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px 28px 6px;
  flex-wrap: wrap;
}
html[data-tv="1"] .tv-detail__title {
  font-size: 22px;
  font-weight: 800;
  line-height: 1.15;
  word-break: break-word;
}
html[data-tv="1"] .tv-detail__meta {
  margin-left: auto;
  font-size: 12px;
  opacity: 0.65;
  flex-shrink: 0;
}
html[data-tv="1"] .tv-detail__body {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 6px 28px 20px;
  font-size: 16px;
  line-height: 1.55;
}
html[data-tv="1"] .tv-detail__body * {
  max-width: 100%;
  word-break: break-word;
}
html[data-tv="1"] .tv-detail__body h1 { font-size: 24px; font-weight: 800; margin: 16px 0 8px; }
html[data-tv="1"] .tv-detail__body h2 { font-size: 20px; font-weight: 700; margin: 14px 0 8px; }
html[data-tv="1"] .tv-detail__body h3 { font-size: 18px; font-weight: 700; margin: 12px 0 6px; }
html[data-tv="1"] .tv-detail__body p { margin: 0 0 8px; }
html[data-tv="1"] .tv-detail__body ul,
html[data-tv="1"] .tv-detail__body ol { padding-left: 1.4em; margin: 0 0 10px; }
html[data-tv="1"] .tv-detail__body li { margin-bottom: 3px; }
html[data-tv="1"] .tv-detail__body blockquote {
  border-left: 3px solid currentColor;
  padding: 3px 12px;
  margin: 8px 0;
  opacity: 0.85;
  font-style: italic;
}
html[data-tv="1"] .tv-detail__body code {
  background: rgba(255, 255, 255, 0.08);
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 14px;
}
html[data-tv="1"] .tv-detail__body pre {
  background: rgba(0, 0, 0, 0.35);
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 13px;
  overflow-x: auto;
  margin: 8px 0;
  white-space: pre;
}
html[data-tv="1"] .tv-detail__body hr {
  border: none;
  border-top: 1px solid currentColor;
  opacity: 0.18;
  margin: 12px 0;
}
html[data-tv="1"] .tv-detail__body img {
  max-width: 100%;
  border-radius: 10px;
  margin: 8px 0;
}

/* Checklist body inside detail */
html[data-tv="1"] .tv-checklist {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
html[data-tv="1"] .tv-checklist__section-title {
  font-size: 14px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin: 8px 0 2px;
  opacity: 0.85;
}
html[data-tv="1"] .tv-checklist__item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 5px 9px;
  border-radius: 7px;
  background: rgba(255, 255, 255, 0.04);
}
html[data-tv="1"] .tv-checklist__item--done { opacity: 0.45; text-decoration: line-through; }
html[data-tv="1"] .tv-checklist__box {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  border-radius: 4px;
  border: 2px solid currentColor;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 11px;
  margin-top: 2px;
}
html[data-tv="1"] .tv-checklist__item--done .tv-checklist__box { background: currentColor; color: rgba(255, 255, 255, 0.95); }

/* Empty / login */
html[data-tv="1"] .tv-empty {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 50px;
  text-align: center;
  color: #cbd5e1;
}
html[data-tv="1"] .tv-empty__title {
  font-size: 22px;
  font-weight: 700;
  background: linear-gradient(90deg, #c4b5fd, #f9a8d4);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
html[data-tv="1"] .tv-empty__hint {
  font-size: 13px;
  opacity: 0.7;
  max-width: 520px;
}

/* Buttons */
html[data-tv="1"] .tv-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 9px 16px;
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #e5e7eb;
  font-size: 12px;
  font-weight: 600;
}
html[data-tv="1"] .tv-btn--primary {
  background: linear-gradient(90deg, #6366f1, #7c3aed);
  border-color: transparent;
  color: #ffffff;
}

/* Login surface */
html[data-tv="1"] .tv-login {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4vh 4vw;
  gap: 20px;
}
html[data-tv="1"] .tv-login__card {
  width: 100%;
  max-width: 520px;
  background: rgba(15, 17, 25, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;
  padding: 28px 30px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
html[data-tv="1"] .tv-login__title {
  font-size: 24px;
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
  border-radius: 9px;
  padding: 11px 14px;
  font-size: 15px;
  color: #f9fafb;
  outline: none;
}
html[data-tv="1"] .tv-login__input:focus { border-color: #a78bfa; box-shadow: 0 0 0 2px rgba(167, 139, 250, 0.4); }
html[data-tv="1"] .tv-login__submit { padding: 12px; font-size: 14px; }
html[data-tv="1"] .tv-login__error {
  color: #fca5a5;
  background: rgba(220, 38, 38, 0.12);
  border: 1px solid rgba(220, 38, 38, 0.3);
  padding: 7px 11px;
  border-radius: 7px;
  font-size: 12px;
}

/* Hard caps on any fixed-positioned layer. */
html[data-tv="1"] .tv-detail,
html[data-tv="1"] .tv-screen { max-width: 100vw; max-height: 100vh; }
`;
