# UI spec

Read `docs/spec.md` and `docs/glossary.md` first. This file defines screens, routes and behaviour.

## Routes (vue-router, hash history, all lazy-loaded)

| Path | Name | View | Tab bar |
|---|---|---|---|
| `/` | home | HomeView | yes |
| `/chapter/:chapterId` | chapter | ChapterView | yes |
| `/exercise/:exerciseId` | exercise | ExerciseView | yes |
| `/exercise/:exerciseId/shoot/:shot` | shoot | CaptureView | no (full screen) |
| `/album` | album | AlbumView | yes |
| `/photo/:photoId` | photo | PhotoView | no (has its own back bar) |
| `/settings` | settings | SettingsView | yes |

Unknown chapter / exercise / photo ids show an empty-state page with a link home, never a blank screen or a thrown error. Tab bar entries: notebook (`/`, also active on chapter and exercise routes), album (`/album`), settings (`/settings`). Tab labels: 練習本, 相簿, 設定.

## View state that must survive reload
Use the collection utilities (copied into `src/lib/route-query/` and `src/lib/scroll-memory/`): `useRouteQuery` for the album filter (`?lens=`, `?chapter=`) and the selected shot in ExerciseView (`?shot=`); `useScrollMemory` once in App.vue. Ephemeral state (open dialogs, slider drag) is not persisted.

## Shared UI kit (`src/ui/`, owner C1)
Adapted from the collection entries `modal-shell`, `confirm-modal`, `toast-stack` (read their README and source under /Users/stevenchao/Documents/Repos/stv-prefer-ui-template/components/ before writing; keep their interaction contracts: Teleport to body, focus trap, safe-default focus for danger, promise API, toast callable from any module, refcounted scroll lock, z-layer order modal < popover < busy < toast). Convert to TypeScript, keep the class names free of the `ui-` collision by using the `mx-` prefix for new styles, style only through tokens. Provide: `ModalShell.vue` (slot header/body/footer, size sm|md|lg, veto-able dismiss), `ConfirmModal.vue` + `useConfirm.ts` (`confirmDialog({ title, message, confirmText, cancelText, danger })`), `ToastStack.vue` + `useToast.ts` (`toast.success/info/warning/error`), `Icon.vue` (`<Icon name="camera" />`, 1em, currentColor), `icons.ts` (hand-drawn stroke icons, viewBox 0 0 24 24, stroke 1.8, round caps, no fills except where noted; a Record<IconName, string> of inner SVG markup): book, album, gear, camera, chevron-left, chevron-right, close, check, plus, trash, pencil, download, upload, sun, timer, grain (ISO), thermo, focus, zoom, flash, info, layers, refresh, film, lock, home. Draw them; keep them simple and consistent; SVG only, never emoji.

## Screens

### HomeView (C1)
Cover-like header: product name in large hand font ("Moment Exercise Book"), one-line subtitle, a small film-frame ornament drawn with the `.mx-strip` primitive. Below: a "continue" card pointing at the first exercise not completed (title, chapter, progress fraction) that links to the exercise; if everything is complete a completion card. Then the table of contents: one card per chapter (order number in mono, title, blurb, `x / y 題` progress bar via `.mx-pencilbar`). Progress = attempts with `completedAt != null` per chapter. Loading state until `library.loaded`.

### ChapterView (C1)
Back link to the notebook, chapter title and blurb, list of exercises (title, level as 1-3 filled pencil dots, needs as small chips only for `ultrawide`/`tele`/`night`, a stamp `完成` when completed, thumbnail strip of the assigned photos when any). Each row links to the exercise.

### AlbumView (C1)
Filter chips: 全部 and per lens (主鏡頭, 超廣角, 長焦, 前鏡頭) via `?lens=`. Grid of thumbnails (3 columns) in film-strip styling, newest first, each linking to `/photo/:id`. Empty state: 相簿目前沒有照片, with a link to the notebook. Thumbnails load lazily through `library.photoUrl(id, 'thumb')`.

### SettingsView (C1)
Sections drawn as cards:
1. 儲存空間: usage bar (`usage / quota`, human units), persistence status (已受保護 / 尚未受保護) with a 保護資料 button calling `requestPersist()`; when the install prompt is available (`beforeinstallprompt` captured in a small `src/ui/useInstall.ts`) an 加入主畫面 button.
2. 備份: 匯出備份 (calls `exportBackup`, shows determinate progress, downloads `moment-exercise-book-YYYYMMDD.zip`), 匯入備份 (file input `.zip`; before importing ask which mode with the confirm dialog: 合併 / 取代; 取代 uses `danger`; on success toast the counts).
3. 這支手機的相機: opens the camera once on demand ("檢查相機" button) and lists which controls exist (快門, ISO, 曝光補償, 白平衡, 對焦距離, 倍率範圍) using `openCamera().capabilities`, then closes it. Unavailable / denied states use the glossary status words.
4. 關於: version from `package.json` is NOT imported; hard-code nothing dev-facing. A short line naming the product only.
No data is sent anywhere; do not mention servers.

### ExerciseView (C2)
The exercise "page":
- Header: chapter link, title, level dots. `目標` (goal) and `場景` (scene) as prose blocks; `固定` (fixed conditions) as chips.
- Shot slots: a horizontal row (wrap on narrow widths) of `.mx-frame` frames, one per `shots[]`. Each frame shows the photo if assigned (thumb) else a dashed empty frame with the shot label and target chips (快門 1/125, ISO 100, 曝光補償 -1, 色溫 4500K, 倍率 5×, 對焦 0.3 m) rendered from `capture`. Tapping an empty frame or `重拍`: plan via `planShot(shot, capabilities)`; `mode camera` -> navigate to `/exercise/:id/shoot/:shot`; `mode import` -> open the file picker (`<input type=file accept="image/*">`, no `capture` attribute) with an explanation line from the reason table (glossary status words), then `importPhotoFile` -> `library.addPhoto` -> `assignSlot`. Even for `camera` shots offer a secondary 從相簿選取 action. Capabilities are read lazily: do not open the camera on page load; treat capabilities as `unknown` until the user starts a shot (then the shoot route decides); for the planning label use the last known capabilities cached in `sessionStorage` by the camera view, else assume camera mode except zoom 0.5.
- A shot with `develop` set shows the recommended adjustment as chips and the photo viewer opens with those values suggested (not applied automatically).
- Compare: when >= 2 slots have photos, a 並排比較 toggle switches the frames to a two-up/scroll-snap comparison view with each photo's shooting data caption (快門, ISO) below.
- 觀察: the `observe[]` questions as a checklist-like list above one lined textarea (`.mx-input`) bound to `observeNotes`; 反思: each `reflect[]` prompt with its own lined textarea bound to `reflectNotes[i]`. Autosave through `library.saveNotes` (the library debounces).
- Checks: if `judgeExercise` returns any non-unknown results, show them as a small list under the frames: pass -> green stamp text with the measured value, fail -> red with measured value and target, unknown hidden. Never block completion on checks.
- 完成 toggle button (`markCompleted`), enabled when at least one slot has a photo; after completing offer a link to the next exercise (`nextExercise`).
- Sources are not shown.

### CaptureView (C2, route `/exercise/:id/shoot/:shot`, full screen, no tab bar)
- On mount `openCamera()`; show the live preview `<video playsinline muted>` filling the screen (contain, black letterbox on paper-dark), a top bar with close (confirm only if a captured-but-unsaved photo exists) and the shot label; errors by `CameraError.code` show a centred card with glossary wording and a 從相簿選取 fallback plus 返回.
- Target strip: chips for every prescribed value of this shot. Prescribed values are locked; null values are shown as 自動 unless the exercise is free-choice (all six fields null), in which case a control panel is expanded by default.
- Control panel (bottom sheet style, collapsible), rows only for controls the phone exposes and the shot does not prescribe: 倍率 (steps 1×, 2×, 5× plus fine slider), 曝光補償 (slider with 1/3 EV snaps), 快門 (stops list 1/4000 ... 1 s in 1/3 stop steps), ISO (stops 50 ... 6400 in 1/3 stop steps), 色溫 (slider + 自動), 對焦距離 (slider + 自動). Every change calls `session.preview(spec)` (debounced 120 ms) so the preview reflects it.
- Shutter button (big, drawn as a film-camera shutter ring). Pressing runs `session.capture(spec, onPhase)`; while running the button shows a spinner ring, the phase text (準備中 / 穩定中 / 拍攝中 / 確認中 / 重新拍攝中) and controls are disabled. Slow shots (shutter >= 1/15) show the hint 手機請靠在穩固處 next to the button beforehand.
- After capture: a review screen with the photo, its shooting data (快門, ISO, 焦段, 鏡頭), a note when `verified` is false (拍攝值與要求略有差異) and three actions: 採用 (save with `importless` path: build `NewPhoto` from `CaptureResult`, `exif = await parseExif(blob)`, `lens = detectLens(exif)`, `width/height` via createImageBitmap, `stripGps` applied, `library.addPhoto`, then `assignSlot`, toast, navigate back to the exercise), 重拍, 放棄.
- The camera is closed on leaving the route and when the page becomes hidden (`visibilitychange`), and reopened on return.
- Cache the last `capabilities` into `sessionStorage` key `meb:caps` for ExerciseView planning.

### PhotoView (C2, `/photo/:photoId`)
Back bar (返回), the photo large on a paper mat; shooting data as a definition list (快門, ISO, 光圈, 焦段, 鏡頭, 拍攝時間; fields absent are omitted, not shown as unknown); source (相機拍攝 / 從相簿選取). 調整 panel with four sliders (陰影, 亮部, 曝光, 暖度; -100..100, double-tap or a 重設 button resets) driving `drawDevelopedPreview` on a canvas (max edge 1024) live; persisted with `library.setDevelop` after 300 ms idle. 儲存調整後的照片: `renderDeveloped(original, develop)` -> download as a JPEG file (GPS is already stripped). 刪除 with a danger confirm dialog explaining the photo is removed from any exercise using it.

## Copy files
`src/copy/<area>.ts` exports plain `const` objects of strings and small functions for formatted strings (e.g. `progress(done, total)` -> `3 / 12 題`). Views never contain Chinese literals. All wording follows the glossary and the copy register in `docs/spec.md`; run the `ui-wording-review` mindset before writing: no imperatives in helper text, no first/second person, no development-progress wording, nothing an ordinary learner would not recognise.

## Accessibility and motion
Every icon-only button has an `aria-label` from the copy files. Focus rings come from base.css. Touch targets >= 44 px. Respect reduced motion (already global). Text sizes only from tokens.
