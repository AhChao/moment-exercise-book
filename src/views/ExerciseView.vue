<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useRouteQuery } from '@/lib/route-query'
import { chapterOfExercise, exerciseById, nextExercise } from '@/content/loader'
import { planShot } from '@/exercise/shotPlan'
import { judgeExercise } from '@/judge/judge'
import Icon from '@/ui/Icon.vue'
import { exerciseCopy, nextLink, levelAria } from '@/copy/exercise'
import MissingState from './exercise/MissingState.vue'
import ShotFrame from './exercise/ShotFrame.vue'
import ShotDetail from './exercise/ShotDetail.vue'
import CompareView from './exercise/CompareView.vue'
import NotesSection from './exercise/NotesSection.vue'
import CheckList from './exercise/CheckList.vue'
import { readCachedCaps } from './exercise/capsCache'
import { checkLines } from './exercise/checkText'
import { canCompare, clampShotIndex, filledIndexes } from './exercise/slots'
import PhotoLightbox from '@/ui/lightbox/PhotoLightbox.vue'
import { useLightbox } from '@/ui/lightbox/useLightbox'
import type { PhotoMeta } from '@/types'
import { placeFile } from './exercise/placeFile'
import { useExerciseAttempt } from './exercise/useExerciseAttempt'
import { useFilePicker } from './exercise/useFilePicker'

const route = useRoute()
const router = useRouter()

const exercise = computed(() => exerciseById(String(route.params.exerciseId)))
const chapter = computed(() => (exercise.value ? chapterOfExercise(exercise.value.id) : undefined))
const next = computed(() => (exercise.value ? nextExercise(exercise.value.id) : undefined))

const a = useExerciseAttempt(exercise)
const shotQuery = useRouteQuery('shot', 0, { type: 'number' }) as unknown as { value: number }
const selected = computed(() => clampShotIndex(shotQuery.value, exercise.value?.shots.length ?? 0))
const select = (i: number): void => {
  shotQuery.value = i
}

// Planning uses the last capabilities the camera screen cached; the camera is never opened here.
const plans = computed(() => {
  const caps = readCachedCaps()
  return (exercise.value?.shots ?? []).map((s) => planShot(s, caps))
})
const cur = computed(() => (exercise.value ? exercise.value.shots[selected.value] : undefined))
const curPlan = computed(() => plans.value[selected.value])

const picker = useFilePicker((index, file) => {
  if (exercise.value) void placeFile(exercise.value, index, file)
})
const fileInput = picker.input // bound by name in the template

function start(i: number): void {
  const ex = exercise.value
  if (!ex) return
  select(i)
  if (plans.value[i]?.mode === 'camera') void router.push(`/exercise/${ex.id}/shoot/${i}`)
  else picker.open(i)
}
function onTap(i: number): void {
  if (a.photos.value[i]) select(i)
  else start(i)
}

// Viewer over the filled frames in frame order. Closing selects the frame that was showing last.
const lb = useLightbox()
function openViewer(photoId: string): void {
  const ex = exercise.value
  if (!ex) return
  const items = filledIndexes(a.photos.value).map((i) => ({
    id: (a.photos.value[i] as PhotoMeta).id,
    label: ex.shots[i]?.label ?? '',
  }))
  lb.open(items, photoId)
}
function openFrame(i: number): void {
  const p = a.photos.value[i]
  if (!p) return
  select(i)
  openViewer(p.id)
}
function closeViewer(reason: 'dismiss' | 'adjust'): void {
  const id = lb.close()
  if (reason === 'adjust') return
  const i = a.photos.value.findIndex((p) => p?.id === id)
  if (i >= 0) select(i)
}

const compare = ref(false)
const compareOk = computed(() => canCompare(a.photos.value))
watch(compareOk, (ok) => {
  if (!ok) compare.value = false
})
watch(compare, (on) => {
  if (on) a.loadFulls()
})

const lines = computed(() =>
  exercise.value ? checkLines(judgeExercise(exercise.value, a.photos.value), exercise.value.shots) : [],
)
</script>

<template>
  <MissingState v-if="!exercise" :title="exerciseCopy.missingTitle" :link-text="exerciseCopy.missingLink" to="/" />
  <main v-else-if="!a.library.loaded.value" class="mx-page"><p class="mx-muted">{{ exerciseCopy.loading }}</p></main>
  <main v-else class="mx-page">
    <header class="head">
      <RouterLink v-if="chapter" class="mx-kicker head__chapter" :to="`/chapter/${chapter.id}`">
        <Icon name="chevron-left" />{{ chapter.title }}
      </RouterLink>
      <div class="head__row">
        <h1 class="mx-title">{{ exercise.title }}</h1>
        <span v-if="a.completed.value" class="mx-stamp" data-tone="green">{{ exerciseCopy.doneStamp }}</span>
      </div>
      <span class="dots" role="img" :aria-label="levelAria(exercise.level)">
        <i v-for="n in 3" :key="n" class="dots__dot" :class="{ 'dots__dot--on': n <= exercise.level }" />
      </span>
    </header>

    <section class="prose">
      <h2 class="mx-heading">{{ exerciseCopy.goal }}</h2>
      <p>{{ exercise.goal }}</p>
      <h2 class="mx-heading">{{ exerciseCopy.scene }}</h2>
      <p>{{ exercise.scene }}</p>
      <template v-if="exercise.fixed.length">
        <h2 class="mx-heading">{{ exerciseCopy.fixed }}</h2>
        <ul class="fixed">
          <li v-for="f in exercise.fixed" :key="f"><span class="mx-chip">{{ f }}</span></li>
        </ul>
      </template>
    </section>

    <hr class="mx-rule" />

    <section :aria-label="exerciseCopy.frames">
      <div v-if="compareOk" class="frames__bar">
        <button type="button" class="mx-btn mx-btn--small mx-btn--quiet" :aria-pressed="compare" @click="compare = !compare">
          <Icon name="layers" />{{ exerciseCopy.compare }}
        </button>
      </div>
      <CompareView
        v-if="compare && compareOk"
        :shots="exercise.shots"
        :photos="a.photos.value"
        @open="openViewer"
      />
      <ul v-else class="frames">
        <li v-for="(shot, i) in exercise.shots" :key="i">
          <ShotFrame
            :shot="shot"
            :index="i"
            :photo="a.photos.value[i] ?? null"
            :selected="i === selected"
            :from-album="plans[i]?.mode === 'import'"
            @tap="onTap(i)"
            @open="openFrame(i)"
          />
        </li>
      </ul>
      <ShotDetail
        v-if="cur && curPlan"
        :shot="cur"
        :photo="a.photos.value[selected] ?? null"
        :from-album="curPlan.mode === 'import'"
        :reasons="curPlan.notes"
        @shoot="start(selected)"
        @pick="picker.open(selected)"
      />
      <input ref="fileInput" class="sr-file" type="file" accept="image/*" tabindex="-1" aria-hidden="true" @change="picker.onChange" />
    </section>

    <CheckList :lines="lines" />

    <NotesSection
      :observe-questions="exercise.observe"
      :reflect-prompts="exercise.reflect"
      :observe="a.observe.value"
      :reflect="a.reflect.value"
      @observe="a.setObserve"
      @reflect="a.setReflect"
    />

    <hr class="mx-rule" />
    <footer class="foot">
      <button
        type="button"
        class="mx-btn mx-btn--block"
        :class="{ 'mx-btn--primary': !a.completed.value }"
        :disabled="!a.completeEnabled.value"
        @click="a.toggleComplete"
      >
        <Icon name="check" />{{ a.completed.value ? exerciseCopy.unmarkDone : exerciseCopy.markDone }}
      </button>
      <RouterLink v-if="a.completed.value && next" class="mx-btn mx-btn--block mx-btn--quiet" :to="`/exercise/${next.id}`">
        {{ nextLink(next.title) }}<Icon name="chevron-right" />
      </RouterLink>
    </footer>

    <PhotoLightbox
      v-if="lb.state.value"
      :items="lb.state.value.items"
      :start-id="lb.state.value.startId"
      @change="lb.onChange"
      @close="closeViewer"
    />
  </main>
</template>

<style scoped>
.head { display: grid; gap: 0.4rem; margin-bottom: 1rem; }
.head__chapter { display: inline-flex; align-items: center; min-height: 2.75rem; }
.head__row { display: flex; align-items: center; justify-content: space-between; gap: 0.8rem; }
.dots { display: inline-flex; gap: 0.3rem; }
.dots__dot { width: 0.7rem; height: 0.7rem; border: var(--mx-stroke) solid var(--mx-orange); border-radius: var(--mx-radius-round); }
.dots__dot--on { background: var(--mx-orange); }
.prose { display: grid; gap: 0.35rem; }
.prose .mx-heading { margin-top: 0.7rem; }
.fixed { display: flex; flex-wrap: wrap; gap: 0.35rem; }
.frames { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.2rem 0.6rem; }
.frames__bar { display: flex; justify-content: flex-end; margin-bottom: 0.4rem; }
.foot { display: grid; gap: 0.7rem; }
.sr-file { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
</style>
