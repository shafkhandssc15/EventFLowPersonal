import { useRef, useEffect } from 'react';

/**
 * Hook to enable smooth touch & mouse drag-to-scroll with momentum and zero scrollbars.
 * Allows users on touchscreens, laptops, trackpads, and mice to swipe/drag the screen naturally.
 */
export function useTouchDragScroll<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let isDown = false;
    let startY = 0;
    let scrollTop = 0;
    let startX = 0;
    let scrollLeft = 0;
    let isDragging = false;
    let velocityY = 0;
    let lastY = 0;
    let lastTime = 0;
    let momentumID: number | null = null;

    const stopMomentum = () => {
      if (momentumID) {
        cancelAnimationFrame(momentumID);
        momentumID = null;
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      // Don't hijack input/textarea or range controls
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.getAttribute('contenteditable') === 'true'
      ) {
        return;
      }

      stopMomentum();
      isDown = true;
      isDragging = false;
      startY = e.pageY - el.offsetTop;
      scrollTop = el.scrollTop;
      startX = e.pageX - el.offsetLeft;
      scrollLeft = el.scrollLeft;
      lastY = e.pageY;
      lastTime = performance.now();
      velocityY = 0;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDown) return;

      const y = e.pageY - el.offsetTop;
      const x = e.pageX - el.offsetLeft;
      const deltaY = y - startY;
      const deltaX = x - startX;

      // Threshold to detect genuine drag gesture vs tap
      if (!isDragging && (Math.abs(deltaY) > 4 || Math.abs(deltaX) > 4)) {
        isDragging = true;
        el.style.cursor = 'grabbing';
      }

      if (isDragging) {
        e.preventDefault();
        el.scrollTop = scrollTop - deltaY;
        el.scrollLeft = scrollLeft - deltaX;

        const now = performance.now();
        const dt = now - lastTime;
        if (dt > 0) {
          velocityY = (e.pageY - lastY) / dt;
          lastY = e.pageY;
          lastTime = now;
        }
      }
    };

    const onPointerUp = () => {
      if (!isDown) return;
      isDown = false;
      el.style.cursor = '';

      if (isDragging) {
        // Prevent accidental clicks on child elements if user was dragging
        const preventClick = (clickEvent: MouseEvent) => {
          clickEvent.stopPropagation();
          clickEvent.preventDefault();
          window.removeEventListener('click', preventClick, true);
        };
        window.addEventListener('click', preventClick, true);

        // Apply smooth inertia / momentum
        let currentVelocity = velocityY * 16; // approximate per-frame velocity
        const friction = 0.94;

        const momentumStep = () => {
          if (Math.abs(currentVelocity) > 0.5) {
            el.scrollTop -= currentVelocity;
            currentVelocity *= friction;
            momentumID = requestAnimationFrame(momentumStep);
          } else {
            stopMomentum();
          }
        };

        stopMomentum();
        momentumID = requestAnimationFrame(momentumStep);
      }
    };

    const onPointerCancel = () => {
      isDown = false;
      isDragging = false;
      el.style.cursor = '';
      stopMomentum();
    };

    el.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);

    return () => {
      stopMomentum();
      el.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
    };
  }, []);

  return ref;
}
