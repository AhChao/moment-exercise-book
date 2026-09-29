<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { formatShutter } from '@/judge/format'
import type { Exercise } from '@/types'
import Icon from '@/ui/Icon.vue'
import { confirmDialog } from '@/ui/useConfirm'
import { captureCopy, exposing, phaseText } from '@/copy/capture'
import TargetChips from '../exercise/TargetChips.vue'
import { placeFile } from '../exercise/placeFile'
import { useFilePicker } from '../exercise/useFilePicker'
import CameraErrorCard from './CameraErrorCard.vue'
import ControlPanel from './ControlPanel.vue'
import ReviewScreen from './ReviewScreen.vue'
import ShutterButton from './ShutterButton.vue'
import { isSlowShot } from './buildSpec'
import ExposureNote from './ExposureNote.vue'
import { useAutoExposure } from './useAutoExposure'
import { useCamera } from './useCamera'
import { useControls } from './useControls'
import { useShoot } from './useShoot'

const props = defineProps<{ exercise: Exercise; index: number }>()
const router = useRouter()

const shot = computed(() => props.exercise.shots[props.index])
const video = ref<HTMLVideoElement | null>(null)

const cam = useCamera(video, () => {
  ctl.pushPreview()
  void autoExp.run()
})
const ctl = useControls(shot, cam.session)
const autoExp = useAutoExposure(video, cam.session, shot, (key, value) => ctl.set(key, value))
const shooter = useShoot(cam.session, ctl.spec)

const expanded = ref(ctl.free.value)
const ready = computed(() => cam.status.value === 'ready' && !!cam.session.value)
const slow = computed(() => isSlowShot(ctl.spec.value))
const status = computed(() => {
  const p = shooter.phase.value
  if (p === 'idle') return ''
  const s = ctl.spec.value.shutterSec
  return p === 'shooting' && s !== null && s >= 0.5 ? exposing(formatShutter(s)) : phaseText[p]
})

const leave = (): void => {
  void router.replace({ path: `/exercise/${props.exercise.id}`, query: { shot: String(props.index) } })
}

async function close(): Promise<void> {
  if (shooter.pending.value) {
    const ok = await confirmDialog({ ...captureCopy.leave, danger: true })
    if (!ok) return
    shooter.drop()
  }
  leave()
}

function discard(): void {
  shooter.drop()
  leave()
}

async function keep(): Promise<void> {
  if (await shooter.keep(props.exercise, props.index)) leave()
}

function retake(): void {
  shooter.drop()
  // The engine may have reopened the stream while retrying, so bind the preview again.
  if (video.value) void cam.session.value?.attach(video.value).catch(() => {})
  ctl.pushPreview()
}

const picker = useFilePicker(async (target, file) => {
  if (await placeFile(props.exercise, target, file)) leave()
})
const fileInput = picker.input // bound by name in the template
</script>

<template>
  <div class="cap">
    <video v-show="cam.status.value !== 'error'" ref="video" class="cap__video" playsinline muted autoplay />

    <CameraErrorCard v-if="cam.status.value === 'error'" :code="cam.errorCode.value" @pick="picker.open(index)" @back="leave" />

    <template v-else>
      <header class="cap__top">
        <button type="button" class="mx-iconbtn cap__close" :aria-label="captureCopy.close" @click="close">
          <Icon name="close" />
        </button>
        <span class="cap__label mx-mono">{{ shot?.label }}</span>
        <span v-if="cam.status.value === 'opening'" class="cap__opening">{{ captureCopy.opening }}</span>
        <span v-else-if="autoExp.metering.value" class="cap__opening">{{ captureCopy.metering }}</span>
      </header>

      <div v-if="!shooter.pending.value" class="cap__bottom">
        <TargetChips class="cap__chips" :spec="ctl.spec.value" :with-auto="!ctl.free.value" dense />
        <section v-if="ctl.controls.value.length" class="cap__sheet mx-card mx-card--flat">
          <button
            type="button"
            class="cap__toggle"
            :aria-expanded="expanded"
            :aria-label="expanded ? captureCopy.panelClose : captureCopy.panelOpen"
            @click="expanded = !expanded"
          >
            <Icon name="sun" />
            <span>{{ captureCopy.panelTitle }}</span>
            <Icon :name="expanded ? 'chevron-left' : 'chevron-right'" class="cap__caret" :class="{ 'cap__caret--open': expanded }" />
          </button>
          <ControlPanel
            v-show="expanded"
            :controls="ctl.controls.value"
            :caps="ctl.caps.value"
            :overrides="ctl.overrides.value"
            :disabled="shooter.busy.value"
            @set="ctl.set"
          />
        </section>
        <ExposureNote
          v-if="autoExp.active.value"
          :note="autoExp.note.value"
          :disabled="!ready || shooter.busy.value || autoExp.metering.value"
          @remeter="autoExp.run"
        />
        <ShutterButton
          :busy="shooter.phase.value !== 'idle'"
          :disabled="!ready || shooter.busy.value || autoExp.metering.value"
          :status="status"
          :hint="slow ? captureCopy.slowHint : ''"
          @press="shooter.shoot"
        />
      </div>

      <ReviewScreen
        v-else
        :pending="shooter.pending.value"
        :saving="shooter.saving.value"
        @keep="keep"
        @retake="retake"
        @discard="discard"
      />
    </template>
    <input ref="fileInput" class="cap__file" type="file" accept="image/*" tabindex="-1" aria-hidden="true" @change="picker.onChange" />
  </div>
</template>

<style scoped>
.cap { position: fixed; inset: 0; z-index: var(--ui-z-modal); overflow: hidden; background: var(--mx-film); color: var(--mx-paper-light); }
.cap__video { position: absolute; inset: 0; width: 100%; height: 100%; max-width: none; object-fit: contain; }
.cap__top {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: calc(0.4rem + env(safe-area-inset-top)) 0.6rem 0.4rem;
  background: linear-gradient(rgb(43 33 27 / 0.7), transparent);
}
.cap__close { color: var(--mx-paper-light); }
.cap__label { flex: 1; }
.cap__opening { font-size: var(--mx-text-sm); }
.cap__bottom {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  display: grid;
  gap: 0.6rem;
  max-width: var(--mx-page-width);
  margin: 0 auto;
  padding: 0.6rem 0.8rem calc(0.6rem + env(safe-area-inset-bottom));
  background: linear-gradient(transparent, rgb(43 33 27 / 0.8) 30%);
}
.cap__sheet { display: grid; gap: 0.4rem; max-height: 46vh; overflow-y: auto; color: var(--mx-ink); }
.cap__toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 2.75rem;
  padding: 0;
  font-family: var(--mx-font-hand);
  font-weight: 700;
  text-align: left;
  background: transparent;
  border: 0;
}
.cap__toggle span { flex: 1; }
.cap__caret { transition: transform var(--ui-dur-base) var(--ui-ease); transform: rotate(90deg); }
.cap__caret--open { transform: rotate(-90deg); }
.cap__file { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
</style>
