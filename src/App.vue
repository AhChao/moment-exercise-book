<script setup lang="ts">
import { useRoute } from 'vue-router'
import TabBar from '@/ui/TabBar.vue'
import ToastStack from '@/ui/ToastStack.vue'
import { useScrollMemory } from '@/lib/scroll-memory'

const route = useRoute()
useScrollMemory()
</script>

<template>
  <div class="mx-app">
    <!-- keyed by path: a param change remounts the view, a query-only change (filters) does not -->
    <RouterView v-slot="{ Component, route: current }">
      <component :is="Component" :key="current.path" />
    </RouterView>
    <TabBar v-if="!route.meta.hideTabbar" />
  </div>
  <ToastStack />
</template>
