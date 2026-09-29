<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useLibrary } from '@/store'
import { chapterById, exercisesOf } from '@/content/loader'
import EmptyState from '@/ui/EmptyState.vue'
import PageHeader from '@/ui/PageHeader.vue'
import ExerciseRow from './chapter/ExerciseRow.vue'
import { chapterProgress } from './home/progress'
import { common, progress as progressText } from '@/copy/common'
import { chapterCopy } from '@/copy/chapter'

const route = useRoute()
const library = useLibrary()

const chapter = computed(() => chapterById(String(route.params.chapterId ?? '')))
const exercises = computed(() => (chapter.value ? exercisesOf(chapter.value.id) : []))
const done = computed(() => chapterProgress(exercises.value, library.attempts.value))
</script>

<template>
  <main class="mx-page">
    <EmptyState
      v-if="!chapter"
      :title="chapterCopy.notFound.title"
      :message="chapterCopy.notFound.message"
      :action-label="common.backToNotebook"
      action-to="/"
    />
    <template v-else>
      <PageHeader :title="chapter.title" :blurb="chapter.blurb" back-to="/" :back-label="common.notebook" />
      <p v-if="library.loaded.value" class="mx-kicker mx-chapter__progress">{{ progressText(done.done, done.total) }}</p>

      <p v-if="!library.loaded.value" class="mx-muted mx-chapter__state" role="status">{{ common.loading }}</p>
      <p v-else-if="!exercises.length" class="mx-muted mx-chapter__state">{{ chapterCopy.noExercises }}</p>
      <ul v-else class="mx-chapter__list">
        <li v-for="exercise in exercises" :key="exercise.id">
          <ExerciseRow :exercise="exercise" :attempt="library.attempts.value[exercise.id]" />
        </li>
      </ul>
    </template>
  </main>
</template>

<style scoped>
.mx-chapter__progress { margin: -0.4rem 0 1rem; }
.mx-chapter__state { padding: 2rem 0; text-align: center; }
.mx-chapter__list { display: grid; gap: 1rem; }
</style>
