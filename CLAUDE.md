# Moment Exercise Book

Local-first PWA: a photography practice notebook for a phone (Pixel 10, Chrome). Vue 3, Vite, TypeScript, hash routing, no backend.

## Read before changing anything
- docs/spec.md: architecture, module ownership, and the measured camera facts every design rests on.
- docs/ui-spec.md: routes and screens. docs/glossary.md: the only allowed UI vocabulary.
- content/README.md: where the exercises came from. probe/ is the throwaway device probe that produced the measurements; it is not shipped.

## Rules that are easy to break
- Contracts live in src/types.ts, src/camera/types.ts, src/store/types.ts. Extend them deliberately; never fork a second copy of a shape.
- Manual exposure must go through src/camera/capture.ts (auto -> wait -> one manual call -> wait -> shoot -> verify with EXIF -> reopen and retry). Changing shutter or ISO on a live stream in separate calls leaves takePhoto stuck at the first value.
- EXIF is the only trustworthy readback. In auto exposure `track.getSettings()` is wrong; compensation, focus and white balance are not in EXIF and are recorded from the track.
- Photos are stored untouched; GPS is stripped (src/lib/exif.ts `stripGps`) before anything is stored or exported. Adjustments (shadows, highlights, exposure, warmth) are parameters applied on view/export, never baked into the stored original.
- Every user-visible string lives in src/copy/ and follows docs/glossary.md and the copy register (declarative, no commands, no chat, no second person, no development-progress wording, no implementation terms). No emoji anywhere; icons are inline SVG.
- Colours, fonts and stroke come only from src/styles/tokens.css. The look can be swapped by editing that one file.
- A new feature is a new module folder; keep files under about 250 lines.

## Commands
- `npm run dev` (Vite, LAN), `npm run typecheck`, `npm test`, `npm run validate:content`
- `npm run build && npm run serve` serves dist/ with the cache policy (hashed assets immutable, everything else revalidates). sw.js is stamped with a content hash at build time (vite.config.ts).
- Phone testing: `npm run build && npm run serve`, then `ngrok http 8080`, open the https URL in Chrome on the phone (camera needs a secure origin).
- `node scripts/make-icons.mjs` regenerates the PWA icons.
