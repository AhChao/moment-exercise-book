// State and actions of the export dialog: options, selection, progress, delivery.
import { computed, reactive, ref } from 'vue'
import { share } from '@/copy/share'
import { toast } from '@/ui/useToast'
import { deliverFile } from '../deliver'
import { renderImage, renderPdf } from '../exportSheet'
import { exportableSources, imageFileName, pdfFileName } from '../names'
import type { SheetSource } from '../types'
import { footerDate } from './sources'

export type ExportFormat = 'image' | 'pdf'

export function useExport(getSources: () => SheetSource[], scope: () => 'exercise' | 'chapter', scopeId: () => string) {
  const format = ref<ExportFormat>('image')
  const includeNotes = ref(true)
  const includeShootingData = ref(true)
  const selected = reactive(new Set<string>())
  const busy = ref(false)
  const done = ref(0)
  const total = ref(1)

  const listed = computed(() => exportableSources(getSources(), 'withPhotos'))
  const effectiveFormat = computed<ExportFormat>(() => (scope() === 'chapter' ? 'pdf' : format.value))
  const chosen = computed(() =>
    scope() === 'chapter' ? listed.value.filter((s) => selected.has(s.exercise.id)) : listed.value.slice(0, 1),
  )
  const allSelected = computed(() => listed.value.length > 0 && chosen.value.length === listed.value.length)
  const canExport = computed(() => !busy.value && chosen.value.length > 0)
  const percent = computed(() => (total.value ? Math.round((done.value / total.value) * 100) : 0))

  function reset(): void {
    selected.clear()
    for (const s of listed.value) selected.add(s.exercise.id)
  }
  function toggle(id: string, on: boolean): void {
    if (on) selected.add(id)
    else selected.delete(id)
  }
  function toggleAll(): void {
    if (allSelected.value) selected.clear()
    else reset()
  }

  /** Returns true when the file left the app (shared or saved), so the dialog can close. */
  async function run(): Promise<boolean> {
    if (!canExport.value) return false
    const now = new Date()
    const options = {
      includeNotes: includeNotes.value,
      includeShootingData: includeShootingData.value,
      footerDate: footerDate(now),
    }
    busy.value = true
    done.value = 0
    total.value = effectiveFormat.value === 'pdf' ? chosen.value.length : 1
    const onProgress = (d: number, t: number): void => {
      done.value = d
      total.value = t
    }
    try {
      const first = chosen.value[0]
      if (!first) return false
      let blob: Blob
      let name: string
      if (effectiveFormat.value === 'image') {
        blob = await renderImage(first, options, onProgress)
        name = imageFileName(first.exercise.id, now)
      } else {
        blob = await renderPdf(chosen.value, options, onProgress)
        name = pdfFileName(scope(), scopeId(), now)
      }
      const result = await deliverFile(blob, name)
      if (result === 'shared') toast.success(share.shared)
      else if (result === 'downloaded') toast.success(share.downloaded)
      return result !== 'cancelled'
    } catch {
      toast.error(share.failed)
      return false
    } finally {
      busy.value = false
    }
  }

  return { format, includeNotes, includeShootingData, selected, busy, done, total, percent, listed, effectiveFormat, chosen, allSelected, canExport, reset, toggle, toggleAll, run }
}
