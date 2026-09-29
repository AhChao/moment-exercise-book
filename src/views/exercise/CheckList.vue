<script setup lang="ts">
// Judged checks: pass in green with the measured value, fail in red with measured value and target.
import type { CheckLine } from './checkText'
import { exerciseCopy } from '@/copy/exercise'

defineProps<{ lines: readonly CheckLine[] }>()
</script>

<template>
  <section v-if="lines.length" class="checks">
    <h2 class="mx-heading">{{ exerciseCopy.results }}</h2>
    <ul class="checks__list">
      <li v-for="l in lines" :key="l.key" class="checks__row" :data-status="l.status">
        <span class="mx-stamp" :data-tone="l.status === 'pass' ? 'green' : undefined">{{ l.frame }}</span>
        <span class="checks__field">{{ l.field }}</span>
        <span class="mx-mono checks__value">{{ l.measured }}</span>
        <span v-if="l.target" class="mx-muted checks__target">{{ l.target }}</span>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.checks { display: grid; gap: 0.5rem; margin-top: 1.4rem; }
.checks__list { display: grid; gap: 0.5rem; }
.checks__row { display: flex; flex-wrap: wrap; align-items: center; gap: 0.2rem 0.6rem; }
.checks__row[data-status='pass'] .checks__value { color: var(--mx-green); }
.checks__row[data-status='fail'] .checks__value { color: var(--mx-red); }
.checks__row .mx-stamp { transform: none; font-size: var(--mx-text-sm); }
.checks__target { font-size: var(--mx-text-sm); }
</style>
