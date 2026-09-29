import { describe, expect, it } from 'vitest'
import { settings } from '@/copy/settings'
import { backupFileName, importErrorMessage } from './backupFile'

describe('backupFileName', () => {
  it('uses the local date, zero padded', () => {
    expect(backupFileName(new Date(2026, 0, 5, 23, 59))).toBe('moment-exercise-book-20260105.zip')
    expect(backupFileName(new Date(2026, 11, 31, 0, 0))).toBe('moment-exercise-book-20261231.zip')
  })
})

describe('importErrorMessage', () => {
  it('maps the invalid-backup code to the invalid-file wording', () => {
    expect(importErrorMessage(new Error('invalid-backup'))).toBe(settings.backup.invalidFile)
  })
  it('never leaks other error text', () => {
    expect(importErrorMessage(new Error('QuotaExceededError: disk'))).toBe(settings.backup.importFailed)
    expect(importErrorMessage('weird')).toBe(settings.backup.importFailed)
  })
})
