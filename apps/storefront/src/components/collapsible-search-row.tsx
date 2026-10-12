"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/ui";

const MIN_SCROLL_BEFORE_HIDING = 80;
const SCROLL_DISTANCE_TO_REACT = 6;

// The phone header's second row (search). It hangs just below the pinned logo row, fades away when
// you scroll down, and comes back the moment you scroll up or tap into the field. From tablet up the
// search sits in the main row, so this is not shown at all.
//
// It overlays the page instead of resizing the header. Resizing would change the page's height as
// you scroll, and the browser would nudge the scroll position to compensate, which would undo the
// change and make the row flicker. A spacer after the header (see SiteHeader) reserves the row's
// space at the top of the page, and scrolls away with the content like anything else.
export const CollapsibleSearchRow = ({ children }: { children: ReactNode }) => {
  const [hidden, setHidden] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let lastY = window.scrollY;
    let frame = 0;

    const update = () => {
      const y = window.scrollY;
      const delta = y - lastY;
      const typing = rowRef.current?.contains(document.activeElement) ?? false;

      if (typing || y < MIN_SCROLL_BEFORE_HIDING) {
        setHidden(false);
      } else if (delta > SCROLL_DISTANCE_TO_REACT) {
        setHidden(true);
      } else if (delta < -SCROLL_DISTANCE_TO_REACT) {
        setHidden(false);
      }
      lastY = y;
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };

    window.addEventListener("scroll", schedule, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
    };
  }, []);

  return (
    <div
      ref={rowRef}
      // inert keeps the hidden field out of the tab order and away from screen readers
      inert={hidden}
      className={cn(
        "absolute inset-x-0 top-full border-b border-muted bg-background/95 backdrop-blur md:hidden",
        "transition-[opacity,transform,visibility] duration-200",
        hidden ? "invisible -translate-y-2 opacity-0" : "visible translate-y-0 opacity-100",
      )}
    >
      <div className="container-page py-2">{children}</div>
    </div>
  );
};
