// Hand-drawn stroke icons. viewBox 0 0 24 24, stroke 1.8, round caps and joins (set by Icon.vue).
// Values are inner SVG markup; only `grain` and the dot of `info` use a fill.
export type IconName =
  | 'book' | 'album' | 'gear' | 'camera' | 'chevron-left' | 'chevron-right' | 'close' | 'check'
  | 'plus' | 'trash' | 'pencil' | 'download' | 'upload' | 'sun' | 'timer' | 'grain' | 'thermo'
  | 'focus' | 'zoom' | 'flash' | 'info' | 'layers' | 'refresh' | 'film' | 'lock' | 'home'
  | 'minus' | 'fit'

export const icons: Record<IconName, string> = {
  book:
    '<path d="M4 5.6c2.6-1.3 5.4-1.2 8 .6 2.6-1.8 5.4-1.9 8-.6v13c-2.6-1.3-5.4-1.2-8 .6-2.6-1.8-5.4-1.9-8-.6z"/><path d="M12 6.2v13"/>',
  album:
    '<rect x="3.5" y="4.5" width="17" height="15" rx="1.6"/><path d="M3.6 16.2l5-5 4 4 2.6-2.6 5.2 4.8"/><circle cx="15.6" cy="9" r="1.4"/>',
  gear:
    '<circle cx="12" cy="12" r="5.8"/><circle cx="12" cy="12" r="2"/><path d="M12 3.5v2.3M12 18.2v2.3M3.5 12h2.3M18.2 12h2.3M6 6l1.6 1.6M16.4 16.4L18 18M18 6l-1.6 1.6M7.6 16.4L6 18"/>',
  camera:
    '<path d="M3.8 8.2h3.2l1.6-2.5h6.8l1.6 2.5h3.2v11H3.8z"/><circle cx="12" cy="13.4" r="3.6"/>',
  'chevron-left': '<path d="M14.6 5.5L8.2 12l6.4 6.5"/>',
  'chevron-right': '<path d="M9.4 5.5l6.4 6.5-6.4 6.5"/>',
  close: '<path d="M6 6.2l12 11.6M17.8 6L6.2 18"/>',
  check: '<path d="M4.8 12.6l4.6 4.5L19.2 7.4"/>',
  plus: '<path d="M12 4.8v14.4M4.8 12.1h14.4"/>',
  trash:
    '<path d="M4.4 7.2h15.2M9.4 7.2V4.6h5.2v2.6M6.6 7.2l.9 12.6h9l.9-12.6M10.1 11v5.8M13.9 11v5.8"/>',
  pencil:
    '<path d="M4.2 19.8l.9-4.4L16.4 4.2a1.9 1.9 0 012.7 0l.7.7a1.9 1.9 0 010 2.7L8.6 18.9zM14.4 6.2l3.5 3.5"/>',
  download: '<path d="M12 4.2v10.8M7.6 10.7l4.4 4.4 4.4-4.4M4.8 19.6h14.4"/>',
  upload: '<path d="M12 15.4V4.6M7.6 8.9L12 4.5l4.4 4.4M4.8 19.6h14.4"/>',
  sun:
    '<circle cx="12" cy="12" r="4"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8"/>',
  timer:
    '<circle cx="12" cy="13.6" r="7"/><path d="M12 13.6V9.6M9.6 3.6h4.8M12 3.6v3M18.2 7.2l1.2-1.2"/>',
  grain:
    '<g fill="currentColor" stroke="none"><circle cx="6.5" cy="6.5" r="1.1"/><circle cx="13" cy="5.2" r="1"/><circle cx="18" cy="9" r="1.1"/><circle cx="9.5" cy="11" r="1"/><circle cx="15" cy="14" r="1.2"/><circle cx="5.5" cy="15.5" r="1"/><circle cx="10.5" cy="18.5" r="1.1"/><circle cx="18.5" cy="18" r="1"/></g>',
  thermo:
    '<path d="M10 14.2V5.6a2 2 0 014 0v8.6a4 4 0 11-4 0z"/><path d="M12 9.5v7"/>',
  focus:
    '<path d="M4 8.6V5h3.6M16.4 5H20v3.6M20 15.4V19h-3.6M7.6 19H4v-3.6"/><circle cx="12" cy="12" r="2.6"/>',
  zoom:
    '<circle cx="10.4" cy="10.4" r="6"/><path d="M15 15l5 5M8 10.4h4.8M10.4 8v4.8"/>',
  flash: '<path d="M13.2 3L5.6 13.6h5.4L10 21l8.4-11h-5.4z"/>',
  info:
    '<circle cx="12" cy="12" r="8.6"/><path d="M12 11v5.6"/><circle cx="12" cy="7.9" r="0.9" fill="currentColor" stroke="none"/>',
  layers:
    '<path d="M12 4l8.5 4.5L12 13 3.5 8.5z"/><path d="M3.5 12.4L12 17l8.5-4.6M3.5 16.4L12 21l8.5-4.6"/>',
  refresh: '<path d="M19.6 12.2a7.6 7.6 0 11-2.3-5.5M19.6 4.4v4.2h-4.2"/>',
  film:
    '<rect x="4.5" y="3.5" width="15" height="17" rx="1"/><path d="M8.5 3.5v17M15.5 3.5v17M4.5 8h4M4.5 12h4M4.5 16h4M15.5 8h4M15.5 12h4M15.5 16h4"/>',
  lock:
    '<rect x="5.5" y="10.6" width="13" height="9.4" rx="1.6"/><path d="M8.5 10.6V8.2a3.5 3.5 0 017 0v2.4M12 14.2v2.2"/>',
  home: '<path d="M3.8 11.2L12 4.6l8.2 6.6M6.2 9.6V20h4.4v-5.4h2.8V20h4.4V9.6"/>',
  minus: '<path d="M4.8 12.1h14.4"/>',
  fit: '<path d="M4 9V4.6h4.4M15.6 4.6H20V9M20 15v4.4h-4.4M8.4 19.4H4V15"/><rect x="8.6" y="8.8" width="6.8" height="6.4" rx="0.8"/>',
}
