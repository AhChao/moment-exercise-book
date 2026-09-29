<script setup lang="ts">
// Thumbnail that resolves its URL (with the photo's adjustment applied) only once it scrolls near the viewport.
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useDevelopedUrl } from './developed/useDevelopedUrl'

const props = defineProps<{ photoId: string; alt?: string }>()

const root = ref<HTMLElement | null>(null)
const visible = ref(false)
const src = useDevelopedUrl(() => props.photoId, 'thumb', visible)
let observer: IntersectionObserver | null = null

onMounted(() => {
  if (typeof IntersectionObserver === 'undefined' || !root.value) {
    visible.value = true
    return
  }
  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        visible.value = true
        observer?.disconnect()
      }
    },
    { rootMargin: '200px' },
  )
  observer.observe(root.value)
})

onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <span ref="root" class="mx-thumb">
    <img v-if="src" :src="src" :alt="alt ?? ''" decoding="async" />
  </span>
</template>

<style scoped>
.mx-thumb { display: block; width: 100%; height: 100%; background: var(--mx-paper-deep); }
.mx-thumb img { width: 100%; height: 100%; object-fit: cover; }
</style>
