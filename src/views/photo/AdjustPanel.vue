<script setup lang="ts">
// Four -100..100 sliders. A reset button and a double-tap put a slider back to 0.
import { computed } from 'vue'
import type { DevelopSpec } from '@/types'
import { developLabel, photoCopy, resetSliderLabel } from '@/copy/photo'
import { developChips, signed } from './suggest'

const props = defineProps<{ dev: DevelopSpec; suggestion: DevelopSpec | null }>()
const emit = defineEmits<{ set: [key: keyof DevelopSpec, value: number]; reset: [key: keyof DevelopSpec]; apply: [] }>()

const keys: (keyof DevelopSpec)[] = ['shadows', 'highlights', 'exposure', 'warmth']
const chips = computed(() => developChips(props.suggestion))
const onInput = (k: keyof DevelopSpec, e: Event): void => emit('set', k, Number((e.target as HTMLInputElement).value))
</script>

<template>
  <section class="adjust mx-card mx-card--flat">
    <h2 class="mx-heading">{{ photoCopy.adjustHeading }}</h2>
    <div v-if="chips.length" class="adjust__suggest">
      <span class="mx-kicker">{{ photoCopy.suggestHeading }}</span>
      <span v-for="c in chips" :key="c" class="mx-chip" data-tone="purple">{{ c }}</span>
      <button type="button" class="mx-btn mx-btn--small" @click="emit('apply')">{{ photoCopy.applySuggest }}</button>
    </div>
    <div v-for="k in keys" :key="k" class="adjust__row">
      <div class="adjust__head">
        <label class="adjust__label" :for="`dev-${k}`">{{ developLabel[k] }}</label>
        <output class="mx-mono">{{ signed(dev[k]) }}</output>
        <button
          type="button"
          class="mx-btn mx-btn--small mx-btn--quiet"
          :disabled="dev[k] === 0"
          :aria-label="resetSliderLabel(developLabel[k])"
          @click="emit('reset', k)"
        >{{ photoCopy.reset }}</button>
      </div>
      <input
        :id="`dev-${k}`"
        class="mx-range adjust__range"
        type="range"
        min="-100"
        max="100"
        step="1"
        :value="dev[k]"
        @input="onInput(k, $event)"
        @dblclick="emit('reset', k)"
      />
    </div>
  </section>
</template>

<style scoped>
.adjust { display: grid; gap: 0.7rem; }
.adjust__suggest { display: flex; flex-wrap: wrap; align-items: center; gap: 0.4rem; }
.adjust__head { display: flex; align-items: center; gap: 0.6rem; min-height: 2.25rem; }
.adjust__label { flex: 1; font-family: var(--mx-font-hand); font-weight: 700; }
.adjust__range { height: 2.75rem; margin: 0; }
</style>
