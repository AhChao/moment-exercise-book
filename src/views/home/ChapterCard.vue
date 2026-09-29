<script setup lang="ts">
import { computed } from 'vue'
import type { Chapter } from '@/types'
import { chapterNumber } from '@/copy/home'
import { progress as progressText } from '@/copy/common'
import { percent, type Progress } from './progress'

const props = defineProps<{ chapter: Chapter; progress: Progress; number: number }>()
const fill = computed(() => `${percent(props.progress)}%`)
</script>

<template>
  <RouterLink :to="`/chapter/${chapter.id}`" class="mx-card mx-chaptercard">
    <div class="mx-chaptercard__head">
      <span class="mx-mono mx-muted">{{ chapterNumber(number) }}</span>
      <h3 class="mx-heading">{{ chapter.title }}</h3>
    </div>
    <p class="mx-muted mx-chaptercard__blurb">{{ chapter.blurb }}</p>
    <div class="mx-chaptercard__bar">
      <div class="mx-pencilbar" role="presentation"><span :style="{ width: fill }" /></div>
      <span class="mx-mono mx-chaptercard__count">{{ progressText(progress.done, progress.total) }}</span>
    </div>
  </RouterLink>
</template>

<style scoped>
.mx-chaptercard { display: block; }
.mx-chaptercard__head { display: flex; align-items: baseline; gap: 0.6rem; }
.mx-chaptercard__blurb { margin-top: 0.25rem; font-size: var(--mx-text-sm); }
.mx-chaptercard__bar { display: flex; align-items: center; gap: 0.7rem; margin-top: 0.7rem; }
.mx-chaptercard__bar .mx-pencilbar { flex: 1 1 auto; }
.mx-chaptercard__count { font-size: var(--mx-text-sm); white-space: nowrap; }
</style>
