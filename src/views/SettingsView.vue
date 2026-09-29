<script setup lang="ts">
import { settings } from '@/copy/settings'
import StorageSection from './settings/StorageSection.vue'
import BackupSection from './settings/BackupSection.vue'
import CameraSection from './settings/CameraSection.vue'
import AboutSection from './settings/AboutSection.vue'
</script>

<template>
  <main class="mx-page">
    <h1 class="mx-title mx-settings__title">{{ settings.title }}</h1>
    <div class="mx-settings__stack">
      <StorageSection />
      <BackupSection />
      <CameraSection />
      <AboutSection />
    </div>
  </main>
</template>

<style scoped>
.mx-settings__title { margin-bottom: 1rem; }
.mx-settings__stack { display: grid; gap: 1.1rem; }
</style>
