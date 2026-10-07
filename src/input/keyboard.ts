/** Bind lower-cased `KeyboardEvent.key` values to actions. Returns an unbind function. */
export function bindKeys(bindings: Record<string, (e: KeyboardEvent) => void>): () => void {
  const onKeyDown = (e: KeyboardEvent): void => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    // Leave typing / dropdown keys (Space, arrows) to form controls.
    if (e.target instanceof HTMLElement && e.target.closest('select, input, textarea')) return;
    const action = bindings[e.key.toLowerCase()];
    if (!action) return;
    e.preventDefault();
    action(e);
  };
  window.addEventListener('keydown', onKeyDown);
  return () => window.removeEventListener('keydown', onKeyDown);
}
