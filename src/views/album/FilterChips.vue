<script setup lang="ts">
export interface ChipOption {
  value: string
  label: string
}

defineProps<{ options: ChipOption[]; modelValue: string; label: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
</script>

<template>
  <div class="mx-chips" role="group" :aria-label="label">
    <button
      v-for="o in options"
      :key="o.value"
      type="button"
      class="mx-chip mx-chips__chip"
      :data-tone="o.value === modelValue ? 'red' : undefined"
      :aria-pressed="o.value === modelValue"
      @click="emit('update:modelValue', o.value)"
    >
      {{ o.label }}
    </button>
  </div>
</template>

<style scoped>
.mx-chips { display: flex; gap: 0.5rem; padding: 0.15rem 0; overflow-x: auto; scrollbar-width: none; }
.mx-chips::-webkit-scrollbar { display: none; }
.mx-chips__chip {
  flex: none;
  min-height: 2.75rem;
  padding: 0 1rem;
  font-family: var(--mx-font-hand);
  font-size: var(--mx-text-md);
  cursor: pointer;
}
.mx-chips__chip[aria-pressed='true'] { font-weight: 700; background: rgb(var(--mx-red-rgb) / 0.12); }
</style>
