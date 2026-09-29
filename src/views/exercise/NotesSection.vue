<script setup lang="ts">
// Observation questions with one lined textarea, then one lined textarea per reflection prompt.
import { exerciseCopy, observeAria, reflectAria } from '@/copy/exercise'

defineProps<{
  observeQuestions: readonly string[]
  reflectPrompts: readonly string[]
  observe: string
  reflect: readonly string[]
  /** Written predictions quoted above the observation; empty when none. */
  predictions?: readonly string[]
}>()
const emit = defineEmits<{ observe: [value: string]; reflect: [index: number, value: string] }>()

const val = (e: Event): string => (e.target as HTMLTextAreaElement).value
</script>

<template>
  <section v-if="observeQuestions.length" class="notes">
    <h2 class="mx-heading">{{ exerciseCopy.observe }}</h2>
    <ul class="notes__list">
      <li v-for="q in observeQuestions" :key="q">{{ q }}</li>
    </ul>
    <div v-if="predictions?.length" class="notes__earlier">
      <p class="mx-muted">{{ exerciseCopy.earlierPredict }}</p>
      <blockquote v-for="(t, i) in predictions" :key="i" class="notes__quote">{{ t }}</blockquote>
    </div>
    <textarea class="mx-input" :aria-label="observeAria" :value="observe" @input="emit('observe', val($event))" />
  </section>
  <section v-if="reflectPrompts.length" class="notes">
    <h2 class="mx-heading">{{ exerciseCopy.reflect }}</h2>
    <div v-for="(p, i) in reflectPrompts" :key="p" class="notes__prompt">
      <p>{{ p }}</p>
      <textarea class="mx-input" :aria-label="reflectAria(i + 1)" :value="reflect[i] ?? ''" @input="emit('reflect', i, val($event))" />
    </div>
  </section>
</template>

<style scoped>
.notes { display: grid; gap: 0.5rem; margin-top: 1.4rem; }
.notes__list { display: grid; gap: 0.25rem; padding-left: 1.1rem; list-style: disc; color: var(--mx-ink-soft); }
.notes__list li::marker { color: var(--mx-orange); }
.notes__prompt { display: grid; gap: 0.3rem; }
.notes__earlier { display: grid; gap: 0.2rem; font-size: 0.9em; }
.notes__quote { margin: 0; padding-left: 0.7rem; border-left: var(--mx-stroke) solid var(--mx-orange); color: var(--mx-ink-soft); white-space: pre-wrap; }
</style>
