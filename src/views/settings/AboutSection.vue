<script setup lang="ts">
import { settings } from '@/copy/settings'
</script>

<template>
  <section class="mx-card mx-card--flat mx-about">
    <h2 class="mx-heading">{{ settings.about.title }}</h2>
    <p>{{ settings.about.line }}</p>
    <p class="mx-muted">{{ settings.about.privacy }}</p>
  </section>
</template>

<style scoped>
.mx-about { display: grid; gap: 0.4rem; }
</style>
