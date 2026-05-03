// server/ai/noteRetrieval.test.js
// Run with: node server/ai/noteRetrieval.test.js
//
// No test framework — assertions are plain Node + a tiny `eq()` helper.
// Each scenario logs PASS/FAIL and the script exits non-zero on first
// failure so CI (or `npm test` if ever wired) catches regressions.
"use strict";

const r = require("./noteRetrieval");

let failures = 0;

function eq(label, actual, expected) {
  const aStr = JSON.stringify(actual);
  const eStr = JSON.stringify(expected);
  if (aStr === eStr) {
    console.log(`PASS  ${label}`);
  } else {
    failures++;
    console.log(`FAIL  ${label}`);
    console.log(`      expected: ${eStr}`);
    console.log(`      actual:   ${aStr}`);
  }
}

function assert(label, cond) {
  if (cond) console.log(`PASS  ${label}`);
  else {
    failures++;
    console.log(`FAIL  ${label}`);
  }
}

// ── Sample corpus ─────────────────────────────────────────────────────
const corpus = [
  {
    id: "1",
    title: "Wallet Bitcoin",
    content:
      "Adresse BTC: 1Abc...\nMon portefeuille principal pour le bitcoin.\nseed phrase: stockée sur clé USB chiffrée.",
    tags: ["crypto", "bitcoin"],
  },
  {
    id: "2",
    title: "Wallet Ethereum",
    content:
      "Adresse ETH: 0x...\nMetamask connecté.\nMnemonique de récupération: dans le coffre.",
    tags: ["crypto", "ethereum"],
  },
  {
    id: "3",
    title: "Liste de courses",
    content: "pain\nlait\noeufs\nfromage",
    tags: [],
  },
  {
    id: "4",
    title: "Wireguard VPN",
    content:
      "Configuration VPN avec wireguard.\nAdresse du serveur: vpn.example.com\nClé privée stockée dans /etc/wireguard.",
    tags: ["reseau", "vpn"],
  },
  {
    id: "5",
    title: "Crypto news",
    content: "Article sur les cryptomonnaies en 2025.",
    tags: ["crypto"],
  },
  {
    id: "6",
    title: "Mots de passe Gmail",
    content: "identifiant: alice@gmail.com\nmot de passe stocké dans bitwarden.",
    tags: ["password", "google"],
  },
];

// ── Variant tests ─────────────────────────────────────────────────────
console.log("\n[plural variants]");
const { expandPluralVariants, expandToken, normalize, tokenize } = r.__internals;
eq("wallets → wallet", [...expandPluralVariants("wallets")].sort(), ["wallet", "wallets"]);
eq("cryptos → crypto", [...expandPluralVariants("cryptos")].sort(), ["crypto", "cryptos"]);
eq("entries → entry", [...expandPluralVariants("entries")].sort(), ["entries", "entry"]);
eq("notes → note", [...expandPluralVariants("notes")].sort(), ["note", "notes"]);
eq("ssl unchanged", [...expandPluralVariants("ssl")], ["ssl"]);
eq("ss unchanged (no -s strip)", [...expandPluralVariants("class")], ["class"]);

console.log("\n[synonym expansion]");
assert("wallet expands with portefeuille", expandToken("wallet").has("portefeuille"));
assert("crypto expands with cryptomonnaie", expandToken("crypto").has("cryptomonnaie"));
assert("seed expands with mnemonic", expandToken("seed").has("mnemonic"));
assert("portefeuilles expands with wallet", expandToken("portefeuilles").has("wallet"));

// ── List-intent tests ─────────────────────────────────────────────────
console.log("\n[list intent]");
assert("'find my crypto'", r.detectListIntent("find my crypto wallets"));
assert("'show notes about'", r.detectListIntent("show notes about docker"));
assert("'cherche mes notes'", r.detectListIntent("cherche mes notes crypto"));
assert("'trouve mon wallet'", r.detectListIntent("trouve mon wallet"));
assert("'comment marche le X' is NOT list", !r.detectListIntent("comment marche le wallet"));

// ── Retrieval scenarios ───────────────────────────────────────────────
console.log("\n[retrieval — main case]");
{
  const picked = r.pickRelevantNotes(corpus, "je cherche mes wallets crypto");
  const ids = picked.map((p) => p.note.id);
  console.log("  picked:", ids);
  assert("wallets crypto → returns notes", picked.length > 0);
  assert("wallets crypto → includes #1 (Wallet Bitcoin)", ids.includes("1"));
  assert("wallets crypto → includes #2 (Wallet Ethereum)", ids.includes("2"));
  assert("wallets crypto → does NOT include #3 (Liste courses)", !ids.includes("3"));
  // Wallet Bitcoin and Wallet Ethereum (match wallet+crypto) should
  // outrank Crypto news (matches only crypto).
  const idx1 = ids.indexOf("1");
  const idx5 = ids.indexOf("5");
  assert("wallets+crypto notes outrank crypto-only", idx1 !== -1 && (idx5 === -1 || idx1 < idx5));
}

console.log("\n[retrieval — singular variant]");
{
  const picked = r.pickRelevantNotes(corpus, "je cherche mon wallet crypto");
  const ids = picked.map((p) => p.note.id);
  console.log("  picked:", ids);
  assert("wallet crypto → includes #1 and #2", ids.includes("1") && ids.includes("2"));
}

console.log("\n[retrieval — synonym FR → EN]");
{
  const picked = r.pickRelevantNotes(corpus, "trouve mon portefeuille bitcoin");
  const ids = picked.map((p) => p.note.id);
  console.log("  picked:", ids);
  assert("portefeuille bitcoin → finds #1", ids.includes("1"));
}

console.log("\n[retrieval — tag-only match]");
{
  const picked = r.pickRelevantNotes(corpus, "crypto");
  const ids = picked.map((p) => p.note.id);
  console.log("  picked:", ids);
  assert("crypto → finds tagged notes", ids.includes("1") && ids.includes("2") && ids.includes("5"));
}

console.log("\n[retrieval — password / mot de passe synonym]");
{
  const picked = r.pickRelevantNotes(corpus, "où est mon password gmail");
  const ids = picked.map((p) => p.note.id);
  console.log("  picked:", ids);
  assert("password gmail → finds #6", ids.includes("6"));
}

console.log("\n[retrieval — no relevant note]");
{
  const picked = r.pickRelevantNotes(corpus, "pizza recipe");
  console.log("  picked:", picked.map((p) => p.note.id));
  eq("no match → []", picked, []);
}

console.log("\n[retrieval — pure stopwords]");
{
  const picked = r.pickRelevantNotes(corpus, "que faire");
  console.log("  picked:", picked.map((p) => p.note.id));
  eq("pure stopwords → []", picked, []);
}

console.log("\n[retrieval — empty corpus]");
{
  eq("empty notes → []", r.pickRelevantNotes([], "wallet"), []);
}

console.log("\n[snippet extraction]");
{
  const picked = r.pickRelevantNotes(corpus, "wallet seed phrase");
  const note1 = picked.find((p) => p.note.id === "1");
  console.log("  #1 snippet:", note1?.snippet);
  assert("snippet includes 'seed'", note1 && /seed/i.test(note1.snippet));
}

console.log("\n[context block format]");
{
  const picked = r.pickRelevantNotes(corpus, "wallet bitcoin");
  const block = r.buildContextBlock(picked[0]);
  console.log("  block:\n" + block);
  assert("block has [id] prefix", /^\[1\]/.test(block));
  assert("block has TITLE:", /TITLE:/.test(block));
  assert("block has TAGS:", /TAGS:/.test(block));
  assert("block has MATCHED:", /MATCHED:/.test(block));
  assert("block has SNIPPET:", /SNIPPET:/.test(block));
}

console.log("\n────────────────────────────");
if (failures === 0) {
  console.log("All retrieval tests passed.");
  process.exit(0);
} else {
  console.log(`${failures} failure(s).`);
  process.exit(1);
}
