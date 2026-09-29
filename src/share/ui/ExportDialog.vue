<script setup lang="ts">
// Export dialog for one exercise (image or PDF) or a chapter (PDF of the chosen exercises).
import { computed, watch } from 'vue'
import ModalShell from '@/ui/ModalShell.vue'
import { share, exportProgress, progressAria } from '@/copy/share'
import type { SheetSource } from '../types'
import ExportCheck from './ExportCheck.vue'
import { useExport } from './useExport'

const props = defineProps<{
  open: boolean
  scope: 'exercise' | 'chapter'
  /** exercise id or chapter id, used in the file name */
  scopeId: string
  sources: SheetSource[]
}>()
const emit = defineEmits<{ 'update:open': [open: boolean] }>()

const x = useExport(
  () => props.sources,
  () => props.scope,
  () => props.scopeId,
)

watch(
  () => props.open,
  (open) => {
    if (open) x.reset()
  },
  { immediate: true },
)

const title = computed(() => (props.scope === 'chapter' ? share.dialogTitleChapter : share.dialogTitleExercise))
const formats = [
  { id: 'image', label: share.formatImage },
  { id: 'pdf', label: share.formatPdf },
] as const
const caption = computed(() => (x.effectiveFormat.value === 'pdf' ? exportProgress(x.done.value, x.total.value) : share.busy))

async function submit(): Promise<void> {
  if (await x.run()) emit('update:open', false)
}
// A running export cannot be dismissed.
const beforeClose = (): boolean | void => (x.busy.value ? false : undefined)
</script>

<template>
  <ModalShell
    :open="open"
    size="md"
    :title="title"
    :show-close="!x.busy.value"
    :close-on-overlay="!x.busy.value"
    :before-close="beforeClose"
    @update:open="emit('update:open', $event)"
  >
    <p v-if="!x.listed.value.length" class="mx-muted empty">{{ share.empty }}</p>
    <div v-else class="form">
      <fieldset v-if="scope === 'exercise'" class="field" :disabled="x.busy.value">
        <legend class="mx-kicker">{{ share.formatLabel }}</legend>
        <div class="seg" role="radiogroup" :aria-label="share.formatLabel">
          <button
            v-for="f in formats"
            :key="f.id"
            type="button"
            role="radio"
            class="seg__item"
            :aria-checked="x.format.value === f.id"
            :class="{ 'seg__item--on': x.format.value === f.id }"
            @click="x.format.value = f.id"
          >{{ f.label }}</button>
        </div>
      </fieldset>

      <fieldset v-else class="field" :disabled="x.busy.value">
        <legend class="mx-kicker">{{ share.exercisesLabel }}</legend>
        <ExportCheck
          :model-value="x.allSelected.value"
          :label="x.allSelected.value ? share.clearAll : share.selectAll"
          @update:model-value="x.toggleAll()"
        />
        <ul class="list">
          <li v-for="s in x.listed.value" :key="s.exercise.id">
            <ExportCheck
              :model-value="x.selected.has(s.exercise.id)"
              :label="s.exercise.title"
              @update:model-value="x.toggle(s.exercise.id, $event)"
            />
          </li>
        </ul>
      </fieldset>

      <fieldset class="field" :disabled="x.busy.value">
        <ExportCheck v-model="x.includeNotes.value" :label="share.includeNotes" />
        <ExportCheck v-model="x.includeShootingData.value" :label="share.includeShootingData" />
      </fieldset>

      <div v-if="x.busy.value" class="progress" role="status">
        <p class="mx-muted">{{ caption }}</p>
        <div
          class="bar"
          role="progressbar"
          :aria-label="progressAria"
          aria-valuemin="0"
          aria-valuemax="100"
          :aria-valuenow="x.percent.value"
        >
          <div class="bar__fill" :style="{ width: `${x.percent.value}%` }" />
        </div>
      </div>
      <p v-else-if="scope === 'chapter' && !x.chosen.value.length" class="mx-muted">{{ share.nothingSelected }}</p>
    </div>

    <template v-if="x.listed.value.length" #footer>
      <button type="button" class="mx-btn mx-btn--primary" :disabled="!x.canExport.value" @click="submit">
        {{ x.busy.value ? share.busy : share.submit }}
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
.empty { padding: 1.5rem 0; text-align: center; }
.form { display: grid; gap: 0.9rem; }
.field { display: grid; gap: 0.1rem; min-width: 0; padding: 0; border: 0; }
.list { display: grid; max-height: 14rem; padding-left: 0.4rem; overflow-y: auto; overscroll-behavior: contain; }
.seg { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); border: var(--mx-stroke-bold) solid var(--mx-ink); border-radius: var(--mx-radius); overflow: hidden; }
.seg__item {
  min-height: 2.75rem;
  font-family: var(--mx-font-hand);
  font-size: var(--mx-text-lg);
  font-weight: 700;
  color: var(--mx-ink);
  background: transparent;
  border: 0;
}
.seg__item + .seg__item { border-left: var(--mx-stroke-bold) solid var(--mx-ink); }
.seg__item--on { color: var(--ui-on-accent); background: var(--mx-red); }
.seg__item:focus-visible { outline: 2px solid var(--ui-focus-ring); outline-offset: -4px; }
.progress { display: grid; gap: 0.4rem; }
.bar { height: 0.6rem; overflow: hidden; border: var(--mx-stroke) solid var(--mx-ink-faint); border-radius: var(--mx-radius-round); background: var(--mx-paper-light); }
.bar__fill { height: 100%; background: var(--mx-red); transition: width var(--ui-dur-base) var(--ui-ease); }
</style>
