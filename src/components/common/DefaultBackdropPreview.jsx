import React from "react";

// A few representative floating cards — a subset of the real login/app
// backdrop. Positioned across a virtual canvas that gets scaled down so
// several small cards fit inside a preview box.
const PREVIEW_CARDS = [
  { rot: "-12deg", dur: "7s", delay: "0s", top: "6%", left: "5%", c: "99,102,241" },
  { rot: "6deg", dur: "9s", delay: "-2s", top: "10%", left: "62%", c: "168,85,247" },
  { rot: "8deg", dur: "8s", delay: "-4s", top: "55%", left: "8%", c: "16,185,129" },
  { rot: "-8deg", dur: "10s", delay: "-1s", top: "52%", left: "66%", c: "245,158,11" },
  { rot: "10deg", dur: "8.5s", delay: "-3s", top: "30%", left: "34%", c: "236,72,153" },
  { rot: "-6deg", dur: "9.5s", delay: "-6s", top: "74%", left: "40%", c: "14,165,233" },
];

// Mirror of the default backdrop (body gradient in light / solid dark)
// with the colored floating cards, scaled to fit a small preview box.
// Shown on a background-image setting when no custom image is configured,
// so the admin / user sees exactly what "no image" looks like. The
// .login-deco-card CSS already flips opacity/colors for dark mode, so
// this adapts to the active theme.
export default function DefaultBackdropPreview({ dark }) {
  const bg = dark
    ? "#1a1a1a"
    : "linear-gradient(135deg, #f0e8ff 0%, #e8f4fd 50%, #fde8f0 100%)";
  return (
    <div className="absolute inset-0" style={{ background: bg, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "278%",
          height: "278%",
          transform: "scale(0.36)",
          transformOrigin: "top left",
        }}
      >
        {PREVIEW_CARDS.map((k, i) => (
          <div
            key={i}
            className="login-deco-card"
            style={{ "--rot": k.rot, "--dur": k.dur, "--delay": k.delay, top: k.top, left: k.left, borderTop: `3px solid rgba(${k.c},0.7)` }}
          >
            <div className="deco-title" style={{ background: `rgba(${k.c},0.5)` }} />
            <div className="deco-line" style={{ width: "85%" }} />
            <div className="deco-line" style={{ width: "60%" }} />
          </div>
        ))}
      </div>
    </div>
  );
}
