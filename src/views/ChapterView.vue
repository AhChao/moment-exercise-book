<script setup lang="ts">
import { computed, defineAsyncComponent, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useLibrary } from '@/store'
import { chapterById, exercisesOf } from '@/content/loader'
import EmptyState from '@/ui/EmptyState.vue'
import PageHeader from '@/ui/PageHeader.vue'
import ExerciseRow from './chapter/ExerciseRow.vue'
import { chapterProgress } from './home/progress'
import { common, progress as progressText } from '@/copy/common'
import { chapterCopy } from '@/copy/chapter'
import { share } from '@/copy/share'
import { buildSources } from '@/share/ui/sources'

const ExportDialog = defineAsyncComponent(() => import('@/share/ui/ExportDialog.vue'))

const route = useRoute()
const library = useLibrary()

const chapter = computed(() => chapterById(String(route.params.chapterId ?? '')))
const exercises = computed(() => (chapter.value ? exercisesOf(chapter.value.id) : []))
const done = computed(() => chapterProgress(exercises.value, library.attempts.value))

const exportOpen = ref(false)
const exportSources = computed(() =>
  chapter.value ? buildSources(exercises.value, chapter.value.title, library.attempts.value, library.photos.value) : [],
)
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
      <div v-if="library.loaded.value" class="mx-chapter__bar">
        <p class="mx-kicker">{{ progressText(done.done, done.total) }}</p>
        <button v-if="exercises.length" type="button" class="mx-btn mx-btn--small mx-btn--quiet" @click="exportOpen = true">
          {{ share.exportChapter }}
        </button>
      </div>

      <p v-if="!library.loaded.value" class="mx-muted mx-chapter__state" role="status">{{ common.loading }}</p>
      <p v-else-if="!exercises.length" class="mx-muted mx-chapter__state">{{ chapterCopy.noExercises }}</p>
      <ul v-else class="mx-chapter__list">
        <li v-for="exercise in exercises" :key="exercise.id">
          <ExerciseRow :exercise="exercise" :attempt="library.attempts.value[exercise.id]" />
        </li>
      </ul>
      <ExportDialog v-if="exportOpen" v-model:open="exportOpen" scope="chapter" :scope-id="chapter.id" :sources="exportSources" />
    </template>
  </main>
</template>

<style scoped>
.mx-chapter__bar { display: flex; align-items: center; justify-content: space-between; gap: 0.8rem; margin: -0.4rem 0 1rem; }
.mx-chapter__state { padding: 2rem 0; text-align: center; }
.mx-chapter__list { display: grid; gap: 1rem; }
</style>
