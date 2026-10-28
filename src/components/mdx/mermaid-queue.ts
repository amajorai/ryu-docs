/**
 * Serializes Mermaid renders across every diagram on the page.
 *
 * `mermaid.initialize` writes global config that `mermaid.render` reads only
 * when Mermaid's own queue reaches that render. Without this, a concurrent
 * diagram could swap the font (or theme) between the two calls, and labels
 * measured in one font would be painted in another (see `mermaid-font.ts`).
 */

let renderQueue: Promise<void> = Promise.resolve();

/** Runs `task` once every earlier task has settled, even if one rejected. */
export function renderExclusively<T>(task: () => Promise<T>): Promise<T> {
  const result = renderQueue.then(task);
  renderQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}
