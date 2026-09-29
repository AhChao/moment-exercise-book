<script setup lang="ts">
// Rows for the controls the phone exposes and the shot leaves open.
import { computed } from 'vue'
import type { Capabilities } from '@/camera/types'
import type { CaptureSpec } from '@/types'
import { formatShutter } from '@/judge/format'
import { controlLabel } from '@/copy/capture'
import { formatEv, formatFocus, formatKelvin, formatZoom } from '../exercise/targetItems'
import { FIELD_OF } from './buildSpec'
import type { ControlKey } from './buildSpec'
import RangeRow from './RangeRow.vue'
import StopRow from './StopRow.vue'
import { ISO_STOPS, SHUTTER_STOPS, evStops, stopsWithin, zoomPresets } from './stops'

const props = defineProps<{
  controls: readonly ControlKey[]
  caps: Capabilities
  overrides: Partial<CaptureSpec>
  disabled?: boolean
}>()
const emit = defineEmits<{ set: [key: ControlKey, value: number | null] }>()

const shutterStops = computed(() => stopsWithin(SHUTTER_STOPS, props.caps.shutterSec))
const isoStops = computed(() => stopsWithin(ISO_STOPS, props.caps.iso))
const evList = computed(() => (props.caps.ev ? evStops(props.caps.ev) : []))
const val = (k: ControlKey): number | null => props.overrides[FIELD_OF[k]] ?? null
const stepOf = (step: number | undefined, fallback: number): number => (step && step > 0 ? step : fallback)
</script>

<template>
  <div class="panel">
    <template v-for="k in controls" :key="k">
      <RangeRow
        v-if="k === 'zoom' && caps.zoom"
        :label="controlLabel.zoom"
        :min="caps.zoom.min"
        :max="caps.zoom.max"
        :step="stepOf(caps.zoom.step, 0.1)"
        :value="val('zoom')"
        :initial="1"
        :format="formatZoom"
        :presets="zoomPresets(caps.zoom)"
        :disabled="disabled"
        @update="emit('set', 'zoom', $event)"
      />
      <StopRow
        v-else-if="k === 'ev'"
        :label="controlLabel.ev"
        :stops="evList"
        :value="val('ev')"
        :initial="0"
        :format="formatEv"
        :disabled="disabled"
        @update="emit('set', 'ev', $event)"
      />
      <StopRow
        v-else-if="k === 'shutter'"
        :label="controlLabel.shutter"
        :stops="shutterStops"
        :value="val('shutter')"
        :initial="1 / 60"
        :format="formatShutter"
        :disabled="disabled"
        @update="emit('set', 'shutter', $event)"
      />
      <StopRow
        v-else-if="k === 'iso'"
        :label="controlLabel.iso"
        :stops="isoStops"
        :value="val('iso')"
        :initial="100"
        :format="String"
        :disabled="disabled"
        @update="emit('set', 'iso', $event)"
      />
      <RangeRow
        v-else-if="k === 'wb' && caps.wbKelvin"
        :label="controlLabel.wb"
        :min="caps.wbKelvin.min"
        :max="caps.wbKelvin.max"
        :step="stepOf(caps.wbKelvin.step, 50)"
        :value="val('wb')"
        :initial="5000"
        :format="formatKelvin"
        :disabled="disabled"
        @update="emit('set', 'wb', $event)"
      />
      <RangeRow
        v-else-if="k === 'focus' && caps.focusMeters"
        :label="controlLabel.focus"
        :min="caps.focusMeters.min"
        :max="caps.focusMeters.max"
        :step="stepOf(caps.focusMeters.step, 0.01)"
        :value="val('focus')"
        :initial="1"
        :format="formatFocus"
        :disabled="disabled"
        @update="emit('set', 'focus', $event)"
      />
    </template>
  </div>
</template>

<style scoped>
.panel { display: grid; gap: 0.5rem; }
</style>
