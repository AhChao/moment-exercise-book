<script setup lang="ts">
import { computed } from 'vue'
import { useLibrary } from '@/store'
import { chapters, exercisesOf } from '@/content/loader'
import EmptyState from '@/ui/EmptyState.vue'
import CoverHeader from './home/CoverHeader.vue'
import ContinueCard from './home/ContinueCard.vue'
import ChapterCard from './home/ChapterCard.vue'
import DeviceNotice from './home/DeviceNotice.vue'
import { chapterProgress, findContinue, type ChapterWithExercises } from './home/progress'
import { common } from '@/copy/common'
import { home } from '@/copy/home'

const library = useLibrary()
const book: ChapterWithExercises[] = chapters().map((chapter) => ({ chapter, exercises: exercisesOf(chapter.id) }))
const next = computed(() => findContinue(book, library.attempts.value))
</script>

<template>
  <main class="mx-page">
    <CoverHeader />
    <DeviceNotice />

    <p v-if="!library.loaded.value" class="mx-muted mx-home__loading" role="status">{{ common.loading }}</p>
    <template v-else>
      <ContinueCard v-if="next" :target="next" />
      <EmptyState
        v-else
        :title="home.allDone.title"
        :message="home.allDone.message"
        icon="album"
        :action-label="home.allDone.action"
        action-to="/album"
      />

      <hr class="mx-rule" />
      <h2 class="mx-heading mx-home__contents">{{ home.contents }}</h2>
      <ul class="mx-home__list">
        <li v-for="(entry, index) in book" :key="entry.chapter.id">
          <ChapterCard :number="index + 1" :chapter="entry.chapter" :progress="chapterProgress(entry.exercises, library.attempts.value)" />
        </li>
      </ul>
    </template>
  </main>
</template>

<style scoped>
.mx-home__loading { padding: 2rem 0; text-align: center; }
.mx-home__contents { margin-bottom: 0.9rem; }
.mx-home__list { display: grid; gap: 1rem; }
</style>
