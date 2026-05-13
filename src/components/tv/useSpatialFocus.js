import { useEffect, useRef } from "react";

// 2D spatial navigation for the D-pad / arrow keys.
//
// Without this, Chromium tab order zig-zags through the page in DOM
// order — which sends focus across the whole sidebar before it reaches
// the first note. We pick the closest focusable in the requested
// direction by geometry instead, the way Android TV's framework does.
//
// Activation rules:
//  - Only runs while `enabled` is true. App.jsx wires this to "TV mode".
//  - Arrow keys / D-pad codes hijack the default browser behaviour.
//  - Enter / Space activate the focused element (click).
//  - Back (browser back key, Esc, KEYCODE_BACK as keyboard event) calls
//    the onBack callback so the consumer can pop a detail view, etc.
//  - "tv-focus" custom event lets callers imperatively focus a node
//    (e.g. when a new note detail mounts).

const FOCUSABLE_SELECTOR = ".tv-focusable";

function getRect(el) {
  const r = el.getBoundingClientRect();
  return {
    cx: r.left + r.width / 2,
    cy: r.top + r.height / 2,
    left: r.left,
    right: r.right,
    top: r.top,
    bottom: r.bottom,
    width: r.width,
    height: r.height,
  };
}

function isFocusable(el) {
  // "Focusable" here means "the element exists, is laid out and isn't
  // hidden". We deliberately do NOT require it to be inside the
  // viewport — the whole point of D-pad navigation is that we let the
  // user scroll the next row into view by pressing Down, so candidates
  // below the fold MUST be eligible. Otherwise the user gets stuck on
  // the last visible row (the symptom reported on the Shield).
  if (!el || !el.isConnected) return false;
  if (el.getAttribute("aria-hidden") === "true") return false;
  if (el.hasAttribute("disabled")) return false;
  const r = el.getBoundingClientRect();
  if (r.width === 0 || r.height === 0) return false;
  const style = window.getComputedStyle(el);
  if (style.visibility === "hidden" || style.display === "none") return false;
  return true;
}

function pickNextFocus(current, direction) {
  const all = Array.from(document.querySelectorAll(FOCUSABLE_SELECTOR))
    .filter(isFocusable);
  if (!all.length) return null;
  if (!current || !current.isConnected) return all[0];
  const cur = getRect(current);
  let best = null;
  let bestScore = Infinity;
  for (const el of all) {
    if (el === current) continue;
    const r = getRect(el);
    let primary; // distance along the axis we're moving on
    let lateral; // perpendicular offset (penalised)
    let passes = false;
    if (direction === "right") {
      primary = r.left - cur.right;
      lateral = Math.abs(r.cy - cur.cy);
      passes = r.left >= cur.right - 8;
    } else if (direction === "left") {
      primary = cur.left - r.right;
      lateral = Math.abs(r.cy - cur.cy);
      passes = r.right <= cur.left + 8;
    } else if (direction === "down") {
      primary = r.top - cur.bottom;
      lateral = Math.abs(r.cx - cur.cx);
      passes = r.top >= cur.bottom - 8;
    } else if (direction === "up") {
      primary = cur.top - r.bottom;
      lateral = Math.abs(r.cx - cur.cx);
      passes = r.bottom <= cur.top + 8;
    }
    if (!passes || primary < 0) continue;
    // Weighted score: lateral offset hurts more than along-axis distance
    // so the "natural" candidate (the one straight ahead) wins.
    const score = primary + lateral * 2;
    if (score < bestScore) {
      bestScore = score;
      best = el;
    }
  }
  return best;
}

function focusElement(el) {
  if (!el) return;
  if (typeof el.focus === "function") {
    try {
      el.focus({ preventScroll: false });
    } catch {
      el.focus();
    }
  }
  el.setAttribute("data-tv-focused", "true");
  // Clear the attribute from siblings — pure focus state is also tracked
  // by :focus, the attribute is just a CSS fallback for elements that
  // can't keep focus across rerenders (focus is lost on unmount).
  document.querySelectorAll(`${FOCUSABLE_SELECTOR}[data-tv-focused="true"]`)
    .forEach((other) => {
      if (other !== el) other.removeAttribute("data-tv-focused");
    });
  // Scroll the element into view smoothly — TV viewers expect content
  // to glide rather than jump.
  if (typeof el.scrollIntoView === "function") {
    try {
      el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    } catch { /* older WebViews — skip smooth scroll */ }
  }
}

function focusFirst() {
  const first = Array.from(document.querySelectorAll(FOCUSABLE_SELECTOR))
    .find(isFocusable);
  if (first) focusElement(first);
}

const DPAD_KEYS = new Set([
  "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
  "Up", "Down", "Left", "Right",
]);

export default function useSpatialFocus({ enabled, onBack } = {}) {
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  useEffect(() => {
    if (!enabled) return undefined;
    // Make sure something is focused so the very first key press has
    // an anchor to move from. Defer one frame so the initial render's
    // .tv-focusable elements are already mounted.
    const id = requestAnimationFrame(() => {
      if (!document.activeElement || document.activeElement === document.body) {
        focusFirst();
      }
    });

    const handler = (e) => {
      // Let inputs swallow arrow keys (caret navigation, etc).
      const active = document.activeElement;
      const isEditable = active && (
        active.tagName === "INPUT" ||
        active.tagName === "TEXTAREA" ||
        active.isContentEditable
      );
      if (isEditable) return;

      if (DPAD_KEYS.has(e.key)) {
        e.preventDefault();
        const dir = e.key.replace("Arrow", "").toLowerCase();
        const next = pickNextFocus(active && active.matches?.(FOCUSABLE_SELECTOR) ? active : null, dir);
        if (next) focusElement(next);
        else if (!active || !active.matches?.(FOCUSABLE_SELECTOR)) focusFirst();
        return;
      }
      if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
        if (active && active.matches?.(FOCUSABLE_SELECTOR)) {
          e.preventDefault();
          active.click();
        }
        return;
      }
      if (e.key === "Escape" || e.key === "GoBack" || e.key === "Backspace") {
        if (typeof onBackRef.current === "function") {
          e.preventDefault();
          onBackRef.current();
        }
        return;
      }
    };
    document.addEventListener("keydown", handler);

    const focusEvt = (e) => {
      const target = e.detail?.target;
      if (target instanceof HTMLElement) focusElement(target);
      else focusFirst();
    };
    window.addEventListener("tv-focus", focusEvt);

    return () => {
      cancelAnimationFrame(id);
      document.removeEventListener("keydown", handler);
      window.removeEventListener("tv-focus", focusEvt);
    };
  }, [enabled]);
}
