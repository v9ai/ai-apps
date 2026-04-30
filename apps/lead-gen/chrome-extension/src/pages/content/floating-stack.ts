// ── Floating-button stack coordinator ──────────────────────────────
//
// Single source of truth for vertical layout of every fixed-position
// floating button the extension injects on LinkedIn. Each button file
// calls registerInStack(el, priority) after appending to the DOM and
// unregisterFromStack(el) on removal. Lower priority sits closer to
// the bottom of the screen; the coordinator computes each entry's
// `bottom` cumulatively from the actual rendered heights of the
// entries below it.
//
// Why centralized: the previous "every file picks its own hardcoded
// bottom" approach silently collided whenever two buttons shared a
// slot, and the one ad-hoc dynamic stacking pair fell back to a
// shared bottom on a height-0 measurement race.

const BASE_BOTTOM = 24;
const STACK_GAP = 16;

type Entry = { priority: number };
const REGISTRY = new Map<HTMLElement, Entry>();

const resizeObserver =
  typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => layout()) : null;

let layoutScheduled = false;
function scheduleLayout() {
  if (layoutScheduled) return;
  layoutScheduled = true;
  requestAnimationFrame(() => {
    layoutScheduled = false;
    layout();
  });
}

function layout() {
  // GC disconnected entries first so they don't contribute to offsets.
  for (const el of Array.from(REGISTRY.keys())) {
    if (!el.isConnected) {
      if (resizeObserver) resizeObserver.unobserve(el);
      REGISTRY.delete(el);
    }
  }

  const items = [...REGISTRY.entries()].sort(
    ([, a], [, b]) => a.priority - b.priority,
  );

  let cumBottom = BASE_BOTTOM;
  for (const [el] of items) {
    el.style.bottom = `${cumBottom}px`;
    const h = el.getBoundingClientRect().height;
    cumBottom += h + STACK_GAP;
  }
}

export function registerInStack(el: HTMLElement, priority: number): void {
  if (REGISTRY.has(el)) {
    REGISTRY.get(el)!.priority = priority;
  } else {
    REGISTRY.set(el, { priority });
    if (resizeObserver) resizeObserver.observe(el);
  }
  scheduleLayout();
}

export function unregisterFromStack(el: HTMLElement): void {
  if (!REGISTRY.has(el)) return;
  if (resizeObserver) resizeObserver.unobserve(el);
  REGISTRY.delete(el);
  scheduleLayout();
}

if (typeof window !== "undefined") {
  window.addEventListener("resize", scheduleLayout);
}

if (typeof document !== "undefined" && document.body) {
  const mo = new MutationObserver(() => {
    let dirty = false;
    for (const el of Array.from(REGISTRY.keys())) {
      if (!el.isConnected) {
        if (resizeObserver) resizeObserver.unobserve(el);
        REGISTRY.delete(el);
        dirty = true;
      }
    }
    if (dirty) scheduleLayout();
  });
  mo.observe(document.body, { childList: true, subtree: true });
} else if (typeof document !== "undefined") {
  document.addEventListener(
    "DOMContentLoaded",
    () => {
      const mo = new MutationObserver(() => {
        let dirty = false;
        for (const el of Array.from(REGISTRY.keys())) {
          if (!el.isConnected) {
            if (resizeObserver) resizeObserver.unobserve(el);
            REGISTRY.delete(el);
            dirty = true;
          }
        }
        if (dirty) scheduleLayout();
      });
      mo.observe(document.body, { childList: true, subtree: true });
    },
    { once: true },
  );
}
