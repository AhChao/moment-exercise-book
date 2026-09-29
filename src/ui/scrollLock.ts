// Body scroll lock is refcounted so nested modals (and rapid close/open sequences)
// never unlock the page while any dialog is still open.
let lockCount = 0

export function lockScroll(): void {
  if (++lockCount === 1) document.body.style.overflow = 'hidden'
}

export function unlockScroll(): void {
  if (lockCount > 0 && --lockCount === 0) document.body.style.overflow = ''
}
