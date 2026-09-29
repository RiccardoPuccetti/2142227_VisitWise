/** Whether the user asked the system for less motion: scripted animations (map glides, smooth scrolls) are skipped. */
export function prefersReducedMotion(): boolean {
  return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}
