const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));

/** Finish opening early, leaving the final third for reading. */
export function sceneUnfolding(scroll: number, start: number, travel: number) {
  const progress = clamp((scroll - start) / Math.max(1, travel), 0, 1);
  const phase = Math.min(1, progress / .68);
  return { progress, unfolded: phase * phase * (3 - 2 * phase) };
}

/** Correct only the remaining movement after native browser scroll anchoring. */
export function readerAnchorDelta(beforeTop: number, afterTop: number, scroll: number, maximumScroll: number) {
  if (![beforeTop, afterTop, scroll, maximumScroll].every(Number.isFinite)) return 0;
  return clamp(scroll + afterTop - beforeTop, 0, Math.max(0, maximumScroll)) - scroll;
}

/** Re-enabling a scene already passed by the reader must use its exit position.
 * Otherwise a sticky pin cannot restore its old location with an anchor delta.
 */
export function resumedSceneDelta(input: {
  wasEnabled: boolean; enabled: boolean; beforeTop: number; stickyTop: number;
  beforeHeight: number; afterHeight: number; beforeScroll: number; scroll: number; maximumScroll: number;
}) {
  const { wasEnabled, enabled, beforeTop, stickyTop, beforeHeight, afterHeight, beforeScroll, scroll, maximumScroll } = input;
  if (wasEnabled || !enabled || beforeTop >= stickyTop || afterHeight <= beforeHeight) return 0;
  if (![beforeTop, stickyTop, beforeHeight, afterHeight, beforeScroll, scroll, maximumScroll].every(Number.isFinite)) return 0;
  return clamp(beforeScroll + afterHeight - beforeHeight, 0, Math.max(0, maximumScroll)) - scroll;
}

/** Sum all scenes that add reserved space before the reader on global resume. */
export function resumedScenesDelta(beforeScroll: number, scroll: number, maximumScroll: number, scenes: {
  wasEnabled: boolean; enabled: boolean; beforeTop: number; stickyTop: number; beforeHeight: number; afterHeight: number;
}[]) {
  const added = scenes.reduce((total, scene) => total + (
    !scene.wasEnabled && scene.enabled && scene.beforeTop < scene.stickyTop && scene.afterHeight > scene.beforeHeight
      ? scene.afterHeight - scene.beforeHeight : 0
  ), 0);
  if (!added || ![beforeScroll, scroll, maximumScroll, added].every(Number.isFinite)) return 0;
  return clamp(beforeScroll + added, 0, Math.max(0, maximumScroll)) - scroll;
}

const pendingReaders = new WeakMap<HTMLElement, () => void>();

/** Capture before a global motion mode changes, then restore once after every
 * registered scene has reconciled its layout. No ordinary scroll calls this.
 */
export function preserveMarketingReader(root: HTMLElement) {
  pendingReaders.get(root)?.();
  const navigation = root.querySelector<HTMLElement>('.marketing-nav');
  const readingTop = Math.max(0, navigation?.getBoundingClientRect().bottom ?? 0);
  const eligible = (element: HTMLElement) => {
    if (!element.isConnected || element.closest('.marketing-nav,.marketing-motion-dock,.marketing-journey-menu')) return false;
    const rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height || rect.bottom <= readingTop || rect.top >= innerHeight - 20) return false;
    for (let node: HTMLElement | null = element; node && node !== root; node = node.parentElement) {
      if (getComputedStyle(node).position === 'fixed') return false;
    }
    return true;
  };
  let element: HTMLElement | undefined;
  for (const y of [readingTop + 70, innerHeight * .45, innerHeight * .7]) {
    if (y >= innerHeight - 20) continue;
    for (const x of [innerWidth * .5, innerWidth * .25, innerWidth * .75]) {
      const hit = document.elementFromPoint(x, y)?.closest<HTMLElement>('h1,h2,h3,h4,p,li,dt,dd,summary,a,button,figure');
      if (hit && root.contains(hit) && eligible(hit)) { element = hit; break; }
    }
    if (element) break;
  }
  if (!element) element = [...root.querySelectorAll<HTMLElement>('h1,h2,h3,h4,p,summary,figure')].find(eligible);
  if (!element) return;
  const anchor = element, top = anchor.getBoundingClientRect().top, beforeScroll = scrollY, url = location.href;
  const scenes = [...root.querySelectorAll<HTMLElement>('[data-reader-scene]')].map(scene => ({
    element: scene, wasEnabled: scene.dataset.readerActive === 'true',
    beforeTop: scene.getBoundingClientRect().top, beforeHeight: scene.getBoundingClientRect().height,
  }));
  let active = true, frame = 0;
  const interruptEvents = ['wheel', 'touchmove', 'pointerdown', 'keydown', 'hashchange', 'popstate', 'resize'] as const;
  const cancel = () => {
    if (!active) return;
    active = false;
    cancelAnimationFrame(frame);
    interruptEvents.forEach(name => removeEventListener(name, cancel));
    if (pendingReaders.get(root) === cancel) pendingReaders.delete(root);
  };
  const available = () => active && root.isConnected && anchor.isConnected && location.href === url;
  const maximumScroll = () => Math.max(0, document.documentElement.scrollHeight - innerHeight);
  const finish = () => {
    if (!available()) { cancel(); return; }
    const bounds = anchor.getBoundingClientRect();
    if (bounds.width && bounds.height) {
      const delta = readerAnchorDelta(top, bounds.top, scrollY, maximumScroll());
      if (Math.abs(delta) > .5) scrollBy({ top: delta, behavior: 'instant' });
    }
    cancel();
  };
  pendingReaders.set(root, cancel);
  interruptEvents.forEach(name => addEventListener(name, cancel, { passive: true }));
  // The first frame lets every component schedule its measure; the next sees
  // the combined layout, including a tour and fan above the visible content.
  frame = requestAnimationFrame(() => {
    frame = requestAnimationFrame(() => {
      if (!available()) { cancel(); return; }
      const delta = resumedScenesDelta(beforeScroll, scrollY, maximumScroll(), scenes.filter(scene => scene.element.isConnected).map(scene => ({
        ...scene, enabled: scene.element.dataset.readerActive === 'true',
        stickyTop: Number(scene.element.dataset.readerTop) || readingTop + 8,
        afterHeight: scene.element.getBoundingClientRect().height,
      })));
      if (Math.abs(delta) > .5) {
        scrollBy({ top: delta, behavior: 'instant' });
        root.dispatchEvent(new CustomEvent('findin-reader-positioned'));
        // Let scene progress reflect the corrected position before the final
        // measured text correction. A new user input cancels this immediately.
        frame = requestAnimationFrame(finish);
      } else finish();
    });
  });
}
