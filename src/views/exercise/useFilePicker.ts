// Hidden <input type=file> driven from code. No `capture` attribute: photos come from the album only.
import { ref } from 'vue'

export function useFilePicker(onFile: (target: number, file: File) => void) {
  const input = ref<HTMLInputElement | null>(null)
  let target = -1

  function open(index: number): void {
    target = index
    const el = input.value
    if (!el) return
    el.value = ''
    el.click()
  }

  function onChange(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (file) onFile(target, file)
  }

  return { input, open, onChange }
}
