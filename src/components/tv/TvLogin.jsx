import React, { useEffect, useRef, useState } from "react";
import { t } from "../../i18n";
import useSpatialFocus from "./useSpatialFocus.js";

// Minimal couch-friendly login. Phones get the full LoginView with
// passkeys, secret keys, "create account" and a slogan animation; on
// a TV we only need the two text inputs and a submit button — anything
// fancier is just more focus traps for the remote to fight.
//
// The component is intentionally dumb: it captures email/password and
// hands them to the parent's `onLogin(email, password)` exactly like
// the phone flow does. The parent (TvApp.jsx) keeps the auth wiring.

export default function TvLogin({ onLogin, allowExit, onExitTvMode }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const emailRef = useRef(null);

  useSpatialFocus({
    enabled: true,
    onBack: () => {
      if (allowExit && typeof onExitTvMode === "function") onExitTvMode();
    },
  });

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      if (emailRef.current) {
        window.dispatchEvent(new CustomEvent("tv-focus", { detail: { target: emailRef.current } }));
      }
    });
    return () => cancelAnimationFrame(id);
  }, []);

  const submit = async (e) => {
    e?.preventDefault?.();
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      await onLogin(email.trim(), password);
    } catch (err) {
      setError(err?.message || t("signInError") || "Sign-in failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="tv-screen">
      <div className="tv-login">
        <form className="tv-login__card" onSubmit={submit}>
          <div className="tv-login__title">GlassKeep TV</div>
          <div style={{ color: "#9ca3af", fontSize: 18 }}>
            {t("tvLoginHint") || "Sign in once on your TV — your notes will appear, ready to read."}
          </div>

          <div className="tv-login__row">
            <label htmlFor="tv-email" className="tv-login__label">{t("email") || "Email"}</label>
            <input
              id="tv-email"
              ref={emailRef}
              type="email"
              autoComplete="email"
              className="tv-login__input tv-focusable tv-focusable--flat"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="tv-login__row">
            <label htmlFor="tv-password" className="tv-login__label">{t("password") || "Password"}</label>
            <input
              id="tv-password"
              type="password"
              autoComplete="current-password"
              className="tv-login__input tv-focusable tv-focusable--flat"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <div className="tv-login__error">{error}</div>}

          <button
            type="submit"
            className="tv-btn tv-btn--primary tv-login__submit tv-focusable tv-focusable--flat"
            disabled={busy}
          >
            {busy ? (t("signingIn") || "Signing in…") : (t("signIn") || "Sign in")}
          </button>

          {allowExit && (
            <button
              type="button"
              className="tv-btn tv-focusable tv-focusable--flat"
              onClick={onExitTvMode}
              style={{ alignSelf: "center" }}
            >
              {t("tvExitButton") || "Use phone layout"}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
