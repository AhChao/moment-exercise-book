<script setup lang="ts">
import Icon from '@/ui/Icon.vue'
import { home } from '@/copy/home'
import { progress as progressText } from '@/copy/common'
import type { ContinueTarget } from './progress'

defineProps<{ target: ContinueTarget }>()
</script>

<template>
  <RouterLink :to="`/exercise/${target.exercise.id}`" class="mx-card mx-continue">
    <div class="mx-continue__text">
      <p class="mx-kicker">{{ target.started ? home.continueKicker : home.startKicker }}</p>
      <h2 class="mx-heading">{{ target.exercise.title }}</h2>
      <p class="mx-muted mx-continue__meta">
        {{ target.chapter.title }} · {{ progressText(target.progress.done, target.progress.total) }}
      </p>
    </div>
    <Icon name="chevron-right" class="mx-continue__go" />
  </RouterLink>
</template>

<style scoped>
.mx-continue { display: flex; align-items: center; gap: 0.75rem; min-height: 4.5rem; }
.mx-continue__text { flex: 1 1 auto; min-width: 0; }
.mx-continue__meta { font-size: var(--mx-text-sm); }
.mx-continue__go { font-size: 1.6rem; color: var(--mx-red); }
</style>
