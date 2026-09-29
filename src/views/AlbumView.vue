<script setup lang="ts">
import { computed } from 'vue'
import { useLibrary } from '@/store'
import { chapters, chapterOfExercise } from '@/content/loader'
import { useRouteQuery } from '@/lib/route-query'
import EmptyState from '@/ui/EmptyState.vue'
import FilterChips, { type ChipOption } from './album/FilterChips.vue'
import PhotoGrid from './album/PhotoGrid.vue'
import { LENS_FILTERS, filterPhotos, normalizeLens, photosByChapter } from './album/filterPhotos'
import { common, lensLabels } from '@/copy/common'
import { album, photoCount } from '@/copy/album'

const library = useLibrary()
const lensQuery = useRouteQuery('lens', '')
const chapterQuery = useRouteQuery('chapter', '')

const lens = computed({
  get: () => normalizeLens(lensQuery.value),
  set: (v: string) => (lensQuery.value = v),
})

const byChapter = computed(() => photosByChapter(library.attempts.value, (id) => chapterOfExercise(id)?.id))
const shown = computed(() =>
  filterPhotos(library.photos.value, { lens: lens.value, chapter: chapterQuery.value }, byChapter.value),
)

const lensOptions = computed<ChipOption[]>(() => [
  { value: '', label: album.filterAll },
  ...LENS_FILTERS.map((value) => ({ value, label: lensLabels[value] })),
])
// only chapters that hold photos are offered; the active one stays listed so it can be cleared
const chapterOptions = computed<ChipOption[]>(() => [
  { value: '', label: album.filterAll },
  ...chapters()
    .filter((c) => byChapter.value.has(c.id) || c.id === chapterQuery.value)
    .map((c) => ({ value: c.id, label: c.title })),
])

function clearFilters() {
  lensQuery.value = ''
  chapterQuery.value = ''
}
</script>

<template>
  <main class="mx-page">
    <header class="mx-album__head">
      <h1 class="mx-title">{{ album.title }}</h1>
      <span v-if="library.loaded.value" class="mx-kicker">{{ photoCount(shown.length) }}</span>
    </header>

    <p v-if="!library.loaded.value" class="mx-muted mx-album__state" role="status">{{ common.loading }}</p>

    <EmptyState
      v-else-if="!library.photos.value.length"
      :title="album.empty.title"
      :message="album.empty.message"
      icon="album"
      :action-label="common.backToNotebook"
      action-to="/"
    />

    <template v-else>
      <FilterChips v-model="lens" :options="lensOptions" :label="album.lensFilter" />
      <FilterChips
        v-if="chapterOptions.length > 1"
        v-model="chapterQuery"
        :options="chapterOptions"
        :label="album.chapterFilter"
      />
      <PhotoGrid v-if="shown.length" :photos="shown" class="mx-album__grid" />
      <EmptyState
        v-else
        :title="album.emptyFiltered.title"
        :action-label="album.emptyFiltered.action"
        @action="clearFilters"
      />
    </template>
  </main>
</template>

<style scoped>
.mx-album__head { display: flex; align-items: baseline; justify-content: space-between; gap: 1rem; margin-bottom: 0.75rem; }
.mx-album__state { padding: 2rem 0; text-align: center; }
.mx-album__grid { margin-top: 0.75rem; }
</style>
