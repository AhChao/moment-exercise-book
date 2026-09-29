<script setup lang="ts">
// A control that moves along a list of stops (shutter, ISO, compensation); null means automatic.
import { computed } from 'vue'
import { captureCopy } from '@/copy/capture'
import { nearestStopIndex } from './stops'

const props = defineProps<{
  label: string
  stops: readonly number[]
  value: number | null
  /** where the slider rests while the value is automatic */
  initial: number
  format: (n: number) => string
  disabled?: boolean
}>()
const emit = defineEmits<{ update: [value: number | null] }>()

const index = computed(() => nearestStopIndex(props.stops, props.value ?? props.initial))

function onInput(e: Event): void {
  const i = Number((e.target as HTMLInputElement).value)
  const v = props.stops[i]
  if (v !== undefined) emit('update', v)
}
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
    <input
      class="mx-range row__range"
      type="range"
      min="0"
      :max="stops.length - 1"
      step="1"
      :value="index"
      :disabled="disabled"
      :aria-label="label"
      @input="onInput"
    />
  </div>
</template>

<style scoped>
.row { display: grid; gap: 0.1rem; }
.row__head { display: flex; align-items: center; gap: 0.6rem; min-height: 2.25rem; }
.row__label { flex: 1; font-family: var(--mx-font-hand); font-weight: 700; }
.row__value { color: var(--mx-ink-soft); }
.row__range { height: 2.75rem; margin: 0; }
</style>
