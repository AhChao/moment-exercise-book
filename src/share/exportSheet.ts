// Export flow: content -> layout -> paint -> JPEG -> (PDF). Browser glue only; the rules live in the pure modules.
import { useLibrary } from '@/store'
import { common } from '@/copy/common'
import { buildSheetContent } from '@/share/content'
import { layoutSheet } from '@/share/layout'
import { buildPdf } from '@/share/pdf'
import { createMeasurer } from './measurer'
import { paintPage } from './paint'
import { closeAll, loadSheetPhotos } from './photos'
import { resolveTheme } from './theme'
import type { SheetGeometry, SheetOptions, SheetPage, SheetSource, SheetTheme, TextMeasurer } from './types'

export type ExportProgress = (done: number, total: number) => void

const IMAGE_GEOMETRY: SheetGeometry = { pageWidth: 1080, pageHeight: 'auto', margin: 56 }
const PDF_GEOMETRY: SheetGeometry = { pageWidth: 1240, pageHeight: 1754, margin: 88 } // A4 at 150 dpi
const IMAGE_QUALITY = 0.92
const PDF_QUALITY = 0.9
const IMAGE_PHOTO_EDGE = 900
const PDF_PHOTO_EDGE = 700

const yieldToEventLoop = (): Promise<void> => new Promise((r) => setTimeout(r))

async function prepareFonts(theme: SheetTheme): Promise<void> {
  try {
    // Make sure the faces used by the sheet are actually loaded before text is measured or painted.
    await Promise.all([
      document.fonts.load(`16px ${theme.fontBody}`, '練習本Aa'),
      document.fonts.load(`700 16px ${theme.fontHand}`, '練習本Aa'),
    ])
    await document.fonts.ready
  } catch {
    // Fall back to whatever is available.
  }
}

/** Lays out one exercise and returns its pages plus the decoded photos (caller closes them). */
async function prepare(
  source: SheetSource,
  options: SheetOptions,
  geometry: SheetGeometry,
  theme: SheetTheme,
  measurer: TextMeasurer,
  photoEdge: number,
): Promise<{ pages: SheetPage[]; bitmaps: (ImageBitmap | null)[] }> {
  const content = buildSheetContent(source, options)
  const pages = layoutSheet({ content, geometry, theme, measurer })
  const library = useLibrary()
  const bitmaps = await loadSheetPhotos(source.photos, (id) => library.getPhotoBlob(id), photoEdge)
  return { pages, bitmaps }
}

async function paintToJpeg(page: SheetPage, bitmaps: (ImageBitmap | null)[], theme: SheetTheme, quality: number): Promise<Blob> {
  const canvas = new OffscreenCanvas(page.width, page.height)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas-unavailable')
  try {
    paintPage(ctx, page, bitmaps, theme)
    return await canvas.convertToBlob({ type: 'image/jpeg', quality })
  } finally {
    canvas.width = 0
    canvas.height = 0
  }
}

/** One exercise as a single long JPEG. */
export async function renderImage(source: SheetSource, options: SheetOptions, onProgress?: ExportProgress): Promise<Blob> {
  const theme = resolveTheme()
  await prepareFonts(theme)
  onProgress?.(0, 1)
  const { pages, bitmaps } = await prepare(source, options, IMAGE_GEOMETRY, theme, createMeasurer(), IMAGE_PHOTO_EDGE)
  try {
    const page = pages[0]
    if (!page) throw new Error('empty-layout')
    await yieldToEventLoop()
    const blob = await paintToJpeg(page, bitmaps, theme, IMAGE_QUALITY)
    onProgress?.(1, 1)
    return blob
  } finally {
    closeAll(bitmaps)
  }
}

/** Several exercises as one PDF; each exercise starts on a new page. Progress counts finished exercises. */
export async function renderPdf(sources: SheetSource[], options: SheetOptions, onProgress?: ExportProgress): Promise<Blob> {
  const theme = resolveTheme()
  await prepareFonts(theme)
  const measurer = createMeasurer()
  const rendered: { jpeg: Uint8Array; width: number; height: number }[] = []
  onProgress?.(0, sources.length)
  for (let i = 0; i < sources.length; i++) {
    const source = sources[i]
    if (!source) continue
    const { pages, bitmaps } = await prepare(source, options, PDF_GEOMETRY, theme, measurer, PDF_PHOTO_EDGE)
    try {
      for (const page of pages) {
        await yieldToEventLoop()
        const blob = await paintToJpeg(page, bitmaps, theme, PDF_QUALITY)
        rendered.push({ jpeg: new Uint8Array(await blob.arrayBuffer()), width: page.width, height: page.height })
      }
    } finally {
      closeAll(bitmaps)
    }
    onProgress?.(i + 1, sources.length)
  }
  const bytes = buildPdf(rendered, { title: common.productName, createdIso: new Date().toISOString() })
  return new Blob([bytes as BlobPart], { type: 'application/pdf' })
}
