<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import Icon from './Icon.vue'
import { common } from '@/copy/common'

withDefaults(
  defineProps<{
    title: string
    /** When set, a back link is shown above the title. */
    backTo?: RouteLocationRaw
    backLabel?: string
    /** Optional one-line description under the title. */
    blurb?: string
  }>(),
  { backTo: undefined, backLabel: common.back, blurb: '' },
)
</script>

<template>
  <header class="mx-pageheader">
    <RouterLink v-if="backTo" :to="backTo" class="mx-pageheader__back">
      <Icon name="chevron-left" />
      <span>{{ backLabel }}</span>
    </RouterLink>
    <h1 class="mx-title">{{ title }}</h1>
    <p v-if="blurb" class="mx-muted mx-pageheader__blurb">{{ blurb }}</p>
    <slot />
  </header>
</template>

<style scoped>
.mx-pageheader { margin-bottom: 1rem; }
.mx-pageheader__back {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  min-height: 2.75rem;
  padding-right: 0.75rem;
  font-family: var(--mx-font-hand);
  font-size: var(--mx-text-lg);
  color: var(--mx-ink-soft);
}
.mx-pageheader__blurb { margin-top: 0.3rem; }
</style>
