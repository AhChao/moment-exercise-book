import { describe, expect, it } from 'vitest'
import { attempt, ID_A, ID_B, photoMeta } from '@/store/testing/fixtures'
import { assertFilesPresent, buildManifest, parseManifest, photoPath } from './manifest'

const good = () => JSON.parse(JSON.stringify(buildManifest([photoMeta(ID_A)], [attempt('e1', { slots: [ID_A, null] })], 5)))

describe('parseManifest', () => {
  it('accepts a built manifest unchanged', () => {
    const m = buildManifest([photoMeta(ID_A)], [attempt('e1', { slots: [ID_A, null] })], 5)
    expect(parseManifest(JSON.parse(JSON.stringify(m)))).toEqual(m)
  })

  it('rejects non-objects, unknown app and wrong version', () => {
    for (const v of [null, 'x', [], 3]) expect(() => parseManifest(v)).toThrow('invalid-backup')
    expect(() => parseManifest({ ...good(), app: 'other' })).toThrow('invalid-backup')
    expect(() => parseManifest({ ...good(), version: 2 })).toThrow('invalid-backup')
    expect(() => parseManifest({ ...good(), exportedAt: 'today' })).toThrow('invalid-backup')
  })

  it('rejects non-array fields', () => {
    expect(() => parseManifest({ ...good(), photos: {} })).toThrow('invalid-backup')
    expect(() => parseManifest({ ...good(), attempts: 'no' })).toThrow('invalid-backup')
  })

  it('rejects ids that are not uuid-like', () => {
    for (const id of ['../evil', 'a/b', 'short', 'x'.repeat(20), 5]) {
      const m = good()
      m.photos[0].id = id
      expect(() => parseManifest(m)).toThrow('invalid-backup')
    }
    const m = good()
    m.attempts[0].slots = ['../etc/passwd', null]
    expect(() => parseManifest(m)).toThrow('invalid-backup')
  })

  it('rejects duplicate ids and malformed entries', () => {
    const dup = good()
    dup.photos.push({ ...dup.photos[0] })
    expect(() => parseManifest(dup)).toThrow('invalid-backup')
    const noDev = good()
    delete noDev.photos[0].develop
    expect(() => parseManifest(noDev)).toThrow('invalid-backup')
    const badNotes = good()
    badNotes.attempts[0].reflectNotes = [1]
    expect(() => parseManifest(badNotes)).toThrow('invalid-backup')
  })
})

describe('assertFilesPresent', () => {
  it('requires a file for every photo entry', () => {
    const m = buildManifest([photoMeta(ID_A), photoMeta(ID_B)], [], 1)
    expect(() => assertFilesPresent(m, [photoPath(ID_A), photoPath(ID_B), 'manifest.json'])).not.toThrow()
    expect(() => assertFilesPresent(m, [photoPath(ID_A)])).toThrow('invalid-backup')
  })
})
