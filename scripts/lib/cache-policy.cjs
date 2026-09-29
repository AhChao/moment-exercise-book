'use strict';

// A content-hash fingerprint is a filename segment that CHANGES whenever the bytes
// change: app.9f8e7d6c.js, main-4af3b21e.css, index-By7aijtQ.js, chunk-BqX1z_9K.js.
// Such a URL is immutable by construction — a new build emits a NEW url, so the old
// one can be cached forever and never needs revalidation.
//
// The fingerprint CHARSET is bundler-specific and this is the classic porting trap:
//   * webpack `[contenthash]` default -> lowercase HEX     (app.9f8e7d6c.js)
//   * Vite / esbuild / Rollup default -> BASE64URL          (index-By7aijtQ.js)
// A hex-only test silently misses base64url names and serves them no-cache — correct
// but slow (they revalidate forever instead of going immutable). So match EITHER a hex
// run OR a >=8 url-safe run carrying hash entropy (a digit or uppercase letter); the
// entropy check keeps a plain lowercase word like `my-longname.js` OUT of the immutable
// class, because a dictionary word is not a hash. When your bundler emits every hashed
// file into a dedicated directory, prefer isInHashedDir() below — a pure path signal
// with zero false positives.
const FP_SEGMENT_RE = /[._-]([A-Za-z0-9_-]{8,})\.[a-z0-9]+$/i;

const ONE_YEAR = 60 * 60 * 24 * 365;

function isFingerprinted(pathname) {
  const m = String(pathname || '').match(FP_SEGMENT_RE);
  if (!m) return false;
  const seg = m[1];
  const isHex = /^[0-9a-f]+$/i.test(seg);
  const hasHashEntropy = /[0-9A-Z]/.test(seg); // base64url hashes carry a digit/uppercase; dictionary words don't
  return isHex || hasHashEntropy;
}

// The most robust signal when a bundler emits ALL content-hashed output under one
// directory: classify by that directory, no charset guessing (Vite: /assets/,
// Next: /_next/static/, CRA: /static/js|css/). Prefer this over the regex when it fits.
const HASHED_DIRS = ['/assets/', '/_next/static/', '/static/js/', '/static/css/', '/build/'];
function isInHashedDir(pathname) {
  const p = String(pathname || '').replace(/\\/g, '/');
  return HASHED_DIRS.some((d) => p.includes(d));
}

// Cache-Control for a STATIC asset, chosen by whether its URL is content-addressed.
//
//   fingerprinted        -> public, max-age=1y, immutable
//                           (the url changes on change, so never revalidate)
//   un-fingerprinted     -> no-cache
//   (HTML, plain js/css)    DO store it, but revalidate with the origin before every use
//
// `no-cache` is the load-bearing choice, and the two near-misses are the bugs it avoids:
//   * NOT `no-store` — that forbids caching entirely and re-downloads the full body on
//     every navigation; no-cache keeps the body and pays only a conditional round-trip.
//   * NOT a bare `max-age=N` — that serves STALE code until N expires, so a user keeps
//     running yesterday's bundle after a deploy and must hard-refresh. no-cache means a
//     normal reload always reaches fresh bytes.
function staticCacheControl(pathname) {
  return isFingerprinted(pathname)
    ? `public, max-age=${ONE_YEAR}, immutable`
    : 'no-cache';
}

// Cache-Control for a STREAMING response (SSE, long-poll): no-cache forces freshness AND
// no-transform tells intermediaries not to buffer or re-encode the stream (without it a
// proxy may hold events back or gzip mid-stream).
function streamingCacheControl() {
  return 'no-cache, no-transform';
}

// Cache-Control for a DYNAMIC response — an API result, or a file generated per request.
//
// This class is not "static assets, but fresher". The static class can afford `no-cache`
// because it has a validator: the body is stored, a conditional round-trip confirms it,
// and an unchanged asset transfers zero bytes. A dynamic response typically has NO
// validator, so `no-cache` degrades to a full 200 every time — it pays the whole cost of
// `no-store` while still leaving a copy on disk. Once the saving is gone, the remaining
// difference is all downside: the body is per-user (another person on the same machine,
// or an edge keying by URL, can be served someone else's answer) and it can be handed
// back after the code that produced it was replaced.
//
// So the class is `no-store`, and — this is the part that is easy to get wrong — it must
// be applied to the WHOLE dynamic surface, not to the endpoints someone remembered. A
// response with no Cache-Control at all is not "uncached": browsers apply heuristic
// freshness and edges apply their own extension rules. Absence is a policy, just not
// yours.
function apiCacheControl() {
  return 'no-store, must-revalidate';
}

// An edge's "cacheable extensions" list matches on the URL PATH, and does not care that
// the path is served by application code. So a download endpoint whose URL ends in a
// document extension — /api/report/2026-08/export.xlsx — is indistinguishable from a
// static file to the edge, and gets cached by URL like one. The generated-per-request
// endpoints most likely to end in an extension are exactly the ones whose staleness is
// worst: the user keeps the file, forwards it, reconciles against it.
//
// Real vendor lists are much wider than the visual-asset subset people picture; document
// and archive types are on them.
const EDGE_CACHEABLE_EXT = [
  '.js', '.css', '.jpg', '.jpeg', '.png', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf',
  '.pdf', '.csv', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.zip', '.7z', '.gz',
];

function looksStaticToAnEdge(pathname, extensions = EDGE_CACHEABLE_EXT) {
  const path = String(pathname || '').split('?')[0].toLowerCase();
  const i = path.lastIndexOf('.');
  return i >= 0 && extensions.includes(path.slice(i));
}

module.exports = {
  isFingerprinted, isInHashedDir, staticCacheControl, streamingCacheControl,
  apiCacheControl, looksStaticToAnEdge, EDGE_CACHEABLE_EXT, ONE_YEAR,
};
