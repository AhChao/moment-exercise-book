<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import Icon from './Icon.vue'
import type { IconName } from './icons'

withDefaults(
  defineProps<{
    title: string
    message?: string
    icon?: IconName
    /** Link out of the empty state, so the page is never a dead end. */
    actionLabel?: string
    actionTo?: RouteLocationRaw
  }>(),
  { message: '', icon: 'film', actionLabel: '', actionTo: undefined },
)

const emit = defineEmits<{ action: [] }>()
</script>

<template>
  <section class="mx-empty">
    <Icon :name="icon" class="mx-empty__icon" />
    <h2 class="mx-heading">{{ title }}</h2>
    <p v-if="message" class="mx-muted">{{ message }}</p>
    <RouterLink v-if="actionLabel && actionTo" :to="actionTo" class="mx-btn mx-btn--small">
      {{ actionLabel }}
    </RouterLink>
    <button v-else-if="actionLabel" type="button" class="mx-btn mx-btn--small" @click="emit('action')">
      {{ actionLabel }}
    </button>
    <slot />
  </section>
</template>

<style scoped>
.mx-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
  padding: 2.5rem 1rem;
  text-align: center;
}
.mx-empty__icon { font-size: 2.6rem; color: var(--mx-ink-faint); }
</style>
