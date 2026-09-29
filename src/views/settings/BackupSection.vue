<script setup lang="ts">
import { computed, ref } from 'vue'
import { exportBackup, importBackup } from '@/backup'
import { flushLibrary, reloadLibrary, type ImportMode } from '@/store'
import Icon from '@/ui/Icon.vue'
import { confirmDialog } from '@/ui/useConfirm'
import { toast } from '@/ui/useToast'
import { common } from '@/copy/common'
import { exportProgress, importDone, settings } from '@/copy/settings'
import ImportModeDialog from './ImportModeDialog.vue'
import { backupFileName, importErrorMessage, saveBlob } from './backupFile'

const copy = settings.backup

const exporting = ref(false)
const importing = ref(false)
const progress = ref({ done: 0, total: 0 })
const fileInput = ref<HTMLInputElement | null>(null)
const pendingFile = ref<File | null>(null)

const busy = computed(() => exporting.value || importing.value)
const fill = computed(() => (progress.value.total > 0 ? Math.round((progress.value.done / progress.value.total) * 100) : 0))

async function runExport() {
  exporting.value = true
  progress.value = { done: 0, total: 0 }
  try {
    await flushLibrary() // pending note edits must be in the file
    const blob = await exportBackup({ onProgress: (done, total) => (progress.value = { done, total }) })
    saveBlob(blob, backupFileName(new Date()))
    toast.success(copy.exportDone)
  } catch {
    toast.error(copy.exportFailed)
  } finally {
    exporting.value = false
  }
}

function pickFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0] ?? null
  input.value = '' // the same file can be chosen again later
  pendingFile.value = file
}

async function runImport(mode: ImportMode) {
  const file = pendingFile.value
  pendingFile.value = null
  if (!file) return
  if (mode === 'replace') {
    const ok = await confirmDialog({
      title: copy.replaceConfirm.title,
      message: copy.replaceConfirm.message,
      confirmText: copy.replaceConfirm.confirm,
      cancelText: common.cancel,
      danger: true,
    })
    if (!ok) return
  }
  importing.value = true
  try {
    const summary = await importBackup(file, mode)
    await reloadLibrary()
    toast.success(importDone(summary.photos, summary.attempts))
  } catch (e) {
    toast.error(importErrorMessage(e))
  } finally {
    importing.value = false
  }
}
</script>

<template>
  <section class="mx-card mx-card--flat mx-set">
    <h2 class="mx-heading">{{ copy.title }}</h2>
    <p class="mx-muted mx-set__note">{{ copy.note }}</p>

    <button type="button" class="mx-btn mx-btn--block" :disabled="busy" @click="runExport">
      <Icon name="download" /> {{ exporting ? copy.exporting : copy.export }}
    </button>
    <template v-if="exporting">
      <div class="mx-pencilbar" role="progressbar" aria-valuemin="0" aria-valuemax="100" :aria-valuenow="fill">
        <span :style="{ width: `${fill}%` }" />
      </div>
      <p v-if="progress.total" class="mx-mono mx-set__note" role="status">{{ exportProgress(progress.done, progress.total) }}</p>
    </template>

    <button type="button" class="mx-btn mx-btn--block" :disabled="busy" @click="fileInput?.click()">
      <Icon name="upload" /> {{ importing ? copy.importing : copy.import }}
    </button>
    <input ref="fileInput" class="mx-set__file" type="file" accept=".zip,application/zip" tabindex="-1" @change="pickFile" />

    <ImportModeDialog :open="pendingFile !== null" @choose="runImport" @cancel="pendingFile = null" />
  </section>
</template>

<style scoped>
.mx-set { display: grid; gap: 0.75rem; }
.mx-set__note { font-size: var(--mx-text-sm); }
.mx-set__file { display: none; }
</style>
