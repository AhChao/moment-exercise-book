<script setup lang="ts">
// Chips for the values a shot prescribes. Shared by the exercise page and the capture screen.
import { computed } from 'vue'
import type { CaptureSpec } from '@/types'
import { targetItems } from './targetItems'

const props = defineProps<{
  spec: CaptureSpec
  /** also list values that are not prescribed, as "auto" */
  withAuto?: boolean
  /** tighter spacing, for the capture strip */
  dense?: boolean
}>()

const items = computed(() => targetItems(props.spec, props.withAuto))
</script>

<template>
  <ul v-if="items.length" class="chips" :class="{ 'chips--dense': dense }">
    <li v-for="it in items" :key="it.key">
      <span class="mx-chip" :data-tone="it.auto ? undefined : 'blue'" :class="{ 'chips__auto': it.auto }">{{ it.text }}</span>
    </li>
  </ul>
</template>

<style scoped>
.chips { display: flex; flex-wrap: wrap; gap: 0.35rem; }
.chips--dense { gap: 0.25rem; }
.chips__auto { opacity: 0.7; }
</style>
