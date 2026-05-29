// TEMPORARY debug overlay — diagnoses why the installed-PWA Android nav bar
// isn't picking up the theme colour. Shows the environment values that
// browsers use to tint the system bars. Remove once we've figured it out.
//
// On by default; tap "Masquer" to hide for the session (sets gk:navdebug=0).
import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";

function readEnvInset(probeRef) {
  const el = probeRef.current;
  if (!el) return "n/a";
  const h = getComputedStyle(el).height;
  return h || "n/a";
}

export default function NavbarDebug() {
  const [hidden, setHidden] = useState(
    () => {
      try { return localStorage.getItem("gk:navdebug") === "0"; } catch { return false; }
    },
  );
  const [text, setText] = useState("collecting…");
  const [copied, setCopied] = useState(false);
  const probeRef = useRef(null);

  useEffect(() => {
    if (hidden) return undefined;
    const collect = () => {
      const mm = (q) => {
        try { return window.matchMedia(q).matches; } catch { return "err"; }
      };
      const cs = getComputedStyle(document.documentElement);
      const bodyCs = getComputedStyle(document.body);
      let afterBg = "n/a", afterH = "n/a";
      try {
        const a = getComputedStyle(document.body, "::after");
        afterBg = a.backgroundColor; afterH = a.height;
      } catch (_) {}
      const meta = document.querySelector('meta[name="theme-color"]');
      const vv = window.visualViewport;
      const lines = {
        ua: navigator.userAgent,
        brave: !!(navigator.brave),
        "dm:standalone": mm("(display-mode: standalone)"),
        "dm:fullscreen": mm("(display-mode: fullscreen)"),
        "dm:minimal-ui": mm("(display-mode: minimal-ui)"),
        "dm:browser": mm("(display-mode: browser)"),
        "dm:window-controls-overlay": mm("(display-mode: window-controls-overlay)"),
        "pointer:coarse": mm("(pointer: coarse)"),
        "--gk-statusbar": cs.getPropertyValue("--gk-statusbar").trim(),
        "--gk-app-bg": cs.getPropertyValue("--gk-app-bg").trim(),
        "html.classes": document.documentElement.className || "(none)",
        "body.bgColor": bodyCs.backgroundColor,
        "body.bgImage": bodyCs.backgroundImage.slice(0, 40) + (bodyCs.backgroundImage.length > 40 ? "…" : ""),
        "body::after.bg": afterBg,
        "body::after.height": afterH,
        "env(safe-bottom)probe": readEnvInset(probeRef),
        "themeColorMeta": meta ? meta.getAttribute("content") : "(none)",
        "innerH": window.innerHeight,
        "outerH": window.outerHeight,
        "docClientH": document.documentElement.clientHeight,
        "screenH": window.screen?.height,
        "vv.height": vv ? Math.round(vv.height) : "n/a",
        "vv.offsetTop": vv ? Math.round(vv.offsetTop) : "n/a",
        "dpr": window.devicePixelRatio,
      };
      setText(
        Object.entries(lines)
          .map(([k, v]) => `${k}: ${v}`)
          .join("\n"),
      );
    };
    collect();
    const id = setInterval(collect, 1000);
    window.addEventListener("resize", collect);
    return () => { clearInterval(id); window.removeEventListener("resize", collect); };
  }, [hidden]);

  if (hidden) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (_) {
      // Fallback: select the <pre> so the user can long-press copy.
      const pre = document.getElementById("gk-navdebug-pre");
      if (pre) {
        const r = document.createRange();
        r.selectNodeContents(pre);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(r);
      }
    }
  };

  return createPortal(
    <div
      style={{
        position: "fixed",
        left: 8,
        right: 8,
        bottom: "calc(env(safe-area-inset-bottom) + 8px)",
        zIndex: 2147483647,
        background: "rgba(0,0,0,0.88)",
        color: "#e5e7eb",
        border: "1px solid #444",
        borderRadius: 10,
        padding: 10,
        font: "11px/1.35 ui-monospace, monospace",
        maxHeight: "45vh",
        overflow: "auto",
        boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
      }}
    >
      <div style={{ height: "env(safe-area-inset-bottom)", width: 0, position: "absolute" }} ref={probeRef} />
      <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
        <strong style={{ color: "#93c5fd", flex: 1 }}>NAVBAR DEBUG</strong>
        <button onClick={copy} style={{ background: "#2563eb", color: "#fff", border: 0, borderRadius: 6, padding: "3px 8px" }}>
          {copied ? "Copié ✓" : "Copier"}
        </button>
        <button
          onClick={() => { try { localStorage.setItem("gk:navdebug", "0"); } catch (_) {} setHidden(true); }}
          style={{ background: "#444", color: "#fff", border: 0, borderRadius: 6, padding: "3px 8px" }}
        >
          Masquer
        </button>
      </div>
      <pre id="gk-navdebug-pre" style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", userSelect: "text" }}>
        {text}
      </pre>
    </div>,
    document.body,
  );
}
