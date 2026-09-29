<script setup lang="ts">
// One frame of an exercise: the photo when assigned, otherwise a dashed empty frame with the targets.
import type { PhotoMeta, Shot } from '@/types'
import Icon from '@/ui/Icon.vue'
import { exerciseCopy, frameAria } from '@/copy/exercise'
import TargetChips from './TargetChips.vue'

defineProps<{
  shot: Shot
  index: number
  photo: PhotoMeta | null
  thumb?: string
  selected: boolean
  /** the frame is filled from the album instead of the in-app camera */
  fromAlbum: boolean
}>()
defineEmits<{ tap: [] }>()
</script>

<template>
  <button
    type="button"
    class="slot"
    :class="{ 'slot--selected': selected }"
    :aria-label="frameAria(index + 1, shot.label)"
    :aria-pressed="selected"
    @click="$emit('tap')"
  >
    <span class="mx-frame slot__frame">
      <span class="mx-frame__image slot__image">
        <img v-if="photo && thumb" :src="thumb" :alt="shot.label" />
        <span v-else-if="!photo" class="slot__empty">
          <Icon :name="fromAlbum ? 'album' : 'camera'" />
          <span class="mx-muted">{{ exerciseCopy.emptyFrame }}</span>
          <span v-if="fromAlbum" class="mx-chip">{{ exerciseCopy.cameraAppTag }}</span>
          <TargetChips :spec="shot.capture" dense />
        </span>
      </span>
      <span class="mx-frame__caption">{{ shot.label }}</span>
    </span>
  </button>
</template>

<style scoped>
.slot {
  display: block;
  width: 100%;
  min-height: 2.75rem;
  padding: 0.6rem 0.3rem 0.3rem;
  text-align: inherit;
  background: transparent;
  border: 0;
}
.slot__frame { display: block; }
.slot__image { display: block; }
.slot--selected .slot__frame { box-shadow: var(--mx-shadow-lift); outline: var(--mx-stroke-bold) solid var(--mx-blue); }
.slot__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  height: 100%;
  padding: 0.5rem;
  overflow: auto;
  font-size: var(--mx-text-sm);
  border: var(--mx-stroke) dashed var(--mx-ink-faint);
}
.slot__empty :deep(.chips) { justify-content: center; }
</style>
