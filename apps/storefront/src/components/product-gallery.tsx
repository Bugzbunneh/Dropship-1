"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useRef, useState, type KeyboardEvent, type TouchEvent } from "react";
import type { CatalogImage } from "@/lib/catalog/types";
import { cn } from "@/lib/ui";
import { PawMark } from "./pet-marks";

type ProductGalleryProps = {
  images: CatalogImage[];
  productTitle: string;
};

const SWIPE_DISTANCE = 40;
const isVector = (path: string): boolean =>
  path.startsWith("/placeholder.svg") || path.endsWith(".svg");

// One large picture with thumbnails underneath. On a phone you can swipe between pictures; with
// a keyboard the thumbnails work as a group of buttons you move through with the arrow keys.
export const ProductGallery = ({ images, productTitle }: ProductGalleryProps) => {
  const [current, setCurrent] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const count = images.length;

  if (count === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-3xl bg-surface text-accent">
        <PawMark className="h-1/3 w-1/3 opacity-60" />
      </div>
    );
  }

  const go = (index: number) => setCurrent((index + count) % count);
  const image = images[current] ?? images[0]!;

  const onTouchStart = (event: TouchEvent) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (event: TouchEvent) => {
    const start = touchStartX.current;
    const end = event.changedTouches[0]?.clientX;
    touchStartX.current = null;
    if (start === null || end === undefined || count < 2) {
      return;
    }
    if (start - end > SWIPE_DISTANCE) {
      go(current + 1);
    } else if (end - start > SWIPE_DISTANCE) {
      go(current - 1);
    }
  };
  const onThumbKeyDown = (event: KeyboardEvent) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      go(current + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      go(current - 1);
    }
  };

  return (
    <div className="space-y-3" data-testid="product-gallery">
      <div
        className="group relative aspect-square overflow-hidden rounded-3xl bg-surface"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        role="group"
        aria-roledescription="carousel"
        aria-label={`${productTitle} pictures`}
      >
        <Image
          key={image.path}
          src={image.path}
          alt={image.alt}
          fill
          preload
          fetchPriority="high"
          sizes="(min-width: 1024px) 48vw, 100vw"
          unoptimized={isVector(image.path)}
          className="object-cover"
        />
        {count > 1 ? (
          <>
            <button
              type="button"
              onClick={() => go(current - 1)}
              aria-label="Previous picture"
              className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 shadow-md transition hover:bg-background md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
            >
              <ChevronLeft aria-hidden="true" className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => go(current + 1)}
              aria-label="Next picture"
              className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 shadow-md transition hover:bg-background md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
            >
              <ChevronRight aria-hidden="true" className="h-5 w-5" />
            </button>
            <p
              className="absolute bottom-3 right-3 rounded-full bg-foreground/80 px-3 py-1 text-xs font-bold text-background"
              aria-live="polite"
            >
              {current + 1} / {count}
            </p>
          </>
        ) : null}
      </div>

      {count > 1 ? (
        // tab buttons must be direct children of the tablist, so no list items in between
        <div
          className="flex gap-2"
          role="tablist"
          aria-label="Choose a picture"
          onKeyDown={onThumbKeyDown}
        >
          {images.map((thumb, index) => (
            <button
              key={thumb.path}
              type="button"
              role="tab"
              aria-selected={index === current}
              aria-label={`Show picture ${index + 1} of ${count}`}
              tabIndex={index === current ? 0 : -1}
              onClick={() => setCurrent(index)}
              className={cn(
                "relative block h-16 w-16 overflow-hidden rounded-xl border-2 bg-surface transition sm:h-20 sm:w-20",
                index === current
                  ? "border-emphasis"
                  : "border-transparent opacity-75 hover:opacity-100",
              )}
            >
              <Image
                src={thumb.path}
                alt=""
                fill
                sizes="80px"
                unoptimized={isVector(thumb.path)}
                className="object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};
