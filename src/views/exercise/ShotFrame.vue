<script setup lang="ts">
// One frame of an exercise: the photo when assigned, otherwise a dashed empty frame with the targets.
// A filled frame has two targets: the photo opens the viewer, the caption selects the frame.
import type { PhotoMeta, Shot } from '@/types'
import Icon from '@/ui/Icon.vue'
import PhotoThumb from '@/ui/PhotoThumb.vue'
import { exerciseCopy, frameAria } from '@/copy/exercise'
import { openAria } from '@/copy/lightbox'
import TargetChips from './TargetChips.vue'

defineProps<{
  shot: Shot
  index: number
  photo: PhotoMeta | null
  selected: boolean
  /** the frame is filled from the album instead of the in-app camera */
  fromAlbum: boolean
}>()
defineEmits<{ tap: []; open: [] }>()
</script>

<template>
  <div class="slot">
    <span v-if="photo" class="mx-frame slot__frame" :class="{ 'slot__frame--selected': selected }">
      <button type="button" class="mx-frame__image slot__image" :aria-label="openAria(shot.label)" @click="$emit('open')">
        <PhotoThumb :photo-id="photo.id" :alt="shot.label" />
      </button>
      <button
        type="button"
        class="mx-frame__caption slot__caption"
        :aria-label="frameAria(index + 1, shot.label)"
        :aria-pressed="selected"
        @click="$emit('tap')"
      >{{ shot.label }}</button>
    </span>
    <button
      v-else
      type="button"
      class="slot__btn"
      :aria-label="frameAria(index + 1, shot.label)"
      :aria-pressed="selected"
      @click="$emit('tap')"
    >
      <span class="mx-frame slot__frame" :class="{ 'slot__frame--selected': selected }">
        <span class="mx-frame__image slot__image">
          <span class="slot__empty">
            <Icon :name="fromAlbum ? 'album' : 'camera'" />
            <span class="mx-muted">{{ exerciseCopy.emptyFrame }}</span>
            <span v-if="fromAlbum" class="mx-chip">{{ exerciseCopy.cameraAppTag }}</span>
            <TargetChips :spec="shot.capture" dense />
          </span>
        </span>
        <span class="mx-frame__caption">{{ shot.label }}</span>
      </span>
    </button>
  </div>
</template>

<style scoped>
.slot { padding: 0.6rem 0.3rem 0.3rem; }
.slot__btn {
  display: block;
  width: 100%;
  min-height: 2.75rem;
  padding: 0;
  text-align: inherit;
  background: transparent;
  border: 0;
}
.slot__frame { display: block; }
.slot__image { display: block; width: 100%; padding: 0; border: 0; }
.slot__caption {
  display: block;
  width: 100%;
  min-height: 2.75rem;
  padding: 0;
  color: inherit;
  background: transparent;
  border: 0;
}
.slot__frame--selected { box-shadow: var(--mx-shadow-lift); outline: var(--mx-stroke-bold) solid var(--mx-blue); }
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
