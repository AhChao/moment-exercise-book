<script setup lang="ts">
// Asks how a backup file should be brought in. Choosing replace is confirmed once more by the caller.
import ModalShell from '@/ui/ModalShell.vue'
import { common } from '@/copy/common'
import { settings } from '@/copy/settings'
import type { ImportMode } from '@/store'

defineProps<{ open: boolean }>()
const emit = defineEmits<{ choose: [mode: ImportMode]; cancel: [] }>()
const copy = settings.backup.mode
</script>

<template>
  <ModalShell :open="open" size="sm" :title="copy.title" initial-focus="[data-merge]" @update:open="(v) => !v && emit('cancel')">
    <p class="mx-muted">{{ copy.message }}</p>
    <template #footer>
      <button type="button" class="mx-btn mx-btn--quiet" @click="emit('cancel')">{{ common.cancel }}</button>
      <button type="button" class="mx-btn mx-btn--danger" @click="emit('choose', 'replace')">{{ copy.replace }}</button>
      <button type="button" class="mx-btn mx-btn--primary" data-merge @click="emit('choose', 'merge')">{{ copy.merge }}</button>
    </template>
  </ModalShell>
</template>
