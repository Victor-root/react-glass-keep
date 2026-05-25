import React from "react";

// Per-user custom app background — a fixed, full-screen image behind the
// whole app (replaces the decorative floating cards when set). Sits at
// the same z-1 layer the floating-cards backdrop uses, with an
// overscanned blur layer (so the blur's faded edges fall off-screen) and
// a theme-aware scrim so the glass UI on top stays legible over any
// image. Rendered only inside the logged-in app, never on the login page.
export default function AppBackground({ image, blur = 0, dark }) {
  if (!image) return null;
  return (
    <div
      aria-hidden="true"
      className="app-custom-bg"
      style={{ position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none", overflow: "hidden" }}
    >
      <div
        style={{
          position: "absolute",
          inset: blur > 0 ? `-${blur * 2}px` : 0,
          backgroundImage: `url(${image})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: blur > 0 ? `blur(${blur}px)` : "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: dark ? "rgba(26,26,26,0.6)" : "rgba(240,232,255,0.55)",
        }}
      />
    </div>
  );
}
