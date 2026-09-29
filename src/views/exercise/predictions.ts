// Pure helpers for the optional prediction prompts of an exercise.

/** Notes padded or trimmed to exactly `n` entries; a missing list (older attempt) becomes all empty. */
export function fitNotes(notes: readonly string[] | undefined, n: number): string[] {
  return Array.from({ length: n }, (_, i) => notes?.[i] ?? '')
}

/** The written predictions worth quoting next to the observation: non-blank, trimmed, in prompt order. */
export function writtenPredictions(notes: readonly string[]): string[] {
  return notes.map((s) => s.trim()).filter((s) => s !== '')
}
