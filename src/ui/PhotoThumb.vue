<script setup lang="ts">
// Thumbnail that resolves its object URL through the library only once it scrolls near the viewport.
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useLibrary } from '@/store'

const props = defineProps<{ photoId: string; alt?: string }>()

const library = useLibrary()
const root = ref<HTMLElement | null>(null)
const src = ref('')
let visible = false
let observer: IntersectionObserver | null = null
let token = 0

async function load() {
  if (!visible) return
  const mine = ++token
  try {
    const url = await library.photoUrl(props.photoId, 'thumb')
    if (mine === token) src.value = url
  } catch {
    if (mine === token) src.value = ''
  }
}

onMounted(() => {
  if (typeof IntersectionObserver === 'undefined' || !root.value) {
    visible = true
    void load()
    return
  }
  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        visible = true
        observer?.disconnect()
        void load()
      }
    },
    { rootMargin: '200px' },
  )
  observer.observe(root.value)
})

watch(() => props.photoId, () => {
  src.value = ''
  void load()
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
