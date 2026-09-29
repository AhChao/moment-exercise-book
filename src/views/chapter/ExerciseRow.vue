<script setup lang="ts">
import { computed } from 'vue'
import type { Attempt, Exercise } from '@/types'
import LevelDots from '@/ui/LevelDots.vue'
import PhotoThumb from '@/ui/PhotoThumb.vue'
import PhotoLightbox from '@/ui/lightbox/PhotoLightbox.vue'
import { useLightbox } from '@/ui/lightbox/useLightbox'
import { openAria } from '@/copy/lightbox'
import { common } from '@/copy/common'
import { frameName, needLabels } from '@/copy/chapter'
import { assignedPhotos, visibleNeeds } from './rowInfo'

const props = defineProps<{ exercise: Exercise; attempt?: Attempt }>()

const needs = computed(() => visibleNeeds(props.exercise.needs))
const photos = computed(() => assignedPhotos(props.attempt))
const done = computed(() => (props.attempt?.completedAt ?? null) !== null)

const lb = useLightbox()
const openViewer = (photoId: string): void =>
  lb.open(photos.value.map((p) => ({ id: p.photoId, label: frameName(p.slot) })), photoId)
</script>

<template>
  <div class="mx-card mx-exrow">
    <RouterLink :to="`/exercise/${exercise.id}`" class="mx-exrow__link">
      <div class="mx-exrow__head">
        <h3 class="mx-heading mx-exrow__title">{{ exercise.title }}</h3>
        <span v-if="done" class="mx-stamp" data-tone="green">{{ common.completed }}</span>
      </div>
      <div class="mx-exrow__meta">
        <LevelDots :level="exercise.level" />
        <span v-for="n in needs" :key="n" class="mx-chip" data-tone="blue">{{ needLabels[n] }}</span>
      </div>
    </RouterLink>
    <ul v-if="photos.length" class="mx-exrow__thumbs">
      <li v-for="p in photos" :key="p.photoId" class="mx-exrow__thumb">
        <button type="button" class="mx-exrow__open" :aria-label="openAria(frameName(p.slot))" @click="openViewer(p.photoId)">
          <PhotoThumb :photo-id="p.photoId" :alt="frameName(p.slot)" />
        </button>
      </li>
    </ul>
    <PhotoLightbox
      v-if="lb.state.value"
      :items="lb.state.value.items"
      :start-id="lb.state.value.startId"
      @close="lb.close"
    />
  </div>
</template>

<style scoped>
.mx-exrow { display: block; }
.mx-exrow__link { display: block; color: inherit; text-decoration: none; }
.mx-exrow__open { display: block; width: 100%; height: 100%; padding: 0; background: transparent; border: 0; }
.mx-exrow__head { display: flex; align-items: flex-start; justify-content: space-between; gap: 0.75rem; }
.mx-exrow__title { min-width: 0; }
.mx-exrow__meta { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; margin-top: 0.45rem; }
.mx-exrow__thumbs { display: flex; gap: 0.35rem; margin-top: 0.7rem; padding: 0.3rem; background: var(--mx-film); }
.mx-exrow__thumb { flex: 1 1 0; max-width: 4.5rem; aspect-ratio: 3 / 4; overflow: hidden; }
</style>
