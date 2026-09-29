<script setup lang="ts">
// After a shot: the photo, its shooting data, and keep / retake / discard.
import { computed } from 'vue'
import Icon from '@/ui/Icon.vue'
import { captureCopy } from '@/copy/capture'
import { reviewRows } from '../photo/photoInfo'
import type { Pending } from './useShoot'

const props = defineProps<{ pending: Pending; saving: boolean }>()
defineEmits<{ keep: []; retake: []; discard: [] }>()

const rows = computed(() => reviewRows(props.pending.photo.exif, props.pending.photo.lens, props.pending.result.applied))
</script>

<template>
  <section class="review" :aria-label="captureCopy.reviewTitle">
    <img class="review__img" :src="pending.url" :alt="captureCopy.reviewAlt" />
    <div class="review__panel">
      <dl v-if="rows.length" class="review__data">
        <div v-for="r in rows" :key="r.key" class="review__item">
          <dt class="mx-kicker">{{ r.label }}</dt>
          <dd class="mx-mono">{{ r.value }}</dd>
        </div>
      </dl>
      <p v-if="!pending.result.verified" class="review__note">{{ captureCopy.unverified }}</p>
      <div class="review__actions">
        <button type="button" class="mx-btn mx-btn--primary" :disabled="saving" @click="$emit('keep')">
          <Icon name="check" />{{ captureCopy.keep }}
        </button>
        <button type="button" class="mx-btn" :disabled="saving" @click="$emit('retake')">
          <Icon name="refresh" />{{ captureCopy.retake }}
        </button>
        <button type="button" class="mx-btn mx-btn--quiet" :disabled="saving" @click="$emit('discard')">
          <Icon name="trash" />{{ captureCopy.discard }}
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.review { position: absolute; inset: 0; display: flex; flex-direction: column; background: var(--mx-film); }
.review__img { flex: 1; min-height: 0; width: 100%; object-fit: contain; }
.review__panel {
  display: grid;
  gap: 0.7rem;
  padding: 0.9rem 1rem calc(0.9rem + env(safe-area-inset-bottom));
  background: var(--mx-paper);
}
.review__data { display: flex; flex-wrap: wrap; gap: 0.3rem 1.2rem; margin: 0; }
.review__item { display: grid; }
.review__item dd { margin: 0; }
.review__note { font-size: var(--mx-text-sm); color: var(--mx-red); }
.review__actions { display: flex; flex-wrap: wrap; gap: 0.6rem; }
</style>
