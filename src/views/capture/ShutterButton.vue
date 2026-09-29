<script setup lang="ts">
// Film-camera shutter ring. While a shot runs the ring turns and the phase text replaces the hint.
import { captureCopy } from '@/copy/capture'

defineProps<{
  busy: boolean
  disabled: boolean
  /** phase or exposure text shown while busy */
  status: string
  /** shown beside the button beforehand for slow shutter speeds */
  hint?: string
}>()
defineEmits<{ press: [] }>()
</script>

<template>
  <div class="shutter">
    <p class="shutter__text" aria-live="polite">{{ busy ? status : hint }}</p>
    <button
      type="button"
      class="shutter__btn"
      :class="{ 'shutter__btn--busy': busy }"
      :disabled="disabled || busy"
      :aria-label="captureCopy.shutter"
      :aria-busy="busy"
      @click="$emit('press')"
    >
      <svg viewBox="0 0 80 80" class="shutter__svg" aria-hidden="true">
        <circle cx="40" cy="40" r="36" class="shutter__outer" />
        <circle cx="40" cy="40" r="28" class="shutter__inner" />
        <circle v-if="busy" cx="40" cy="40" r="36" class="shutter__spin" pathLength="100" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.shutter { display: flex; flex-direction: column; align-items: center; gap: 0.4rem; min-height: 6.6rem; }
.shutter__text { min-height: 1.4rem; font-size: var(--mx-text-sm); color: var(--mx-paper-light); text-align: center; }
.shutter__btn {
  width: 5rem;
  height: 5rem;
  padding: 0;
  color: var(--mx-paper-light);
  background: transparent;
  border: 0;
  border-radius: var(--mx-radius-round);
}
.shutter__btn:disabled { opacity: 0.55; cursor: not-allowed; }
.shutter__btn:active:not(:disabled) .shutter__inner { transform: scale(0.92); }
.shutter__svg { width: 100%; height: 100%; }
.shutter__outer { fill: none; stroke: currentColor; stroke-width: 4; }
.shutter__inner { fill: currentColor; transform-origin: 40px 40px; transition: transform var(--ui-dur-fast) var(--ui-ease); }
.shutter__spin {
  fill: none;
  stroke: var(--mx-orange);
  stroke-width: 5;
  stroke-linecap: round;
  stroke-dasharray: 22 78;
  transform-origin: 40px 40px;
  animation: shutter-turn 1.1s linear infinite;
}
@keyframes shutter-turn { to { transform: rotate(360deg); } }
</style>
