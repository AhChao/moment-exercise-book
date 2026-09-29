// Reactive view of one exercise's attempt: frame photos, thumbnails, notes autosave, completion.
import { computed, reactive, ref, watch } from 'vue'
import type { Ref } from 'vue'
import type { Exercise } from '@/types'
import { useLibrary } from '@/store'
import { canComplete, slotPhotos } from './slots'

export function useExerciseAttempt(exercise: Ref<Exercise | undefined>) {
  const library = useLibrary()

  const attempt = computed(() => (exercise.value ? library.attempts.value[exercise.value.id] : undefined))
  const photos = computed(() => slotPhotos(attempt.value?.slots ?? [], library.photos.value, exercise.value?.shots.length ?? 0))
  const completed = computed(() => attempt.value?.completedAt != null)
  const completeEnabled = computed(() => completed.value || canComplete(photos.value))

  // Object URLs are owned (and revoked) by the library; these maps only remember them.
  const thumbs = reactive<Record<string, string>>({})
  const fulls = reactive<Record<string, string>>({})

  async function load(map: Record<string, string>, kind: 'thumb' | 'full', id: string): Promise<void> {
    if (map[id]) return
    try {
      map[id] = await library.photoUrl(id, kind)
    } catch {
      // the frame stays without an image
    }
  }
  watch(photos, (list) => list.forEach((p) => p && void load(thumbs, 'thumb', p.id)), { immediate: true })
  const loadFulls = (): void => photos.value.forEach((p) => p && void load(fulls, 'full', p.id))

  // Notes: seeded once per exercise, then written through on input.
  const observe = ref('')
  const reflect = ref<string[]>([])
  let seededFor = ''
  watch(
    [() => library.loaded.value, () => exercise.value?.id],
    ([loaded, id]) => {
      if (!loaded || !id || seededFor === id || !exercise.value) return
      seededFor = id
      observe.value = attempt.value?.observeNotes ?? ''
      reflect.value = exercise.value.reflect.map((_, i) => attempt.value?.reflectNotes[i] ?? '')
    },
    { immediate: true },
  )

  function counts(): [string, number, number] | null {
    const ex = exercise.value
    return ex ? [ex.id, ex.shots.length, ex.reflect.length] : null
  }
  function setObserve(v: string): void {
    observe.value = v
    const c = counts()
    if (c) void library.saveNotes(c[0], c[1], c[2], { observeNotes: v })
  }
  function setReflect(i: number, v: string): void {
    const next = reflect.value.slice()
    next[i] = v
    reflect.value = next
    const c = counts()
    if (c) void library.saveNotes(c[0], c[1], c[2], { reflectNotes: next })
  }
  function toggleComplete(): void {
    const c = counts()
    if (c && completeEnabled.value) void library.markCompleted(c[0], c[1], c[2], !completed.value)
  }

  return { library, attempt, photos, completed, completeEnabled, thumbs, fulls, loadFulls, observe, reflect, setObserve, setReflect, toggleComplete }
}
