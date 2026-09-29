<script setup lang="ts">
// Shown for unknown ids: a sentence and a way home, never a blank screen.
defineProps<{ title: string; linkText: string; to: string }>()
</script>

<template>
  <main class="mx-page missing">
    <section class="mx-card mx-card--flat missing__card">
      <h1 class="mx-heading">{{ title }}</h1>
      <RouterLink class="mx-btn mx-btn--primary" :to="to">{{ linkText }}</RouterLink>
    </section>
  </main>
</template>

<style scoped>
.missing__card {
  display: grid;
  justify-items: center;
  gap: 1rem;
  margin-top: 3rem;
  padding: 2rem 1rem;
  text-align: center;
}
</style>
