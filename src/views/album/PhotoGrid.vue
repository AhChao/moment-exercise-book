<script setup lang="ts">
import type { PhotoMeta } from '@/types'
import PhotoThumb from '@/ui/PhotoThumb.vue'
import { photoAlt } from '@/copy/album'
import { openAria } from '@/copy/lightbox'

defineProps<{ photos: PhotoMeta[] }>()
defineEmits<{ open: [photoId: string] }>()
</script>

<template>
  <ul class="mx-strip mx-grid">
    <li v-for="(p, i) in photos" :key="p.id" class="mx-grid__cell">
      <button type="button" class="mx-grid__link" :aria-label="openAria(photoAlt(i))" @click="$emit('open', p.id)">
        <PhotoThumb :photo-id="p.id" :alt="photoAlt(i)" />
      </button>
    </li>
  </ul>
</template>

<style scoped>
.mx-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.3rem;
  padding-inline: 0.5rem;
  /* perforations sit in the strip's padding, so the grid needs room above and below */
  padding-block: 1.25rem;
}
.mx-grid__cell { aspect-ratio: 3 / 4; overflow: hidden; background: var(--mx-paper-deep); }
.mx-grid__link { display: block; width: 100%; height: 100%; padding: 0; background: transparent; border: 0; }
</style>
