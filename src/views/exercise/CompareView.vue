<script setup lang="ts">
// Two-up comparison of the filled frames, scroll-snapped, with shutter and ISO under each photo.
import { computed } from 'vue'
import type { PhotoMeta, Shot } from '@/types'
import { captionOf } from '../photo/photoInfo'
import { filledIndexes } from './slots'

const props = defineProps<{
  shots: readonly Shot[]
  photos: readonly (PhotoMeta | null)[]
  urls: Record<string, string>
  thumbs: Record<string, string>
}>()

const items = computed(() =>
  filledIndexes(props.photos).map((i) => {
    const photo = props.photos[i] as PhotoMeta
    return { key: photo.id, label: props.shots[i]?.label ?? '', url: props.urls[photo.id] ?? props.thumbs[photo.id], caption: captionOf(photo) }
  }),
)
</script>

<template>
  <ul class="compare">
    <li v-for="it in items" :key="it.key" class="compare__item">
      <figure class="mx-frame compare__frame">
        <img v-if="it.url" class="compare__img" :src="it.url" :alt="it.label" />
        <figcaption class="mx-frame__caption">{{ it.label }}</figcaption>
        <p v-if="it.caption" class="compare__data mx-mono">{{ it.caption }}</p>
      </figure>
    </li>
  </ul>
</template>

<style scoped>
.compare {
  display: flex;
  gap: 0.8rem;
  padding: 0.8rem 0.2rem 0.4rem;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  overscroll-behavior-x: contain;
}
.compare__item { flex: 0 0 calc(50% - 0.4rem); scroll-snap-align: start; }
.compare__frame { margin: 0; }
.compare__img { width: 100%; aspect-ratio: 3 / 4; object-fit: cover; background: var(--mx-paper-deep); }
.compare__data { margin-top: 0.15rem; font-size: var(--mx-text-sm); text-align: center; color: var(--mx-ink-soft); }
</style>
