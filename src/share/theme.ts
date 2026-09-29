// Resolves the sheet theme from the CSS tokens (src/styles/tokens.css) at export time.
import type { SheetTheme } from './types'

const FALLBACK: SheetTheme = {
  paper: '#efe4cb',
  paperLight: '#f8f1de',
  ink: '#3a2d26',
  inkSoft: '#6b5a4c',
  inkFaint: '#9c8b78',
  accent: 'rgb(180 83 60)',
  film: '#2b211b',
  green: 'rgb(91 138 106)',
  yellow: 'rgb(226 186 74)',
  fontBody: "'Noto Serif TC', 'Source Han Serif TC', 'Songti TC', 'PMingLiU', Georgia, serif",
  fontHand: "'Kaiti TC', 'BiauKai', 'STKaiti', 'DFKai-SB', 'Noto Serif TC', Georgia, serif",
  fontMono: "'Courier New', ui-monospace, Menlo, monospace",
}

export function resolveTheme(): SheetTheme {
  const style = getComputedStyle(document.documentElement)
  const read = (name: string, fallback: string): string => {
    const v = style.getPropertyValue(name).trim()
    return v || fallback
  }
  return {
    paper: read('--mx-paper', FALLBACK.paper),
    paperLight: read('--mx-paper-light', FALLBACK.paperLight),
    ink: read('--mx-ink', FALLBACK.ink),
    inkSoft: read('--mx-ink-soft', FALLBACK.inkSoft),
    inkFaint: read('--mx-ink-faint', FALLBACK.inkFaint),
    accent: read('--mx-red', FALLBACK.accent),
    film: read('--mx-film', FALLBACK.film),
    green: read('--mx-green', FALLBACK.green),
    yellow: read('--mx-yellow', FALLBACK.yellow),
    fontBody: read('--mx-font-body', FALLBACK.fontBody),
    fontHand: read('--mx-font-hand', FALLBACK.fontHand),
    fontMono: read('--mx-font-mono', FALLBACK.fontMono),
  }
}
