<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { renderDeveloped } from '@/develop/render'
import { useLibrary } from '@/store'
import Icon from '@/ui/Icon.vue'
import PhotoLightbox from '@/ui/lightbox/PhotoLightbox.vue'
import { useLightbox } from '@/ui/lightbox/useLightbox'
import { openAria } from '@/copy/lightbox'
import { confirmDialog } from '@/ui/useConfirm'
import { toast } from '@/ui/useToast'
import { photoCopy } from '@/copy/photo'
import MissingState from './exercise/MissingState.vue'
import AdjustPanel from './photo/AdjustPanel.vue'
import ShotData from './photo/ShotData.vue'
import { downloadBlob, photoFileName } from './photo/download'
import { photoRows } from './photo/photoInfo'
import { decodeSuggest } from './photo/suggest'
import { useDevelop } from './photo/useDevelop'

const route = useRoute()
const router = useRouter()
const library = useLibrary()

const meta = computed(() => library.photos.value.find((p) => p.id === String(route.params.photoId)))
const canvas = ref<HTMLCanvasElement | null>(null)
const dv = useDevelop(meta, canvas)
const suggestion = computed(() => decodeSuggest(route.query.suggest))
const rows = computed(() => (meta.value ? photoRows(meta.value) : []))
const saving = ref(false)
const lb = useLightbox() // single-photo viewer for zoom inspection

function back(): void {
  if (window.history.state?.back) router.back()
  else void router.replace('/album')
}

async function save(): Promise<void> {
  const m = meta.value
  if (!m || saving.value) return
  saving.value = true
  try {
    const blob = await library.getPhotoBlob(m.id)
    downloadBlob(await renderDeveloped(blob, dv.dev.value), photoFileName(m.createdAt))
    toast.success(photoCopy.savedToast)
  } catch {
    toast.error(photoCopy.saveFailed)
  } finally {
    saving.value = false
  }
}

async function remove(): Promise<void> {
  const m = meta.value
  if (!m || !(await confirmDialog({ ...photoCopy.confirm, danger: true }))) return
  try {
    dv.discardPending()
    await library.removePhoto(m.id)
    toast.success(photoCopy.removedToast)
    back()
  } catch {
    toast.error(photoCopy.removeFailed)
  }
}
</script>

<template>
  <main v-if="!library.loaded.value" class="mx-page mx-page--flush"><p class="mx-muted">{{ photoCopy.loading }}</p></main>
  <MissingState v-else-if="!meta" :title="photoCopy.missingTitle" :link-text="photoCopy.missingLink" to="/album" />
  <main v-else class="mx-page mx-page--flush photo">
    <header class="photo__bar">
      <button type="button" class="mx-iconbtn" :aria-label="photoCopy.back" @click="back"><Icon name="chevron-left" /></button>
      <span class="photo__back">{{ photoCopy.back }}</span>
    </header>

    <figure class="mat">
      <button v-show="!dv.failed.value" type="button" class="mat__open" :aria-label="openAria(photoCopy.imageAlt)" @click="lb.open([{ id: meta.id }], meta.id)">
        <canvas ref="canvas" class="mat__canvas" role="img" :aria-label="photoCopy.imageAlt" />
      </button>
      <p v-if="dv.failed.value" class="mx-muted mat__fail">{{ photoCopy.showFailed }}</p>
    </figure>

    <ShotData v-if="rows.length" :rows="rows" />

    <AdjustPanel :dev="dv.dev.value" :suggestion="suggestion" @set="dv.set" @reset="dv.reset" @apply="suggestion && dv.replace(suggestion)" />

    <div class="photo__actions">
      <button type="button" class="mx-btn mx-btn--primary mx-btn--block" :disabled="saving" @click="save">
        <Icon name="download" />{{ saving ? photoCopy.saving : photoCopy.save }}
      </button>
      <button type="button" class="mx-btn mx-btn--danger mx-btn--block" @click="remove">
        <Icon name="trash" />{{ photoCopy.remove }}
      </button>
    </div>

    <PhotoLightbox
      v-if="lb.state.value"
      :items="lb.state.value.items"
      :start-id="lb.state.value.startId"
      @close="lb.close"
    />
  </main>
</template>

<style scoped>
.photo { display: grid; gap: 1.2rem; padding-bottom: calc(1.5rem + env(safe-area-inset-bottom)); }
.photo__bar { display: flex; align-items: center; gap: 0.2rem; }
.photo__back { font-family: var(--mx-font-hand); font-weight: 700; }
.mat { margin: 0; padding: 0.7rem; background: var(--mx-paper-light); box-shadow: var(--mx-shadow); }
.mat__open { display: block; width: 100%; padding: 0; background: transparent; border: 0; cursor: zoom-in; }
.mat__canvas { display: block; width: 100%; height: auto; background: var(--mx-paper-deep); }
.mat__fail { padding: 2rem 0; text-align: center; }
.photo__actions { display: grid; gap: 0.7rem; }
</style>
