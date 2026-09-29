<script setup lang="ts">
// Route guard for the full-screen camera: an unknown exercise or frame never opens the camera.
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { exerciseById } from '@/content/loader'
import { exerciseCopy } from '@/copy/exercise'
import MissingState from './exercise/MissingState.vue'
import CaptureStage from './capture/CaptureStage.vue'

const route = useRoute()
const exercise = computed(() => exerciseById(String(route.params.exerciseId)))
const index = computed(() => {
  const n = Number(route.params.shot)
  const count = exercise.value?.shots.length ?? 0
  return Number.isInteger(n) && n >= 0 && n < count ? n : -1
})
</script>

<template>
  <CaptureStage v-if="exercise && index >= 0" :key="`${exercise.id}:${index}`" :exercise="exercise" :index="index" />
  <MissingState v-else :title="exerciseCopy.missingTitle" :link-text="exerciseCopy.missingLink" to="/" />
</template>
