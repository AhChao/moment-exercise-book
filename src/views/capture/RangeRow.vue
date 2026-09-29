<script setup lang="ts">
// A continuous control (zoom, colour temperature, focus distance); null means automatic.
import { captureCopy } from '@/copy/capture'

const props = defineProps<{
  label: string
  min: number
  max: number
  step: number
  value: number | null
  initial: number
  format: (n: number) => string
  /** quick-pick values, shown as buttons (zoom) */
  presets?: readonly number[]
  disabled?: boolean
}>()
const emit = defineEmits<{ update: [value: number | null] }>()

const onInput = (e: Event): void => emit('update', Number((e.target as HTMLInputElement).value))
</script>

<template>
  <div class="row">
    <div class="row__head">
      <span class="row__label">{{ label }}</span>
      <output class="mx-mono row__value">{{ value === null ? captureCopy.auto : format(value) }}</output>
      <button v-if="value !== null" type="button" class="mx-btn mx-btn--small mx-btn--quiet" :disabled="disabled" @click="emit('update', null)">
        {{ captureCopy.auto }}
      </button>
    </div>
    <div v-if="presets?.length" class="row__presets">
      <button
        v-for="p in presets"
        :key="p"
        type="button"
        class="mx-btn mx-btn--small"
        :class="{ 'mx-btn--quiet': value !== p }"
        :aria-pressed="value === p"
        :disabled="disabled"
        @click="emit('update', p)"
      >{{ format(p) }}</button>
    </div>
    <input
      class="mx-range row__range"
      type="range"
      :min="min"
      :max="max"
      :step="step"
      :value="value ?? initial"
      :disabled="disabled"
      :aria-label="presets?.length ? captureCopy.zoomFine : label"
      @input="onInput"
    />
  </div>
</template>

<style scoped>
.row { display: grid; gap: 0.1rem; }
.row__head { display: flex; align-items: center; gap: 0.6rem; min-height: 2.25rem; }
.row__label { flex: 1; font-family: var(--mx-font-hand); font-weight: 700; }
.row__value { color: var(--mx-ink-soft); }
.row__presets { display: flex; gap: 0.5rem; }
.row__range { height: 2.75rem; margin: 0; }
</style>
