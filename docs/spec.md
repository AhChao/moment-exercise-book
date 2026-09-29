# Moment Exercise Book: build spec

Local-first PWA: a photography practice notebook. Vue 3 + Vite + TypeScript, hash routing, no backend.
Target device: Pixel 10, Chrome 153 (Android). Everything below marked MEASURED comes from probes run on that phone.

## Non-negotiables

- File size discipline: one feature = one module folder; no file over ~250 lines; new logic goes in a new file, never appended to a large one.
- No emoji anywhere (UI, docs, tests). Icons are inline SVG in `src/ui/icons.ts` rendered by `src/ui/Icon.vue`.
- No native `alert()` / `confirm()` / `prompt()`. Use `confirmDialog` and `toast` from `src/ui/`.
- Every user-visible string lives in `src/copy/` (one file per area) and follows `docs/glossary.md`. Views import strings; they never inline Chinese text. Copy register: declarative, no commands, no chat tone, no second person, no development-progress wording, no implementation vocabulary (EXIF, blob, IndexedDB, session, stream, verify, retry...).
- Colours, fonts, radii, stroke widths come only from CSS variables in `src/styles/tokens.css`. No hex values in components.
- Domain types come from `src/types.ts`; the camera contract is `src/camera/types.ts`; the library contract is `src/store/types.ts`. Do not redeclare or widen them; if a contract seems wrong, stop and report instead of editing it.
- Tests: vitest, node environment, files named `*.test.ts` next to the code. Pure logic must be tested; browser-only glue (MediaStream, canvas) is kept thin and isolated so the logic around it is testable with fakes.

## Measured camera facts (Pixel 10, Chrome 153)

- Capabilities exposed by the track: zoom 1..20 (step 0.1), iso 30..7518, exposureTime 0.57..160000 in units of 100 microseconds (so seconds = units / 10000), exposureCompensation -4..4 (step 1/6), colorTemperature 2850..7000 (step 50, the phone quantises: asked 3000 gave 2950, 4500 gave 4600), focusDistance 0.05..3.77 metres (cannot reach infinity), torch, exposureMode [continuous, manual], focusMode [manual, single-shot, continuous], whiteBalanceMode [continuous, manual]. Zoom below 1 is rejected (no ultrawide in-app). At zoom >= 5 the phone switches to the telephoto lens (EXIF FocalLength 14.2 mm, f/3.05).
- `ImageCapture.takePhoto()` returns a full 3000x4000 JPEG (~2-3 MB) with real EXIF (ISO, ExposureTime, FNumber, FocalLength, WhiteBalance 0/1). It has NO ExposureBias, LensModel or FocalLengthIn35mm tag. Max resolution equals default.
- Photos from the phone's gallery picker carry full EXIF including ExposureBias, LensModel, FocalLengthIn35mm and GPS. `<input capture>` photos are NOT saved in the gallery and carry reduced EXIF: never use `capture`; the import path is the picker only.
- In auto exposure `track.getSettings()` values are unreliable; EXIF is the only truth. Compensation, focus and white balance are not in EXIF: record the applied values from the track.
- MANUAL EXPOSURE RELIABILITY (critical): changing iso/exposureTime on a live stream in separate applyConstraints calls leaves takePhoto stuck at the first value. What works: (1) apply `{ exposureMode: 'continuous' }`, wait 600 ms, (2) apply `{ exposureMode: 'manual', iso, exposureTime }` in ONE call, (3) wait 1500 ms, (4) takePhoto, (5) read EXIF back and require iso within 5% and exposureTime within 5% of the request; on mismatch or `UnknownError: platform error` close and reopen the stream and retry, up to 3 attempts total. Each shot costs about 3 s; a 1 s exposure about 8 s.
- The live preview tracks manual exposure (preview luma within 1.5 of the photo's), so what the learner sees while adjusting is what gets shot.
- White balance manual works but colour vs Kelvin was not monotonic across runs: never promise a colour for a K value. First apply after opening can be ignored by the phone; the reliable way is to apply and read back `getSettings().colorTemperature`, retry once.
- Canvas 2D handles a 12 MP photo in about 0.26 s processing + 0.12 s JPEG encode; WebGL is slower for one-shot work. Develop (shadows/highlights/exposure/warmth) is a Canvas 2D pipeline: interactive preview on a ~1024 px copy, full-size render only on export.
- IndexedDB: 30 x 3 MB written in ~1 s, read in ~40 ms, quota ~10 GB. `navigator.storage.persist()` is granted when the app is installed to the home screen.
- Selfie camera exposes zoom only.

## Modules and ownership (each line owns its folder; do not touch others)

| Folder | Owner line | Responsibility |
|---|---|---|
| `src/lib/` (exif, lens) | host (done) | shared, read-only for everyone |
| `src/camera/` (except types.ts) | A | capabilities normalisation, session, verified capture |
| `src/store/` (except types.ts), `src/backup/` | B | IndexedDB, reactive library facade, photo import, ZIP backup |
| `src/develop/`, `src/judge/`, `src/exercise/` | D | develop math + canvas render, check judging, shot planning |
| `src/ui/`, `src/copy/`, `src/styles/`, `src/App.vue`, `src/router.ts`, `src/main.ts`, `src/views/` | C1 / C2 | UI |
| `src/content/` | host | content loader |

## Pure-logic contracts

### D: judge (`src/judge/judge.ts`)
`judgeExercise(exercise: Exercise, photos: (PhotoMeta | null)[]): CheckResult[]` returns one result per `exercise.checks` entry. Field mapping: `iso` -> photo.exif.iso; `shutterSec` -> exif.exposureTime; `focalLength35` -> exif.focalLength35; `lens` -> photo.lens. Missing photo or missing value -> `unknown` (never `fail`). `==` on numbers uses 3% relative tolerance for `shutterSec`, exact integer for `iso` within 5%; `between` inclusive. `actual` is formatted for display: ISO as `ISO 200`, shutter as `1/125` or `0.5 s` or `2 s`.

### D: shot planning (`src/exercise/shotPlan.ts`)
`planShot(shot: Shot, caps: Capabilities): ShotPlan` decides how a slot can be filled:
- `mode: 'camera'` when the app can shoot it, else `'import'`.
- `zoom === 0.5` -> import (reason `ultrawide`). `zoom > caps.zoom.max` or below min (other than 0.5) -> import.
- prescribed shutterSec/iso but `!caps.canManualExposure` -> import (reason `exposure`). Prescribed wbKelvin without `canManualWB` -> import (reason `whiteBalance`). Prescribed focusMeters without `canManualFocus` -> import (reason `focus`). Prescribed ev without `caps.ev` -> import (reason `compensation`).
- Also returns `spec: CaptureSpec` clamped to the phone's ranges (`clampSpec`) and `notes: PlanReason[]`. When `caps.available` is false, mode is `import`.
- Export `clampSpec(spec, caps)` and the `ShotPlan` / `PlanReason` types.

### D: develop (`src/develop/`)
- `apply.ts`: `applyDevelop(data: Uint8ClampedArray, dev: DevelopSpec): void` in place. Each slider -100..100, 0 is identity (exact: an all-zero spec must leave every byte unchanged). Shadows lifts/darkens dark tones with weight `(1 - luma)^2`; highlights the mirror with weight `luma^2` (positive = recover/darken bright areas? define: positive highlights brightens bright areas, negative recovers them; document in a comment); exposure is a multiplicative gain of `2^(exposure/100 * 1.5)` in linear-ish 0..1; warmth shifts red up and blue down proportionally (positive = warmer). Clamp to 0..255. Monotonic: increasing a slider never darkens (shadows, highlights, exposure) at any pixel.
- `render.ts`: `renderDeveloped(source: Blob, dev: DevelopSpec, opts?: { maxEdge?: number; quality?: number }): Promise<Blob>` (OffscreenCanvas + createImageBitmap + convertToBlob JPEG, default quality 0.92; if dev is identity and no maxEdge return the source blob untouched) and `drawDevelopedPreview(canvas: HTMLCanvasElement, bitmap: ImageBitmap, dev: DevelopSpec, maxEdge = 1024): void`.
- Tests cover the pure `applyDevelop` only (identity, monotonicity, clamping, warmth channel directions, shadows affects darks more than brights).

## Store contract notes for B
- Database name `meb`, version 1. Object stores: `photoMeta` (key `id`, value PhotoMeta), `photoBlob` (key `id`, value `{ original: Blob, thumb: Blob }`), `attempts` (key `exerciseId`), `kv` (small settings). Keep blobs out of `photoMeta` so listing is cheap.
- `addPhoto` computes the thumbnail (480 px long edge, JPEG 0.8) with `createImageBitmap` + `OffscreenCanvas`, and generates the id with `crypto.randomUUID()`.
- `useLibrary()` returns a module-level singleton whose reactive refs are filled by an async `load()` at first call.
- `importPhotoFile(file: File): Promise<NewPhoto>` (`src/store/importFile.ts`): reads bytes, `parseExifBytes`, `stripGps` (store the stripped bytes, never the original), `detectLens(exif)`, dimensions via `createImageBitmap(blob)` (browser applies orientation), applied = {} , source `import`. Rejects with `Error('not-an-image')` for non-JPEG/PNG/WebP/HEIC that cannot decode; PNG/WebP without EXIF are accepted with `exif: { hasExif: false, hasGps: false }`.
- Camera photos also pass through `stripGps` (defence in depth; in-app photos have no GPS).
- Backup (`src/backup/`): `exportBackup(opts?: { onProgress?: (done: number, total: number) => void }): Promise<Blob>` produces a ZIP (fflate, store-only for JPEGs) with `manifest.json` `{ app: 'moment-exercise-book', version: 1, exportedAt, photos: PhotoMeta[], attempts: Attempt[] }` and `photos/<id>.jpg` originals. `importBackup(file: File, mode: ImportMode): Promise<BackupSummary>`: validates manifest strictly (unknown app/version -> `Error('invalid-backup')`), `merge` keeps existing ids and adds missing ones (attempt with newer `updatedAt` wins), `replace` clears first (the caller confirms with the user before calling). All GPS is stripped again on import. Never trust filenames inside the ZIP for paths.

## Camera engine notes for A
- `src/camera/session.ts` exports `openCamera(): Promise<CameraSession>` (getUserMedia `{ facingMode: { ideal: 'environment' }, width: { ideal: 4000 }, height: { ideal: 3000 } }`, denied -> `CameraError('denied')`, no device -> `'unavailable'`, no `ImageCapture` -> `'unsupported'`).
- `src/camera/capabilities.ts`: `normalizeCapabilities(raw: MediaTrackCapabilities, label?: string): Capabilities` (pure, tested with the Pixel 10 capability object below), converting exposureTime units to seconds. `canManualExposure` requires iso + exposureTime + exposureMode containing `manual`.
- `src/camera/constraints.ts` (pure): `toTrackConstraint(spec, caps)` builds the advanced constraint objects; `specToPreviewConstraints`; unit conversion helpers `secToUnits`, `unitsToSec`.
- `src/camera/verify.ts` (pure): `compareToRequest(requested: CaptureSpec, exif: ExifInfo): { ok: boolean; mismatch?: string }` with the 5% rule (only for prescribed shutterSec / iso; when only ev/wb/zoom/focus are prescribed, ok is true).
- `src/camera/capture.ts`: the verified sequence with an injectable clock/sleep and an injectable "device" object so the retry logic is unit-tested with a fake device (mismatch twice then success -> attempts 3; platform error then success; three failures -> verified false with the last blob). No real timers in tests.
- Pixel 10 raw capability object for tests (shape as `track.getCapabilities()` returns): `{"colorTemperature":{"max":7000,"min":2850,"step":50},"exposureCompensation":{"max":4,"min":-4,"step":0.1666666716337204},"exposureMode":["continuous","manual"],"exposureTime":{"max":160000.02085,"min":0.56968,"step":0.1},"facingMode":["environment"],"focusDistance":{"max":3.772224187850952,"min":0.05000000074505806,"step":0.009999999776482582},"focusMode":["manual","single-shot","continuous"],"iso":{"max":7518,"min":30,"step":1},"torch":true,"whiteBalanceMode":["continuous","manual"],"zoom":{"max":20,"min":1,"step":0.1}}`.
- `AppliedSettings` in the result: shutterSec/iso from EXIF when present (truth), else from the track; ev / wbKelvin / zoom / focusMeters from `track.getSettings()` after applying.

## Look and feel (for UI lines)
Vintage film + printed book + hand-drawn coloured pencil. One theme only (no dark mode). Paper cream page, dark brown ink, pencil accents. Everything visual is a token in `src/styles/tokens.css` so the palette can be swapped by editing that one file. Layout is a single column, max width 30rem, centred, with a bottom tab bar (notebook, album, settings) drawn like book bookmarks. Photos sit in film-strip frames or taped polaroid-style frames. See the primitives in `src/styles/paper.css` (`.mx-page`, `.mx-card`, `.mx-btn`, `.mx-chip`, `.mx-rule`, `.mx-strip`, `.mx-stamp`, `.mx-input`, `.mx-tabbar`) and reuse them instead of inventing new ones.

## Exposure intent (added 2026-09-29)
A shot that prescribes exactly ONE of shutterSec / iso may carry `exposureStops`: brightness in stops relative to a properly exposed picture of the same scene (0 = normal, -2 two darker, +2 two brighter). The app meters the live preview to mid-grey (mean luma about 116), then scales the free variable by 2^stops (one stop = doubling of ISO or shutter time) and reports the stops actually delivered when a range limit is hit. This makes exposure meaningful and calculable for any light. Shots that prescribe both values are "absolute" and unmetered; use them only where the exact pair is the lesson. Rule for content: never invent an ISO/shutter pair without computing what it does in the described scene.
