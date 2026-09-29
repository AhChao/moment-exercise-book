<script setup lang="ts">
// The fixed stage box. The image fills it with object-fit: contain; the shared view transform is
// applied to the image, so every photo is framed identically and zoomed points line up across photos.
import { watch } from 'vue'
import { useDevelopedUrl } from '../developed/useDevelopedUrl'
import { useStageGestures } from './useStageGestures'
import type { LightboxView } from './useLightboxView'

const props = defineProps<{ photoId: string; alt: string; view: LightboxView }>()
const emit = defineEmits<{ swipe: [dir: 1 | -1] }>()

const src = useDevelopedUrl(() => props.photoId, 'full')
const g = useStageGestures(props.view, (dir) => emit('swipe', dir))

// The next photo's natural size arrives with its load event.
watch(() => props.photoId, () => {
  props.view.natural.value = null
})

function onLoad(e: Event): void {
  const img = e.target as HTMLImageElement
  props.view.natural.value = { w: img.naturalWidth, h: img.naturalHeight }
}
</script>

<template>
  <div
    :ref="(el) => (view.stageEl.value = el as HTMLElement | null)"
    class="stage"
    :class="{ 'stage--zoomed': view.zoomed.value }"
    @pointerdown="g.onPointerDown"
    @pointermove="g.onPointerMove"
    @pointerup="g.onPointerUp"
    @pointercancel="g.onPointerCancel"
  >
    <img v-if="src" class="stage__img" :src="src" :alt="alt" :style="view.style.value" draggable="false" @load="onLoad" />
  </div>
</template>

<style scoped>
.stage {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  cursor: zoom-in;
}
.stage--zoomed { cursor: grab; }
.stage__img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  transform-origin: 50% 50%;
  will-change: transform;
  -webkit-user-drag: none;
}
</style>
