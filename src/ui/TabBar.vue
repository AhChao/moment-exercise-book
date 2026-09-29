<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import Icon from './Icon.vue'
import type { IconName } from './icons'
import { nav } from '@/copy/nav'

interface Tab {
  to: string
  label: string
  icon: IconName
  tone: 'red' | 'blue' | 'green'
  /** route names that light this tab */
  names: string[]
}

const tabs: Tab[] = [
  { to: '/', label: nav.notebook, icon: 'book', tone: 'red', names: ['home', 'chapter', 'exercise'] },
  { to: '/album', label: nav.album, icon: 'album', tone: 'blue', names: ['album'] },
  { to: '/settings', label: nav.settings, icon: 'gear', tone: 'green', names: ['settings'] },
]

const route = useRoute()
const activeName = computed(() => String(route.name ?? ''))
</script>

<template>
  <nav class="mx-tabbar" :aria-label="nav.tabBarLabel">
    <RouterLink v-for="tab in tabs" :key="tab.to" v-slot="{ href, navigate }" :to="tab.to" custom>
      <a
        :href="href"
        class="mx-tab"
        :data-tone="tab.tone === 'red' ? undefined : tab.tone"
        :aria-current="tab.names.includes(activeName) ? 'page' : undefined"
        @click="navigate"
      >
        <Icon :name="tab.icon" class="mx-tab__icon" />
        <span>{{ tab.label }}</span>
      </a>
    </RouterLink>
  </nav>
</template>

<style scoped>
.mx-tab__icon { font-size: 1.4rem; }
</style>
