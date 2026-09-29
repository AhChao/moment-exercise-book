<script setup lang="ts">
// Details and actions of the selected frame: hint, why it is filled from the album, suggested adjustment.
import { computed } from 'vue'
import type { PlanReason } from '@/exercise/shotPlan'
import type { PhotoMeta, Shot } from '@/types'
import Icon from '@/ui/Icon.vue'
import { exerciseCopy, importReason } from '@/copy/exercise'
import { developChips, encodeSuggest } from '../photo/suggest'

const props = defineProps<{
  shot: Shot
  photo: PhotoMeta | null
  fromAlbum: boolean
  reasons: readonly PlanReason[]
}>()
const emit = defineEmits<{ shoot: []; pick: [] }>()

const chips = computed(() => developChips(props.shot.develop))
const photoLink = computed(() => {
  if (!props.photo) return ''
  const q = props.shot.develop && chips.value.length ? `?suggest=${encodeSuggest(props.shot.develop)}` : ''
  return `/photo/${props.photo.id}${q}`
})
</script>

<template>
  <section class="detail mx-card mx-card--flat">
    <p v-if="shot.hint" class="detail__hint">{{ shot.hint }}</p>
    <p v-if="fromAlbum" class="mx-muted detail__note">{{ importReason(reasons) }}</p>
    <div v-if="chips.length" class="detail__suggest">
      <span class="mx-kicker">{{ exerciseCopy.suggested }}</span>
      <ul class="detail__chips">
        <li v-for="c in chips" :key="c"><span class="mx-chip" data-tone="purple">{{ c }}</span></li>
      </ul>
    </div>
    <div class="detail__actions">
      <button v-if="!fromAlbum" type="button" class="mx-btn mx-btn--primary" @click="emit('shoot')">
        <Icon name="camera" />{{ photo ? exerciseCopy.retake : exerciseCopy.shoot }}
      </button>
      <button
        type="button"
        class="mx-btn"
        :class="fromAlbum ? 'mx-btn--primary' : 'mx-btn--quiet'"
        @click="emit('pick')"
      >
        <Icon name="album" />{{ fromAlbum && photo ? exerciseCopy.retake : exerciseCopy.pickFromAlbum }}
      </button>
      <RouterLink v-if="photo" class="mx-btn mx-btn--quiet" :to="photoLink">
        <Icon name="pencil" />{{ chips.length ? exerciseCopy.adjust : exerciseCopy.viewPhoto }}
      </RouterLink>
    </div>
  </section>
</template>

<style scoped>
.detail { display: grid; gap: 0.7rem; margin-top: 0.8rem; }
.detail__note { font-size: var(--mx-text-sm); }
.detail__suggest { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; }
.detail__chips { display: flex; flex-wrap: wrap; gap: 0.3rem; }
.detail__actions { display: flex; flex-wrap: wrap; gap: 0.6rem; }
</style>
