// Album-picker path: a chosen file becomes a stored photo in one frame of an exercise.
import type { Exercise } from '@/types'
import { useLibrary } from '@/store'
import { importPhotoFile } from '@/store/importFile'
import { toast } from '@/ui/useToast'
import { exerciseCopy } from '@/copy/exercise'

/** Returns true when the photo was stored and assigned; failures are reported with a toast. */
export async function placeFile(exercise: Exercise, slotIndex: number, file: File): Promise<boolean> {
  const library = useLibrary()
  try {
    const input = await importPhotoFile(file)
    const meta = await library.addPhoto(input)
    await library.assignSlot(exercise.id, slotIndex, exercise.shots.length, meta.id)
    toast.success(exerciseCopy.placedToast)
    return true
  } catch (e) {
    const notImage = e instanceof Error && e.message === 'not-an-image'
    toast.error(notImage ? exerciseCopy.notImage : exerciseCopy.placeFailed)
    return false
  }
}
