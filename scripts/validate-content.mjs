import { readdirSync, readFileSync } from 'node:fs'
const dir = '/Users/stevenchao/Documents/Repos_self/moment-exercise-book/content/exercises/'
const NEEDS = new Set(['manualExposure','exposureComp','manualWB','manualFocus','tele','ultrawide','develop','tripodOrRest','night','person','movingSubject'])
const CAP = ['shutterSec','iso','ev','wbKelvin','zoom','focusMeters']
const errs = []; const ids = new Set(); let total = 0
for (const f of readdirSync(dir).filter(f => f.endsWith('.json')).sort()) {
  let j; try { j = JSON.parse(readFileSync(dir + f, 'utf8')) } catch (e) { errs.push(`${f}: PARSE ${e.message}`); continue }
  const c = j.chapter
  if (!c || !c.id || !c.title || !c.blurb) errs.push(`${f}: chapter incomplete`)
  if (c && !f.startsWith(c.id)) errs.push(`${f}: chapter id ${c.id} != filename`)
  for (const e of j.exercises || []) {
    total++
    const p = `${f}:${e.id}`
    if (ids.has(e.id)) errs.push(`${p}: dup id`); ids.add(e.id)
    for (const k of ['id','title','level','goal','scene','fixed','shots','observe','reflect','needs','checks','sources']) if (e[k] === undefined) errs.push(`${p}: missing ${k}`)
    if (![1,2,3].includes(e.level)) errs.push(`${p}: level`)
    if (!(e.shots?.length >= 1 && e.shots.length <= 4)) errs.push(`${p}: shots count ${e.shots?.length}`)
    for (const [i, s] of (e.shots || []).entries()) {
      if (!s.label || !s.hint) errs.push(`${p}: shot${i} label/hint`)
      if (!s.capture) { errs.push(`${p}: shot${i} capture`); continue }
      for (const k of CAP) if (!(k in s.capture)) errs.push(`${p}: shot${i} capture.${k} missing`)
      const c2 = s.capture
      if (c2.iso != null && (c2.iso < 30 || c2.iso > 7518)) errs.push(`${p}: shot${i} iso ${c2.iso}`)
      if (c2.shutterSec != null && (c2.shutterSec < 1/17000 || c2.shutterSec > 16)) errs.push(`${p}: shot${i} shutter ${c2.shutterSec}`)
      if (c2.wbKelvin != null && (c2.wbKelvin < 2850 || c2.wbKelvin > 7000)) errs.push(`${p}: shot${i} wb ${c2.wbKelvin}`)
      if (c2.focusMeters != null && (c2.focusMeters < 0.05 || c2.focusMeters > 3.77)) errs.push(`${p}: shot${i} focus ${c2.focusMeters}`)
      if (c2.ev != null && (c2.shutterSec != null || c2.iso != null)) errs.push(`${p}: shot${i} ev with manual exposure`)
      if (c2.zoom === 0.5 && !e.needs?.includes('ultrawide')) errs.push(`${p}: 0.5x without ultrawide need`)
      if (c2.zoom >= 5 && !e.needs?.includes('tele')) errs.push(`${p}: >=5x without tele need`)
    }
    for (const n of e.needs || []) if (!NEEDS.has(n)) errs.push(`${p}: bad need ${n}`)
    for (const ch of e.checks || []) {
      if (!['iso','shutterSec','focalLength35','lens'].includes(ch.field)) errs.push(`${p}: check field ${ch.field}`)
      if (!(ch.shot >= 0 && ch.shot < (e.shots||[]).length)) errs.push(`${p}: check shot idx`)
    }
    if (/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(JSON.stringify(e))) errs.push(`${p}: emoji`)
  }
}
console.log('exercises', total, 'ids', ids.size, 'errors', errs.length)
console.log(errs.join('\n'))
