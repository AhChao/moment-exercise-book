<script setup lang="ts">
import { computed } from 'vue'
import { icons, type IconName } from './icons'

const props = defineProps<{ name: IconName }>()
const markup = computed(() => icons[props.name])
</script>

<template>
  <svg
    class="mx-icon"
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
    v-html="markup"
  />
</template>

<style scoped>
.mx-icon { flex: none; vertical-align: -0.125em; }
</style>
