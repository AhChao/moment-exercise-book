<script setup lang="ts">
import { useToasts, dismissToast } from './useToast'

const state = useToasts()
</script>

<template>
  <Teleport to="body">
    <div class="mx-toast-stack" role="status" aria-live="polite">
      <TransitionGroup name="mx-toast">
        <button
          v-for="t in state.toasts"
          :key="t.id"
          type="button"
          class="mx-toast"
          :data-level="t.level"
          @click="dismissToast(t.id)"
        >
          {{ t.message }}
        </button>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.mx-toast-stack {
  position: fixed;
  bottom: calc(1.25rem + env(safe-area-inset-bottom));
  left: 50%;
  z-index: var(--ui-z-toast);
  display: flex;
  flex-direction: column-reverse; /* newest above older ones */
  gap: 0.6rem;
  width: min(92vw, 24rem);
  transform: translateX(-50%);
  pointer-events: none;
}

.mx-toast {
  pointer-events: auto;
  min-height: 2.75rem;
  padding: 0.5rem 1rem;
  font-family: var(--mx-font-hand);
  font-size: var(--mx-text-md);
  font-weight: 700;
  text-align: center;
  color: var(--ui-on-accent);
  background: var(--ui-accent);
  border: 0;
  border-radius: var(--mx-radius);
  box-shadow: var(--ui-shadow-3);
}
.mx-toast[data-level='info'] { background: var(--mx-blue); color: var(--ui-on-accent); }
.mx-toast[data-level='success'] { background: var(--ui-success); color: var(--ui-on-success); }
.mx-toast[data-level='warning'] { background: var(--ui-warning); color: var(--ui-on-warning); }
.mx-toast[data-level='error'] { background: var(--ui-danger); color: var(--ui-on-danger); }

.mx-toast-enter-active,
.mx-toast-leave-active,
.mx-toast-move {
  transition: opacity var(--ui-dur-base) var(--ui-ease), transform var(--ui-dur-base) var(--ui-ease);
}
.mx-toast-enter-from,
.mx-toast-leave-to { opacity: 0; transform: translateY(8px); }
.mx-toast-leave-active { position: absolute; width: 100%; } /* leaving toasts leave the flow so the stack reflows */
</style>
