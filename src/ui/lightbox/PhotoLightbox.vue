<script setup lang="ts">
// Full-screen photo viewer. Mounted by its host with v-if (open == mounted). Teleported to <body> so no
// ancestor overflow or backdrop-filter can clip it. One shared view transform survives photo switches.
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import Icon from '../Icon.vue'
import { lockScroll, unlockScroll } from '../scrollLock'
import { common } from '@/copy/common'
import { counter, lightboxCopy, photoName } from '@/copy/lightbox'
import LightboxStage from './LightboxStage.vue'
import { keepIndex, startIndex, stepIndex, type LightboxItem } from './lightboxNav'
import { useFocusTrap } from './useFocusTrap'
import { useLightboxView } from './useLightboxView'

const props = defineProps<{ items: LightboxItem[]; startId: string }>()
const emit = defineEmits<{
  /** 'adjust' means the learner followed the adjustment link; the host must not navigate elsewhere. */
  close: [reason: 'dismiss' | 'adjust']
  /** the photo now on screen */
  change: [id: string]
}>()

const panel = ref<HTMLElement | null>(null)
const view = useLightboxView()
const { trapTab } = useFocusTrap(panel)

const currentId = ref(props.items[startIndex(props.items, props.startId)]?.id ?? '')
const index = computed(() => keepIndex(props.items, currentId.value, 0))
const item = computed(() => props.items[index.value])
const many = computed(() => props.items.length > 1)

function go(dir: 1 | -1): void {
  const next = props.items[stepIndex(index.value, dir, props.items.length)]
  if (next) currentId.value = next.id // the view transform is deliberately left alone
}

watch(currentId, (id) => emit('change', id))
watch(() => props.items.length, (n) => {
  if (n === 0) emit('close', 'dismiss')
})

let locked = false
onMounted(() => {
  locked = true
  lockScroll()
})
onBeforeUnmount(() => {
  if (locked) unlockScroll()
  locked = false
})

let armed = false
function onBackdropDown(e: PointerEvent): void {
  armed = e.target === e.currentTarget
  if (armed) e.preventDefault()
}
function onBackdropClick(e: MouseEvent): void {
  const was = armed
  armed = false
  if (was && e.target === e.currentTarget) emit('close', 'dismiss')
}

function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    e.stopPropagation()
    emit('close', 'dismiss')
  } else if (e.key === 'ArrowLeft') go(-1)
  else if (e.key === 'ArrowRight') go(1)
  else if (e.key === '+' || e.key === '=') view.zoomIn()
  else if (e.key === '-') view.zoomOut()
  else if (e.key === '0') view.reset()
  else trapTab(e)
}
</script>

<template>
  <Teleport to="body">
    <div class="lb" @pointerdown="onBackdropDown" @click="onBackdropClick" @keydown="onKeydown">
      <div ref="panel" class="lb__panel mx-card mx-card--flat" role="dialog" aria-modal="true" :aria-label="lightboxCopy.dialog" tabindex="-1">
        <header class="lb__bar">
          <span v-if="many" class="lb__count mx-mono">{{ counter(index, items.length) }}</span>
          <span class="lb__label">{{ item?.label }}</span>
          <RouterLink
            v-if="item"
            class="mx-btn mx-btn--small mx-btn--quiet"
            :to="`/photo/${item.id}`"
            :aria-label="lightboxCopy.adjustAria"
            @click="emit('close', 'adjust')"
          >
            <Icon name="pencil" />{{ lightboxCopy.adjust }}
          </RouterLink>
          <button type="button" class="mx-iconbtn" :aria-label="common.close" @click="emit('close', 'dismiss')"><Icon name="close" /></button>
        </header>

        <LightboxStage v-if="item" :photo-id="item.id" :alt="photoName(item.label, index)" :view="view" @swipe="go" />

        <footer class="lb__tools">
          <button v-if="many" type="button" class="mx-iconbtn" :disabled="index === 0" :aria-label="lightboxCopy.prev" @click="go(-1)"><Icon name="chevron-left" /></button>
          <button type="button" class="mx-iconbtn" :aria-label="lightboxCopy.zoomOut" @click="view.zoomOut()"><Icon name="minus" /></button>
          <button type="button" class="mx-iconbtn" :disabled="!view.zoomed.value" :aria-label="lightboxCopy.reset" @click="view.reset()"><Icon name="fit" /></button>
          <button type="button" class="mx-iconbtn" :aria-label="lightboxCopy.zoomIn" @click="view.zoomIn()"><Icon name="plus" /></button>
          <button v-if="many" type="button" class="mx-iconbtn" :disabled="index === items.length - 1" :aria-label="lightboxCopy.next" @click="go(1)"><Icon name="chevron-right" /></button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.lb {
  position: fixed;
  inset: 0;
  z-index: var(--ui-z-modal);
  box-sizing: border-box;
  padding: max(7dvh, env(safe-area-inset-top)) max(5vw, env(safe-area-inset-right)) max(7dvh, env(safe-area-inset-bottom)) max(5vw, env(safe-area-inset-left));
  background: var(--ui-overlay);
}
.lb__panel {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  padding: 0;
  overflow: hidden;
  box-shadow: var(--ui-shadow-3);
}
.lb__bar, .lb__tools {
  flex: none;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.15rem 0.35rem;
}
.lb__bar { justify-content: flex-end; }
.lb__tools { justify-content: center; }
.lb__count { padding-left: 0.6rem; color: var(--mx-ink-soft); }
.lb__label { flex: 1 1 auto; min-width: 0; overflow: hidden; font-family: var(--mx-font-hand); text-overflow: ellipsis; white-space: nowrap; }
.lb__bar > .lb__count + .lb__label { text-align: left; }
.lb button:disabled { opacity: 0.35; }
</style>
