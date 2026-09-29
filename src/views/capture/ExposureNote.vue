<script setup lang="ts">
// Note about an unreachable brightness, plus the button that takes a fresh reading of the light.
import { exposureNote, remeter } from '@/copy/capture'
import type { ExposureNoteKey } from '@/copy/capture'

defineProps<{ note: ExposureNoteKey | null; disabled: boolean }>()
defineEmits<{ (e: 'remeter'): void }>()
</script>

<template>
  <div class="expo">
    <p v-if="note" class="expo__note" role="status">{{ exposureNote[note] }}</p>
    <button type="button" class="expo__btn" :disabled="disabled" @click="$emit('remeter')">{{ remeter }}</button>
  </div>
</template>

<style scoped>
.expo { display: flex; align-items: center; justify-content: space-between; gap: 0.6rem; }
.expo__note { flex: 1; margin: 0; font-size: var(--mx-text-sm); color: var(--mx-paper-light); }
.expo__btn {
  margin-left: auto;
  min-height: 2.75rem;
  padding: 0 0.6rem;
  font-size: var(--mx-text-sm);
  color: var(--mx-paper-light);
  text-decoration: underline;
  background: transparent;
  border: 0;
}
.expo__btn:disabled { opacity: 0.5; text-decoration: none; }
</style>
