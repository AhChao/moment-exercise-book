<script setup lang="ts">
import { levelLabel } from '@/copy/common'

defineProps<{ level: number }>()
</script>

<template>
  <span class="mx-dots" role="img" :aria-label="levelLabel(level)">
    <span v-for="n in 3" :key="n" class="mx-dots__dot" :data-on="n <= level ? '' : undefined" />
  </span>
</template>

<style scoped>
.mx-dots { display: inline-flex; gap: 0.25rem; align-items: center; }
.mx-dots__dot {
  width: 0.65rem;
  height: 0.65rem;
  border: var(--mx-stroke) solid var(--mx-ink-soft);
  border-radius: var(--mx-radius-round);
}
.mx-dots__dot[data-on] {
  background: repeating-linear-gradient(-45deg, transparent 0 2px, rgb(255 255 255 / 0.3) 2px 3px), var(--mx-orange);
  border-color: var(--mx-orange);
}
</style>
