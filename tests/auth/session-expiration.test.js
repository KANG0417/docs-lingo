const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const sourcePath = path.join(
  __dirname,
  "..",
  "..",
  "src",
  "lib",
  "auth",
  "session-expiration.ts",
);
const source = fs.readFileSync(sourcePath, "utf8");
const compiled = source
  .replace(/interface ResolveSessionExpiresAtParams \{[\s\S]*?\}\n\n/, "")
  .replace(/export const /g, "const ")
  .replace(
    /\(\s*baseTimeMs: number = Date\.now\(\),\s*\): number =>/,
    "(baseTimeMs = Date.now()) =>",
  )
  .replace(
    /\(\s*epochSeconds: number,\s*\): number =>/,
    "(epochSeconds) =>",
  )
  .replace(
    /\(\s*expiresAt: number \| undefined,\s*nowSeconds: number = Math\.floor\(Date\.now\(\) \/ MILLISECONDS_PER_SECOND\),\s*\): boolean =>/,
    "(expiresAt, nowSeconds = Math.floor(Date.now() / MILLISECONDS_PER_SECOND)) =>",
  )
  .replace(
    /\}: ResolveSessionExpiresAtParams\): number =>/,
    "}) =>",
  )
  .concat(`
exports.getNextKoreanMidnightEpochSeconds = getNextKoreanMidnightEpochSeconds;
exports.getNextKoreanMidnightFromEpochSeconds = getNextKoreanMidnightFromEpochSeconds;
exports.isSessionExpiredAt = isSessionExpiredAt;
exports.resolveSessionExpiresAt = resolveSessionExpiresAt;
`);

const context = {
  exports: {},
  require,
};
vm.runInNewContext(compiled, context, { filename: sourcePath });

const {
  getNextKoreanMidnightEpochSeconds,
  getNextKoreanMidnightFromEpochSeconds,
  isSessionExpiredAt,
  resolveSessionExpiresAt,
} = context.exports;

const toSeconds = (isoString) => Math.floor(Date.parse(isoString) / 1000);

const cases = [
  {
    name: "login at KST midnight expires at next KST midnight",
    input: "2026-06-17T15:00:00.000Z",
    expected: "2026-06-18T15:00:00.000Z",
  },
  {
    name: "login before KST midnight expires at coming KST midnight",
    input: "2026-06-18T14:59:59.000Z",
    expected: "2026-06-18T15:00:00.000Z",
  },
  {
    name: "login after KST midnight expires at next day KST midnight",
    input: "2026-06-18T15:00:01.000Z",
    expected: "2026-06-19T15:00:00.000Z",
  },
];

for (const testCase of cases) {
  assert.equal(
    getNextKoreanMidnightEpochSeconds(Date.parse(testCase.input)),
    toSeconds(testCase.expected),
    testCase.name,
  );
}

assert.equal(
  getNextKoreanMidnightFromEpochSeconds(toSeconds("2026-06-18T14:59:59.000Z")),
  toSeconds("2026-06-18T15:00:00.000Z"),
  "epoch seconds input resolves to the same KST midnight",
);

const expiresAt = toSeconds("2026-06-18T15:00:00.000Z");
assert.equal(
  isSessionExpiredAt(expiresAt, expiresAt - 1),
  false,
  "session is active before expiresAt",
);
assert.equal(
  isSessionExpiredAt(expiresAt, expiresAt),
  true,
  "session expires exactly at expiresAt",
);
assert.equal(
  isSessionExpiredAt(undefined, expiresAt),
  false,
  "missing custom expiry does not expire by itself",
);

assert.equal(
  resolveSessionExpiresAt({
    issuedAt: toSeconds("2026-06-18T14:59:59.000Z"),
    existingExpiresAt: toSeconds("2026-06-19T14:59:59.000Z"),
    nowMs: Date.parse("2026-06-18T14:59:59.000Z"),
  }),
  toSeconds("2026-06-18T15:00:00.000Z"),
  "legacy 24-hour token is reduced to the issued date's next KST midnight",
);

assert.equal(
  resolveSessionExpiresAt({
    issuedAt: toSeconds("2026-06-18T10:00:00.000Z"),
    existingExpiresAt: toSeconds("2026-06-18T11:00:00.000Z"),
    nowMs: Date.parse("2026-06-18T10:00:30.000Z"),
  }),
  toSeconds("2026-06-18T11:00:00.000Z"),
  "an earlier existing expiry is preserved",
);

assert.equal(
  resolveSessionExpiresAt({
    nowMs: Date.parse("2026-06-18T10:00:30.000Z"),
  }),
  toSeconds("2026-06-18T15:00:00.000Z"),
  "missing issuedAt resolves from the current time to the next KST midnight",
);

assert.equal(
  resolveSessionExpiresAt({
    issuedAt: toSeconds("2026-06-18T00:00:00.000Z"),
    maxAgeSeconds: 12 * 60 * 60,
  }),
  toSeconds("2026-06-18T12:00:00.000Z"),
  "optional 12-hour cap can expire before KST midnight",
);

assert.equal(
  resolveSessionExpiresAt({
    issuedAt: toSeconds("2026-06-18T14:00:00.000Z"),
    maxAgeSeconds: 12 * 60 * 60,
  }),
  toSeconds("2026-06-18T15:00:00.000Z"),
  "KST midnight still wins when it comes before the optional 12-hour cap",
);

console.log("session-expiration tests passed");
