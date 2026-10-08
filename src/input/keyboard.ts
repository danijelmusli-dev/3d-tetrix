/** Toggles and turns fire once per press; holding them must not machine-gun. */
const ONE_SHOT = new Set(['m', 'n', 'x', ' ', 'q', 'e', 'escape']);

/** Bind lower-cased `KeyboardEvent.key` values to actions. Returns an unbind function. */
export function bindKeys(bindings: Record<string, (e: KeyboardEvent) => void>): () => void {
  const onKeyDown = (e: KeyboardEvent): void => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    // Leave typing / dropdown keys (Space, arrows) to form controls.
    if (e.target instanceof HTMLElement && e.target.closest('select, input, textarea')) return;
    const key = e.key.toLowerCase();
    const action = bindings[key];
    if (!action) return;
    e.preventDefault();
    if (e.repeat && ONE_SHOT.has(key)) return;
    action(e);
  };
  window.addEventListener('keydown', onKeyDown);
  return () => window.removeEventListener('keydown', onKeyDown);
}
