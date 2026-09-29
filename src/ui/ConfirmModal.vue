<script setup lang="ts">
// Confirm dialog built on ModalShell. Danger dialogs put initial focus on the safe (cancel) action.
import ModalShell from './ModalShell.vue'
import { common } from '@/copy/common'

const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    message?: string
    confirmText?: string
    cancelText?: string
    danger?: boolean
    closeOnOverlay?: boolean
  }>(),
  { message: '', confirmText: common.confirm, cancelText: common.cancel, danger: false, closeOnOverlay: true },
)

const emit = defineEmits<{
  'update:open': [open: boolean]
  confirm: []
  cancel: []
}>()

function onOpenChange(open: boolean) {
  if (open) return
  emit('update:open', false)
  emit('cancel')
}

function confirm() {
  emit('update:open', false)
  emit('confirm')
}
</script>

<template>
  <ModalShell
    :open="props.open"
    size="sm"
    :title="props.title"
    :show-close="false"
    :close-on-overlay="props.closeOnOverlay"
    :initial-focus="props.danger ? '[data-cancel]' : '[data-confirm]'"
    @update:open="onOpenChange"
  >
    <p v-if="props.message" class="mx-confirm__message">{{ props.message }}</p>
    <slot />
    <template #footer>
      <button type="button" class="mx-btn mx-btn--quiet" data-cancel @click="onOpenChange(false)">
        {{ props.cancelText }}
      </button>
      <button
        type="button"
        class="mx-btn"
        :class="props.danger ? 'mx-btn--danger' : 'mx-btn--primary'"
        data-confirm
        @click="confirm"
      >
        {{ props.confirmText }}
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
.mx-confirm__message { color: var(--mx-ink-soft); }
</style>
