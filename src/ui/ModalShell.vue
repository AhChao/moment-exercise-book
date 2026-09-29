<script lang="ts">
let uidCounter = 0
</script>

<script setup lang="ts">
// Generic modal frame: overlay + paper sheet with pinned header/footer and a scrolling body.
// Contract (adapted from the collection's modal-shell): teleported to <body> so no ancestor
// overflow or backdrop-filter can clip it, refcounted scroll lock, focus trap, focus restored
// on close, Esc, backdrop dismiss only when the press STARTED on the backdrop, veto-able dismiss.
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import Icon from './Icon.vue'
import { lockScroll, unlockScroll } from './scrollLock'
import { common } from '@/copy/common'

export type DismissReason = 'overlay' | 'esc' | 'close-button'

const props = withDefaults(
  defineProps<{
    open: boolean
    size?: 'sm' | 'md' | 'lg'
    title?: string
    closeOnOverlay?: boolean
    closeOnEsc?: boolean
    showClose?: boolean
    /** CSS selector inside the panel to focus on open; falls back to [autofocus], then the panel. */
    initialFocus?: string
    /** Return false to veto a dismissal (e.g. to open a nested confirm instead). */
    beforeClose?: (reason: DismissReason) => boolean | void
  }>(),
  { size: 'md', title: '', closeOnOverlay: true, closeOnEsc: true, showClose: true, initialFocus: '', beforeClose: undefined },
)

const emit = defineEmits<{
  'update:open': [open: boolean]
  dismiss: [reason: DismissReason]
}>()

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), ' +
  'select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

const titleId = `mx-modal-${++uidCounter}-title`
const panelEl = ref<HTMLElement | null>(null)
let lastFocused: Element | null = null
let locked = false
let armed = false

function requestClose(reason: DismissReason) {
  if (props.beforeClose && props.beforeClose(reason) === false) return
  emit('dismiss', reason)
  emit('update:open', false)
}

function onPointerDown(e: PointerEvent) {
  armed = e.target === e.currentTarget
  if (armed) e.preventDefault() // keep focus inside the panel
}

function onClick(e: MouseEvent) {
  const wasArmed = armed
  armed = false
  if (wasArmed && e.target === e.currentTarget && props.closeOnOverlay) requestClose('overlay')
}

function focusables(): HTMLElement[] {
  const panel = panelEl.value
  if (!panel) return []
  return Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.getClientRects().length > 0)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (!props.closeOnEsc) return
    e.stopPropagation()
    requestClose('esc')
    return
  }
  if (e.key !== 'Tab') return
  const items = focusables()
  const panel = panelEl.value
  if (!panel) return
  const first = items[0]
  const last = items[items.length - 1]
  if (!first || !last) {
    e.preventDefault()
    panel.focus({ preventScroll: true })
    return
  }
  const active = document.activeElement
  if (e.shiftKey && (active === first || active === panel)) {
    e.preventDefault()
    last.focus({ preventScroll: true })
  } else if (!e.shiftKey && active === last) {
    e.preventDefault()
    first.focus({ preventScroll: true })
  }
}

function focusInitial() {
  const panel = panelEl.value
  if (!panel) return
  const target =
    (props.initialFocus ? panel.querySelector<HTMLElement>(props.initialFocus) : null) ??
    panel.querySelector<HTMLElement>('[autofocus]') ??
    panel
  target.focus({ preventScroll: true })
}

function release() {
  if (locked) {
    locked = false
    unlockScroll()
  }
}

watch(
  () => props.open,
  async (open) => {
    if (open) {
      lastFocused = document.activeElement
      if (!locked) {
        locked = true
        lockScroll()
      }
      await nextTick()
      focusInitial()
    } else {
      release()
      if (lastFocused instanceof HTMLElement && lastFocused.isConnected) lastFocused.focus({ preventScroll: true })
      lastFocused = null
    }
  },
  { immediate: true },
)

onBeforeUnmount(release)
</script>

<template>
  <Teleport to="body">
    <Transition name="mx-modal" appear>
      <div v-if="open" class="mx-modal-overlay" @pointerdown="onPointerDown" @click="onClick" @keydown="onKeydown">
        <div
          ref="panelEl"
          class="mx-modal mx-card mx-card--flat"
          :class="`mx-modal--${size}`"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="title || $slots.header ? titleId : undefined"
          tabindex="-1"
        >
          <header v-if="title || $slots.header" class="mx-modal__header">
            <h2 :id="titleId" class="mx-modal__title"><slot name="header">{{ title }}</slot></h2>
            <button
              v-if="showClose"
              type="button"
              class="mx-iconbtn"
              :aria-label="common.close"
              @click="requestClose('close-button')"
            >
              <Icon name="close" />
            </button>
          </header>
          <div class="mx-modal__body"><slot /></div>
          <footer v-if="$slots.footer" class="mx-modal__footer"><slot name="footer" /></footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.mx-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--ui-z-modal);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: var(--ui-overlay);
}

.mx-modal {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 28rem;
  max-height: 85dvh;
  padding: 0;
  box-shadow: var(--ui-shadow-3);
}
.mx-modal--sm { max-width: 22rem; }
.mx-modal--lg { max-width: 34rem; }

.mx-modal__header {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.85rem 0.75rem 0.4rem 1.15rem;
}
.mx-modal__title { font-size: var(--mx-text-lg); }

.mx-modal__body {
  flex: 1 1 auto;
  min-height: 0;
  padding: 0.5rem 1.15rem 1rem;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.mx-modal__footer {
  flex: none;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 0.5rem 1.15rem 1.1rem;
}

.mx-modal-enter-active,
.mx-modal-leave-active { transition: opacity var(--ui-dur-base) var(--ui-ease); }
.mx-modal-enter-active .mx-modal,
.mx-modal-leave-active .mx-modal { transition: transform var(--ui-dur-base) var(--ui-ease); }
.mx-modal-enter-from,
.mx-modal-leave-to { opacity: 0; }
.mx-modal-enter-from .mx-modal,
.mx-modal-leave-to .mx-modal { transform: scale(0.96) translateY(8px); }
</style>
