// server/encryption/challengeStore.js
// In-memory, single-use, TTL-bounded WebAuthn challenge store.
//
// Why in-memory: challenges are short-lived (5 min) and only need to
// survive a single ceremony round-trip from the client back to the
// same Node process. Persisting to SQLite would just mean the same
// 5-minute window plus disk noise.
//
// Why scoped: each entry carries a {kind, userId, challenge} tuple so
// a challenge issued for "register a passkey for user A" can't be
// replayed against "unlock the instance" — the kind acts as a typed
// purpose tag the verify endpoints check before consuming the token.

const crypto = require("crypto");

const TTL_MS = 5 * 60 * 1000;
const MAX_ENTRIES = 1024;

const store = new Map(); // id -> { challenge, kind, userId, meta, expiresAt }

function _gc() {
  const now = Date.now();
  for (const [k, v] of store) {
    if (v.expiresAt <= now) store.delete(k);
  }
  // Hard cap so a misbehaving client can't blow memory.
  if (store.size > MAX_ENTRIES) {
    const overflow = store.size - MAX_ENTRIES;
    let i = 0;
    for (const k of store.keys()) {
      if (i++ >= overflow) break;
      store.delete(k);
    }
  }
}

function issue({ challenge, kind, userId = null, meta = null }) {
  _gc();
  const id = crypto.randomBytes(18).toString("base64url");
  store.set(id, {
    challenge,
    kind,
    userId,
    meta,
    expiresAt: Date.now() + TTL_MS,
  });
  return id;
}

// Single-use take: consumes the entry whether or not it matches the
// expected kind. Caller is expected to verify entry.kind === expected.
function consume(id) {
  if (!id || typeof id !== "string") return null;
  _gc();
  const entry = store.get(id);
  if (!entry) return null;
  store.delete(id);
  if (entry.expiresAt <= Date.now()) return null;
  return entry;
}

module.exports = { issue, consume, TTL_MS };
