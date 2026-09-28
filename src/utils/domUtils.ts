/**
 * DOM & Layout Optimization Utilities
 * Decouples scroll and layout readings from the main thread execution
 * to prevent forced reflow / layout thrashing.
 */

export function safeScrollToTop(behavior: ScrollBehavior = 'smooth'): void {
  if (typeof window === 'undefined') return;
  window.requestAnimationFrame(() => {
    try {
      window.scrollTo({ top: 0, behavior });
    } catch {
      window.scrollTo(0, 0);
    }
  });
}

export function safeScrollIntoView(element: HTMLElement | null, behavior: ScrollBehavior = 'smooth'): void {
  if (!element || typeof window === 'undefined') return;
  window.requestAnimationFrame(() => {
    try {
      element.scrollIntoView({ behavior });
    } catch {
      element.scrollIntoView();
    }
  });
}
