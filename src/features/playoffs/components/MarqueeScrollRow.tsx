import { useCallback, useRef, type KeyboardEvent, type ReactNode } from 'react';

export function MarqueeScrollRow({
  children,
  ariaLabel,
}: {
  children: ReactNode;
  /** Accessible name for the scrollable region. */
  ariaLabel: string;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  const scroll = useCallback((dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const step = Math.min(el.clientWidth * 0.82, 520) * dir;
    el.scrollBy({ left: step, behavior: 'smooth' });
  }, []);

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        scroll(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        scroll(1);
      }
    },
    [scroll],
  );

  return (
    <div className="marquee-broadcast-strip-wrap marquee-broadcast-strip-wrap--scores">
      <button
        type="button"
        className="marquee-broadcast-scroll-btn"
        aria-label={`${ariaLabel} — scroll left`}
        onClick={() => scroll(-1)}
      >
        ‹
      </button>
      <div
        ref={scrollerRef}
        className="marquee-broadcast-scroll-scroller"
        tabIndex={0}
        role="group"
        aria-label={ariaLabel}
        onKeyDown={onKeyDown}
      >
        <div className="marquee-broadcast-scroll-inner">{children}</div>
      </div>
      <button
        type="button"
        className="marquee-broadcast-scroll-btn"
        aria-label={`${ariaLabel} — scroll right`}
        onClick={() => scroll(1)}
      >
        ›
      </button>
    </div>
  );
}
