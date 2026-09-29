<script setup lang="ts">
import EmptyState from '@/ui/EmptyState.vue'
import { nav } from '@/copy/nav'
import { common } from '@/copy/common'
</script>

<template>
  <main class="mx-page">
    <EmptyState :title="nav.notFound.title" :message="nav.notFound.message" :action-label="common.backToNotebook" action-to="/" />
  </main>
</template>
