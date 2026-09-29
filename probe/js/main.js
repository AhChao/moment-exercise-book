import * as base from './tests.js'
import * as probe3 from './tests3.js'

const report = { version: 3, startedAt: new Date().toISOString(), results: {} }
const $ = (s) => document.querySelector(s)
const video = $('#preview')

const runners = {
  env: () => base.env(),
  storage: () => base.storage(),
  shutterLadder: (say) => probe3.shutterLadder(video, say),
  toggleStrategy: (say) => probe3.toggleStrategy(video, say),
  previewWysiwyg: (say) => probe3.previewWysiwyg(video, say),
  whiteBalanceK: (say) => probe3.whiteBalanceK(video, say),
  develop: (say) => probe3.develop(video, say),
  idbStress: () => probe3.idbStress(),
}

// Each result gets its own copy button, so a long report can be pasted in pieces.
function copyButton(name) {
  const out = $(`#out-${name}`)
  if (out.previousElementSibling?.dataset.copyFor === name) return
  const btn = document.createElement('button')
  btn.dataset.copyFor = name
  btn.textContent = `複製「${name}」結果`
  btn.addEventListener('click', () => copyText(JSON.stringify({ [name]: report.results[name] }), `#out-${name}`))
  out.before(btn)
}

async function copyText(text, statusSel) {
  try {
    await navigator.clipboard.writeText(text)
    $(statusSel).textContent = `已複製（${text.length} 字元）`
  } catch (err) {
    const box = $('#fallback')
    box.hidden = false
    box.value = text
    box.focus()
    box.select()
    $(statusSel).textContent = `自動複製失敗（${err.message}），請長按下方文字框全選後複製`
  }
}

function show(name, value) {
  report.results[name] = value
  copyButton(name)
  const failed = value && value.error
  $(`#out-${name}`).textContent = failed ? `失敗：${value.error}` : '完成'
}

async function run(name, fn) {
  const out = $(`#out-${name}`)
  out.textContent = '執行中...'
  show(name, await fn((msg) => { out.textContent = `執行中：${msg}` }))
}

document.querySelectorAll('[data-run]').forEach((btn) => {
  btn.addEventListener('click', async () => {
    btn.disabled = true
    await run(btn.dataset.run, runners[btn.dataset.run])
    btn.disabled = false
  })
})

document.querySelectorAll('[data-file]').forEach((input) => {
  input.addEventListener('change', async () => {
    const file = input.files[0]
    if (file) await run(input.dataset.file, () => base.inspectFile(file))
  })
})

async function finalReport() {
  report.finishedAt = new Date().toISOString()
  report.notes = $('#notes').value
  report.page = { href: location.href, standalone: matchMedia('(display-mode: standalone)').matches }
  report.persistedNow = await navigator.storage.persisted().catch(() => null)
  report.brand = (navigator.userAgentData?.brands || []).map((b) => `${b.brand} ${b.version}`)
  return JSON.stringify(report)
}

$('#copy').addEventListener('click', async () => copyText(await finalReport(), '#out-send'))

// PWA install: needed to find out whether persist() is granted for an installed app.
let deferredInstall
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferredInstall = e
  $('#install').hidden = false
})
$('#install').addEventListener('click', async () => {
  if (!deferredInstall) return
  deferredInstall.prompt()
  await deferredInstall.userChoice
})

$('#browser').textContent = `目前瀏覽器：${navigator.userAgentData?.brands?.map((b) => b.brand).join(' / ') || navigator.userAgent}`
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {})
