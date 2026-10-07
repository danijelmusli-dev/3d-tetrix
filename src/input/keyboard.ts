/** Bind lower-cased `KeyboardEvent.key` values to actions. Returns an unbind function. */
export function bindKeys(bindings: Record<string, () => void>): () => void {
  const onKeyDown = (e: KeyboardEvent): void => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const action = bindings[e.key.toLowerCase()];
    if (!action) return;
    e.preventDefault();
    action();
  };
  window.addEventListener('keydown', onKeyDown);
  return () => window.removeEventListener('keydown', onKeyDown);
}
