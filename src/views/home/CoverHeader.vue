<script setup lang="ts">
import { common } from '@/copy/common'
import { home } from '@/copy/home'
</script>

<template>
  <header class="mx-cover">
    <h1 class="mx-cover__title">{{ common.productName }}</h1>
    <p class="mx-muted mx-cover__sub">{{ home.subtitle }}</p>
    <div class="mx-strip mx-cover__strip" aria-hidden="true">
      <span v-for="n in 4" :key="n" class="mx-cover__cell" />
    </div>
  </header>
</template>

<style scoped>
.mx-cover { margin: 0.5rem 0 1.5rem; text-align: center; }
.mx-cover__title { font-size: var(--mx-text-cover); line-height: 1.15; }
.mx-cover__sub { margin-top: 0.35rem; }
.mx-cover__strip {
  display: flex;
  gap: 0.4rem;
  width: 70%;
  margin: 1rem auto 0;
  transform: rotate(-1deg);
}
.mx-cover__cell {
  flex: 1 1 0;
  aspect-ratio: 4 / 3;
  background: var(--mx-paper-deep);
  border-radius: 1px;
  opacity: 0.85;
}
.mx-cover__cell:nth-child(2) { background: rgb(var(--mx-orange-rgb) / 0.7); }
.mx-cover__cell:nth-child(3) { background: rgb(var(--mx-teal-rgb) / 0.7); }
</style>
