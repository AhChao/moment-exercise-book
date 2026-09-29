<script setup lang="ts">
// Shown only where the browser cannot shoot inside the app, so an excluded reader learns it on the first screen.
import { detectShootSupport } from '@/camera/support'
import { home } from '@/copy/home'

const supported = detectShootSupport()
</script>

<template>
  <section v-if="!supported" class="mx-card mx-card--flat mx-notice" role="note">
    <h2 class="mx-heading">{{ home.deviceNotice.title }}</h2>
    <p class="mx-muted">{{ home.deviceNotice.message }}</p>
  </section>
</template>

<style scoped>
.mx-notice { display: grid; gap: 0.35rem; margin-bottom: 1rem; }
</style>
