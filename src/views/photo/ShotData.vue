<script setup lang="ts">
import type { DataRow } from './photoInfo'
import { photoCopy } from '@/copy/photo'

defineProps<{ rows: readonly DataRow[] }>()
</script>

<template>
  <section class="data">
    <h2 class="mx-heading">{{ photoCopy.dataHeading }}</h2>
    <dl class="data__list">
      <div v-for="r in rows" :key="r.key" class="data__row">
        <dt class="mx-kicker">{{ r.label }}</dt>
        <dd class="mx-mono">{{ r.value }}</dd>
      </div>
    </dl>
  </section>
</template>

<style scoped>
.data { display: grid; gap: 0.5rem; }
.data__list { display: grid; margin: 0; }
.data__row { display: flex; justify-content: space-between; gap: 1rem; padding: 0.3rem 0; border-bottom: var(--mx-stroke) dotted var(--mx-ink-faint); }
.data__row dd { margin: 0; text-align: right; }
</style>
