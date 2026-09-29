<script setup lang="ts">
// Short explanation shown under the exercise title when the exercise has one.
import { exerciseCopy } from '@/copy/exercise'

defineProps<{ text: string }>()
</script>

<template>
  <section class="mx-card concept">
    <h2 class="mx-heading">{{ exerciseCopy.concept }}</h2>
    <p>{{ text }}</p>
  </section>
</template>

<style scoped>
.concept { display: grid; gap: 0.35rem; margin-bottom: 1rem; }
</style>
