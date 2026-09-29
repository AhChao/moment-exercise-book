import { describe, expect, it } from 'vitest'
import { fitNotes, writtenPredictions } from './predictions'

describe('fitNotes', () => {
  it('treats a missing list as all empty', () => {
    expect(fitNotes(undefined, 2)).toEqual(['', ''])
  })
  it('pads short lists and trims long ones', () => {
    expect(fitNotes(['a'], 3)).toEqual(['a', '', ''])
    expect(fitNotes(['a', 'b', 'c'], 2)).toEqual(['a', 'b'])
  })
  it('returns an empty list for zero prompts', () => {
    expect(fitNotes(['a'], 0)).toEqual([])
  })
})

describe('writtenPredictions', () => {
  it('keeps only non-blank entries, trimmed, in order', () => {
    expect(writtenPredictions(['  a ', '', '   ', 'b'])).toEqual(['a', 'b'])
  })
  it('is empty when nothing was written', () => {
    expect(writtenPredictions(['', ' '])).toEqual([])
  })
})
