<script setup lang="ts">
// Centred card for a camera that cannot be used, with the album as the way forward.
import type { CameraErrorCode } from '@/camera/types'
import Icon from '@/ui/Icon.vue'
import { captureCopy, errorBody, errorTitle } from '@/copy/capture'

defineProps<{ code: CameraErrorCode }>()
defineEmits<{ pick: []; back: [] }>()
</script>

<template>
  <div class="err">
    <section class="mx-card mx-card--flat err__card">
      <h1 class="mx-heading">{{ errorTitle[code] }}</h1>
      <p class="mx-muted">{{ errorBody }}</p>
      <div class="err__actions">
        <button type="button" class="mx-btn mx-btn--primary" @click="$emit('pick')">
          <Icon name="album" />{{ captureCopy.pickFromAlbum }}
        </button>
        <button type="button" class="mx-btn mx-btn--quiet" @click="$emit('back')">
          <Icon name="chevron-left" />{{ captureCopy.back }}
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.err { position: absolute; inset: 0; display: grid; place-items: center; padding: 1rem; background: var(--mx-paper); }
.err__card { display: grid; gap: 0.9rem; width: min(100%, 24rem); text-align: center; }
.err__actions { display: grid; gap: 0.6rem; }
</style>
