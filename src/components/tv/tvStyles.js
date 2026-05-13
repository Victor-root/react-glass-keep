// CSS injected when the app boots in Android TV mode.
//
// Lives outside of the regular tailwind/globalCSS pipeline because all of
// these rules are TV-only and we don't want them ever leaking into the
// phone / tablet / desktop layouts. The whole sheet is gated on a single
// `<html data-tv="1">` selector so removing the attribute disables
// every override at once.
//
// Design notes:
//  - 10-foot UI: minimum touchable / focusable hit target ≈ 80px; body
//    font-size 22px; chrome elements scale up accordingly.
//  - Overscan: 4% inner padding so nothing important hits the bezel on
//    older TVs that don't expose a safe area.
//  - Focus: bright violet ring + slight scale-up. NEVER rely on :hover
//    alone — D-pad users have no pointer.
//  - Animations: kept short and cheap (transform/opacity only) so the
//    Shield's WebView stays at 60fps even on a 4K panel.

export const TV_STYLE_ID = "tv-mode-styles";

export const TV_CSS = `
/* ------- Root layer ------- */
html[data-tv="1"], html[data-tv="1"] body {
  background: #0b0d12 !important;
  color: #e5e7eb;
  /* Forced dark background under any glass surface — TVs love deep
     blacks and the floating-cards layer becomes noisy at >40" otherwise. */
  font-size: 22px;
  line-height: 1.45;
  overflow: hidden !important;
  height: 100vh;
  width: 100vw;
}
html[data-tv="1"] body {
  background: radial-gradient(circle at 20% 0%, #1a1530 0%, #0b0d12 55%, #06070b 100%) !important;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
}

/* Hide every browser scrollbar in TV mode — there's no mouse to grab it
   and the focus ring already tells the user where they are. */
html[data-tv="1"] *::-webkit-scrollbar { width: 0; height: 0; display: none; }
html[data-tv="1"] * { scrollbar-width: none; }

/* Disable text selection: there's no caret, no copy-paste from a remote. */
html[data-tv="1"] { user-select: none; -webkit-user-select: none; }
html[data-tv="1"] .tv-allow-select { user-select: text; -webkit-user-select: text; }

/* ------- Focus ring (D-pad navigation) ------- */
html[data-tv="1"] *:focus { outline: none; }
html[data-tv="1"] .tv-focusable {
  position: relative;
  transition: transform 160ms ease, box-shadow 160ms ease, background-color 160ms ease;
  cursor: default;
}
html[data-tv="1"] .tv-focusable:focus,
html[data-tv="1"] .tv-focusable[data-tv-focused="true"] {
  transform: scale(1.04);
  box-shadow:
    0 0 0 4px rgba(167, 139, 250, 0.95),
    0 0 24px 6px rgba(124, 58, 237, 0.55),
    0 18px 36px -12px rgba(0, 0, 0, 0.7);
  z-index: 50;
}
html[data-tv="1"] .tv-focusable.tv-focusable--flat:focus,
html[data-tv="1"] .tv-focusable.tv-focusable--flat[data-tv-focused="true"] {
  transform: none;
  box-shadow: 0 0 0 3px rgba(167, 139, 250, 0.95);
}

/* ------- TV-only utility classes ------- */
html[data-tv="1"] .tv-overscan { padding: 4vh 4vw; }
html[data-tv="1"] .tv-screen {
  height: 100vh;
  width: 100vw;
  display: flex;
  flex-direction: column;
}

html[data-tv="1"] .tv-header {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 28px 4vw 20px 4vw;
  background: linear-gradient(180deg, rgba(11, 13, 18, 0.92) 0%, rgba(11, 13, 18, 0.0) 100%);
  position: relative;
  z-index: 20;
}
html[data-tv="1"] .tv-header__title {
  font-size: 32px;
  font-weight: 800;
  letter-spacing: -0.01em;
  background: linear-gradient(90deg, #c4b5fd, #f9a8d4);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
html[data-tv="1"] .tv-header__subtitle {
  font-size: 16px;
  color: #9ca3af;
  margin-top: 2px;
}
html[data-tv="1"] .tv-header__count {
  margin-left: auto;
  font-size: 18px;
  color: #c4b5fd;
  background: rgba(124, 58, 237, 0.15);
  border: 1px solid rgba(167, 139, 250, 0.35);
  padding: 8px 18px;
  border-radius: 999px;
}

/* ------- Main split layout ------- */
html[data-tv="1"] .tv-layout {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 16px;
  flex: 1 1 auto;
  min-height: 0;
  padding: 0 4vw 4vh 4vw;
}
html[data-tv="1"] .tv-sidebar {
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
  padding: 8px 4px 24px 0;
}
html[data-tv="1"] .tv-sidebar__group-label {
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #6b7280;
  padding: 18px 8px 6px;
}
html[data-tv="1"] .tv-sidebar__item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  font-size: 19px;
  color: #d1d5db;
  text-align: left;
  width: 100%;
}
html[data-tv="1"] .tv-sidebar__item[data-active="true"] {
  background: linear-gradient(90deg, rgba(99, 102, 241, 0.25), rgba(124, 58, 237, 0.18));
  border-color: rgba(167, 139, 250, 0.5);
  color: #f5f3ff;
}
html[data-tv="1"] .tv-sidebar__item-count {
  margin-left: auto;
  font-size: 14px;
  color: #9ca3af;
  background: rgba(255, 255, 255, 0.05);
  padding: 2px 10px;
  border-radius: 999px;
  min-width: 28px;
  text-align: center;
}

/* ------- Notes grid ------- */
html[data-tv="1"] .tv-notes-scroll {
  overflow-y: auto;
  padding: 12px 12px 80px 12px;
  scroll-behavior: smooth;
  /* Push the focused card up from the bottom edge so it doesn't sit
     under the gradient fade. */
  scroll-padding-top: 40px;
  scroll-padding-bottom: 80px;
}
html[data-tv="1"] .tv-section-title {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #a78bfa;
  padding: 12px 8px 16px;
}
html[data-tv="1"] .tv-notes-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 22px;
  padding: 4px 12px;
}
@media (max-width: 1700px) {
  html[data-tv="1"] .tv-notes-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
@media (max-width: 1200px) {
  html[data-tv="1"] .tv-notes-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

/* ------- Note card (closed) ------- */
html[data-tv="1"] .tv-card {
  border-radius: 22px;
  padding: 22px 22px 18px;
  min-height: 220px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  color: #111827;
  border: 1px solid rgba(255, 255, 255, 0.06);
  position: relative;
  overflow: hidden;
  text-align: left;
}
html[data-tv="1"] .tv-card__title {
  font-size: 22px;
  font-weight: 700;
  line-height: 1.25;
  word-break: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
html[data-tv="1"] .tv-card__preview {
  font-size: 17px;
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
  font-size: 17px !important;
  margin: 0 0 0.35em !important;
}
html[data-tv="1"] .tv-card__preview h1,
html[data-tv="1"] .tv-card__preview h2,
html[data-tv="1"] .tv-card__preview h3 {
  font-weight: 700 !important;
  font-size: 18px !important;
}
html[data-tv="1"] .tv-card__preview ul,
html[data-tv="1"] .tv-card__preview ol { padding-left: 1.2em !important; }
html[data-tv="1"] .tv-card--dark { color: #f3f4f6; }
html[data-tv="1"] .tv-card__footer {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  opacity: 0.7;
  margin-top: auto;
}
html[data-tv="1"] .tv-card__badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.18);
  font-size: 12px;
  font-weight: 600;
}
html[data-tv="1"] .tv-card--dark .tv-card__badge { background: rgba(255, 255, 255, 0.16); }
html[data-tv="1"] .tv-card__pin {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.18);
  color: #fde68a;
  border-radius: 999px;
}
html[data-tv="1"] .tv-card--dark .tv-card__pin { background: rgba(255, 255, 255, 0.18); }

html[data-tv="1"] .tv-card__images {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
}
html[data-tv="1"] .tv-card__images img {
  width: 100%;
  height: 100px;
  object-fit: cover;
  border-radius: 10px;
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
  padding: 4vh 6vw;
  animation: tv-detail-in 220ms ease-out;
}
@keyframes tv-detail-in {
  from { opacity: 0; transform: scale(0.98); }
  to { opacity: 1; transform: scale(1); }
}
html[data-tv="1"] .tv-detail__card {
  width: 100%;
  max-width: 1400px;
  border-radius: 28px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 32px 96px -16px rgba(0, 0, 0, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
html[data-tv="1"] .tv-detail__header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 28px 42px 12px;
}
html[data-tv="1"] .tv-detail__title {
  font-size: 36px;
  font-weight: 800;
  line-height: 1.15;
  word-break: break-word;
}
html[data-tv="1"] .tv-detail__meta {
  margin-left: auto;
  font-size: 16px;
  opacity: 0.65;
  flex-shrink: 0;
}
html[data-tv="1"] .tv-detail__body {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 12px 42px 32px;
  font-size: 26px;
  line-height: 1.55;
}
html[data-tv="1"] .tv-detail__body * {
  max-width: 100%;
  word-break: break-word;
}
html[data-tv="1"] .tv-detail__body h1 { font-size: 38px; font-weight: 800; margin: 24px 0 12px; }
html[data-tv="1"] .tv-detail__body h2 { font-size: 32px; font-weight: 700; margin: 22px 0 10px; }
html[data-tv="1"] .tv-detail__body h3 { font-size: 28px; font-weight: 700; margin: 20px 0 8px; }
html[data-tv="1"] .tv-detail__body p { margin: 0 0 14px; }
html[data-tv="1"] .tv-detail__body ul,
html[data-tv="1"] .tv-detail__body ol { padding-left: 1.4em; margin: 0 0 14px; }
html[data-tv="1"] .tv-detail__body li { margin-bottom: 6px; }
html[data-tv="1"] .tv-detail__body blockquote {
  border-left: 4px solid currentColor;
  padding: 6px 18px;
  margin: 12px 0;
  opacity: 0.85;
  font-style: italic;
}
html[data-tv="1"] .tv-detail__body code {
  background: rgba(255, 255, 255, 0.08);
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 22px;
}
html[data-tv="1"] .tv-detail__body pre {
  background: rgba(0, 0, 0, 0.35);
  padding: 18px 22px;
  border-radius: 14px;
  font-size: 20px;
  overflow-x: auto;
  margin: 12px 0;
}
html[data-tv="1"] .tv-detail__body img {
  max-width: 100%;
  border-radius: 14px;
  margin: 12px 0;
}

/* Checklist rendering inside the detail view */
html[data-tv="1"] .tv-checklist {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
html[data-tv="1"] .tv-checklist__section-title {
  font-size: 22px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin: 14px 0 4px;
  opacity: 0.85;
}
html[data-tv="1"] .tv-checklist__item {
  display: flex;
  align-items: flex-start;
  gap: 18px;
  padding: 10px 14px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.04);
}
html[data-tv="1"] .tv-checklist__item--done { opacity: 0.45; text-decoration: line-through; }
html[data-tv="1"] .tv-checklist__box {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border-radius: 8px;
  border: 2px solid currentColor;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
}
html[data-tv="1"] .tv-checklist__item--done .tv-checklist__box { background: currentColor; color: rgba(255, 255, 255, 0.95); }

/* Empty / login screens */
html[data-tv="1"] .tv-empty {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18px;
  padding: 60px;
  text-align: center;
  color: #cbd5e1;
}
html[data-tv="1"] .tv-empty__title {
  font-size: 36px;
  font-weight: 700;
  background: linear-gradient(90deg, #c4b5fd, #f9a8d4);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
html[data-tv="1"] .tv-empty__hint {
  font-size: 18px;
  opacity: 0.7;
  max-width: 600px;
}

/* Buttons (header actions, "exit TV mode", etc.) */
html[data-tv="1"] .tv-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 14px 24px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #e5e7eb;
  font-size: 17px;
  font-weight: 600;
}
html[data-tv="1"] .tv-btn--primary {
  background: linear-gradient(90deg, #6366f1, #7c3aed);
  border-color: transparent;
  color: #ffffff;
  box-shadow: 0 10px 24px -8px rgba(124, 58, 237, 0.7);
}

/* Login surface */
html[data-tv="1"] .tv-login {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 6vh 6vw;
  gap: 28px;
}
html[data-tv="1"] .tv-login__card {
  width: 100%;
  max-width: 640px;
  background: rgba(15, 17, 25, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 26px;
  padding: 42px 44px;
  display: flex;
  flex-direction: column;
  gap: 22px;
}
html[data-tv="1"] .tv-login__title {
  font-size: 38px;
  font-weight: 800;
  background: linear-gradient(90deg, #c4b5fd, #f9a8d4);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
html[data-tv="1"] .tv-login__row { display: flex; flex-direction: column; gap: 6px; }
html[data-tv="1"] .tv-login__label { font-size: 14px; letter-spacing: 0.08em; text-transform: uppercase; color: #a78bfa; }
html[data-tv="1"] .tv-login__input {
  width: 100%;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 14px;
  padding: 18px 20px;
  font-size: 22px;
  color: #f9fafb;
  outline: none;
}
html[data-tv="1"] .tv-login__input:focus { border-color: #a78bfa; box-shadow: 0 0 0 3px rgba(167, 139, 250, 0.4); }
html[data-tv="1"] .tv-login__submit { padding: 20px; font-size: 22px; }
html[data-tv="1"] .tv-login__error {
  color: #fca5a5;
  background: rgba(220, 38, 38, 0.12);
  border: 1px solid rgba(220, 38, 38, 0.3);
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 16px;
}

/* Toast / status pill */
html[data-tv="1"] .tv-status {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.06);
  font-size: 14px;
  color: #d1d5db;
}
html[data-tv="1"] .tv-status__dot { width: 8px; height: 8px; border-radius: 50%; background: #10b981; }
html[data-tv="1"] .tv-status__dot--offline { background: #f59e0b; }
html[data-tv="1"] .tv-status__dot--error { background: #ef4444; }
`;
