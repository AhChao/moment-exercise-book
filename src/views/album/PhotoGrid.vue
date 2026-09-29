<script setup lang="ts">
import type { PhotoMeta } from '@/types'
import PhotoThumb from '@/ui/PhotoThumb.vue'
import { photoAlt } from '@/copy/album'

defineProps<{ photos: PhotoMeta[] }>()
</script>

<template>
  <ul class="mx-strip mx-grid">
    <li v-for="(p, i) in photos" :key="p.id" class="mx-grid__cell">
      <RouterLink :to="`/photo/${p.id}`" class="mx-grid__link">
        <PhotoThumb :photo-id="p.id" :alt="photoAlt(i)" />
      </RouterLink>
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
.mx-grid__link { display: block; width: 100%; height: 100%; }
</style>
