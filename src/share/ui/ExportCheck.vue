<script setup lang="ts">
// Custom-styled checkbox row; the native input stays in the DOM for keyboard and screen readers.
defineProps<{ modelValue: boolean; label: string; disabled?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()
</script>

<template>
  <label class="chk" :class="{ 'chk--disabled': disabled }">
    <input
      class="chk__input"
      type="checkbox"
      :checked="modelValue"
      :disabled="disabled"
      @change="emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
    />
    <span class="chk__box" aria-hidden="true">
      <svg viewBox="0 0 24 24" class="chk__tick"><path d="M4.8 12.6l4.6 4.5L19.2 7.4" /></svg>
    </span>
    <span class="chk__label">{{ label }}</span>
  </label>
</template>

<style scoped>
.chk { position: relative; display: flex; align-items: center; gap: 0.65rem; min-height: 2.75rem; cursor: pointer; }
.chk--disabled { opacity: 0.5; cursor: not-allowed; }
.chk__input { position: absolute; width: 1px; height: 1px; opacity: 0; }
.chk__box {
  flex: none;
  display: grid;
  place-items: center;
  width: 1.4rem;
  height: 1.4rem;
  border: var(--mx-stroke-bold) solid var(--mx-ink);
  border-radius: var(--mx-radius);
  background: var(--mx-paper-light);
}
.chk__tick { width: 1.1rem; height: 1.1rem; fill: none; stroke: var(--mx-red); stroke-width: 2.6; stroke-linecap: round; stroke-linejoin: round; opacity: 0; }
.chk__input:checked + .chk__box .chk__tick { opacity: 1; }
.chk__input:focus-visible + .chk__box { outline: 2px solid var(--ui-focus-ring); outline-offset: 2px; }
.chk__label { font-family: var(--mx-font-hand); font-size: var(--mx-text-lg); color: var(--mx-ink); }
</style>
