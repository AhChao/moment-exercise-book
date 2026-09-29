import type { SheetContent } from '../types'

/**
 * SheetContent plus the learner's prediction notes (parallel to `predictions`), until the shared
 * contract carries them. Optional so a plain SheetContent is accepted by the layout.
 */
export type SheetContentWithPredictions = SheetContent & { predictionNotes?: string[] }
