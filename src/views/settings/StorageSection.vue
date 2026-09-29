<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useLibrary, type StorageInfo } from '@/store'
import Icon from '@/ui/Icon.vue'
import { formatBytes } from '@/ui/format'
import { useInstall } from '@/ui/useInstall'
import { toast } from '@/ui/useToast'
import { settings, usageText } from '@/copy/settings'
import { usagePercent } from './storageMeter'

const library = useLibrary()
const { canInstall, install } = useInstall()

const info = ref<StorageInfo | null>(null)
const failed = ref(false)
const busy = ref(false)
const copy = settings.storage

const percent = computed(() => (info.value ? usagePercent(info.value.usage, info.value.quota) : 0))

async function refresh() {
  try {
    info.value = await library.storageInfo()
    failed.value = false
  } catch {
    failed.value = true
  }
}

async function protect() {
  busy.value = true
  try {
    const granted = await library.requestPersist()
    if (granted) toast.success(copy.protectDone)
    else toast.warning(copy.protectDenied)
    await refresh()
  } finally {
    busy.value = false
  }
}

async function addToHome() {
  if (await install()) {
    toast.success(copy.installDone)
    await refresh()
  }
}

onMounted(refresh)
</script>

<template>
  <section class="mx-card mx-card--flat mx-set">
    <h2 class="mx-heading">{{ copy.title }}</h2>

    <p v-if="failed" class="mx-muted">{{ copy.unavailable }}</p>
    <p v-else-if="!info" class="mx-muted" role="status">{{ copy.loading }}</p>
    <template v-else>
      <div class="mx-pencilbar mx-set__bar" role="img" :aria-label="usageText(formatBytes(info.usage), formatBytes(info.quota))">
        <span :style="{ width: `${percent}%` }" />
      </div>
      <p class="mx-mono mx-set__usage">{{ usageText(formatBytes(info.usage), formatBytes(info.quota)) }}</p>

      <p class="mx-set__state">
        <Icon :name="info.persisted ? 'lock' : 'info'" />
        <span>{{ info.persisted ? copy.protectedState : copy.unprotectedState }}</span>
      </p>
      <p v-if="info.persisted" class="mx-muted mx-set__note">{{ copy.protectedNote }}</p>
      <button v-else type="button" class="mx-btn mx-btn--block" :disabled="busy" @click="protect">
        <Icon name="lock" /> {{ copy.protect }}
      </button>
    </template>

    <button v-if="canInstall" type="button" class="mx-btn mx-btn--block" @click="addToHome">
      <Icon name="plus" /> {{ copy.install }}
    </button>
  </section>
</template>

<style scoped>
.mx-set { display: grid; gap: 0.75rem; }
.mx-set__usage { font-size: var(--mx-text-sm); }
.mx-set__state { display: flex; align-items: center; gap: 0.4rem; }
.mx-set__note { font-size: var(--mx-text-sm); }
</style>
