<script setup lang="ts">
// One lined textarea per prediction prompt, shown before the frames.
import { exerciseCopy, predictAria } from '@/copy/exercise'

defineProps<{ prompts: readonly string[]; notes: readonly string[] }>()
const emit = defineEmits<{ predict: [index: number, value: string] }>()

const val = (e: Event): string => (e.target as HTMLTextAreaElement).value
</script>

<template>
  <section class="notes">
    <h2 class="mx-heading">{{ exerciseCopy.predict }}</h2>
    <div v-for="(p, i) in prompts" :key="p" class="notes__prompt">
      <p>{{ p }}</p>
      <textarea class="mx-input" :aria-label="predictAria(i + 1)" :value="notes[i] ?? ''" @input="emit('predict', i, val($event))" />
    </div>
  </section>
</template>

<style scoped>
.notes { display: grid; gap: 0.5rem; margin-bottom: 1.2rem; }
.notes__prompt { display: grid; gap: 0.3rem; }
</style>
