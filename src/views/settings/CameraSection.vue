<script setup lang="ts">
import { computed, ref } from 'vue'
import { openCamera } from '@/camera/session'
import { CameraError, type Capabilities } from '@/camera/types'
import Icon from '@/ui/Icon.vue'
import { settings } from '@/copy/settings'
import { buildCameraReport } from './cameraReport'

const copy = settings.camera

const checking = ref(false)
const caps = ref<Capabilities | null>(null)
const errorText = ref('')

const rows = computed(() => (caps.value ? buildCameraReport(caps.value) : []))

async function check() {
  checking.value = true
  errorText.value = ''
  try {
    const session = await openCamera()
    try {
      caps.value = session.capabilities
      // shot planning on the exercise screen reads the same cache the camera screen writes
      try {
        sessionStorage.setItem('meb:caps', JSON.stringify(session.capabilities))
      } catch {
        /* storage may be unavailable */
      }
    } finally {
      session.close()
    }
  } catch (e) {
    caps.value = null
    errorText.value = copy.errors[e instanceof CameraError ? e.code : 'failed']
  } finally {
    checking.value = false
  }
}
</script>

<template>
  <section class="mx-card mx-card--flat mx-set">
    <h2 class="mx-heading">{{ copy.title }}</h2>
    <p v-if="!caps && !errorText" class="mx-muted mx-set__note">{{ copy.note }}</p>

    <p v-if="errorText" class="mx-set__error" role="alert">{{ errorText }}</p>

    <ul v-if="rows.length" class="mx-set__rows">
      <li v-for="r in rows" :key="r.key" class="mx-set__row" :data-off="r.available ? undefined : ''">
        <Icon :name="r.available ? 'check' : 'close'" />
        <span class="mx-set__label">{{ r.label }}</span>
        <span class="mx-mono mx-set__detail">{{ r.available ? r.detail || copy.available : copy.unavailableControl }}</span>
      </li>
    </ul>

    <button type="button" class="mx-btn mx-btn--block" :disabled="checking" @click="check">
      <Icon name="camera" /> {{ checking ? copy.checking : caps || errorText ? copy.recheck : copy.check }}
    </button>
  </section>
</template>

<style scoped>
.mx-set { display: grid; gap: 0.75rem; }
.mx-set__note { font-size: var(--mx-text-sm); }
.mx-set__error { color: var(--ui-danger); }
.mx-set__rows { display: grid; gap: 0.5rem; }
.mx-set__row { display: grid; grid-template-columns: auto 1fr; column-gap: 0.5rem; align-items: baseline; color: var(--mx-green); }
.mx-set__row[data-off] { color: var(--mx-ink-faint); }
.mx-set__label { color: var(--mx-ink); font-weight: 700; }
.mx-set__row[data-off] .mx-set__label { color: var(--mx-ink-soft); }
.mx-set__detail { grid-column: 2; font-size: var(--mx-text-sm); color: var(--mx-ink-soft); }
</style>
