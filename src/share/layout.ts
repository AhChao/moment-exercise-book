// Pure page layout: SheetContent + geometry -> pages of drawing operations (see ./types).
// The text baseline convention: a 'text' op's y is the alphabetic baseline; a 'stamp' op's x, y is its centre.
import type { LayoutSheet } from './types'
import { conceptBlock, fixedBlock, labelledParagraph, ruleBlock, titleBlock } from './layout/intro'
import { frameBlocks } from './layout/frames'
import { observeBlocks, predictBlocks, reflectBlocks, resultBlocks, stampBlock } from './layout/notes'
import { paginate } from './layout/paginate'
import { makeCtx } from './layout/sizes'
import type { SheetContentWithPredictions } from './layout/extended'
import { exerciseCopy } from '@/copy/exercise'

export const layoutSheet: LayoutSheet = (input) => {
  const { geometry } = input
  const c: SheetContentWithPredictions = input.content
  const ctx = makeCtx(input)
  const blocks = [
    titleBlock(ctx, c),
    ...conceptBlock(ctx, c.concept),
    ...labelledParagraph(ctx, exerciseCopy.goal, c.goal),
    ...labelledParagraph(ctx, exerciseCopy.scene, c.scene),
    ...fixedBlock(ctx, c.fixed),
    ruleBlock(ctx),
    ...frameBlocks(ctx, c.frames),
    ...predictBlocks(ctx, c),
    ...observeBlocks(ctx, c),
    ...reflectBlocks(ctx, c),
    ...resultBlocks(ctx, c),
    ...stampBlock(ctx, c.completed),
  ]
  return paginate(ctx, blocks, geometry, c.title, c.footer)
}
