<script setup lang="ts">
// An <img> of a photo with its adjustment applied. Fills its box; the fit mode is chosen by the caller.
import { useDevelopedUrl } from './useDevelopedUrl'
import type { DevelopedKind } from './developedCache'

const props = withDefaults(defineProps<{ photoId: string; alt?: string; kind?: DevelopedKind; fit?: 'cover' | 'contain' }>(), {
  alt: '',
  kind: 'full',
  fit: 'cover',
})
const src = useDevelopedUrl(() => props.photoId, props.kind)
</script>

<template>
  <span class="dimg" :style="{ '--dimg-fit': fit }">
    <img v-if="src" :src="src" :alt="alt" decoding="async" />
  </span>
</template>

<style scoped>
.dimg { display: block; width: 100%; aspect-ratio: 3 / 4; overflow: hidden; background: var(--mx-paper-deep); }
.dimg img { width: 100%; height: 100%; object-fit: var(--dimg-fit); }
</style>
