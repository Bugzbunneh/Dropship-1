import Image from "next/image";
import type { CatalogImage } from "@/lib/catalog/types";
import { cn } from "@/lib/ui";
import { PawMark } from "./pet-marks";

type ProductImageProps = {
  image: CatalogImage | null;
  // how wide the image is on screen at each breakpoint, so the browser downloads the right size
  sizes: string;
  // true for the one image that is likely the largest thing on the first screen
  priority?: boolean;
  className?: string;
};

// The demo catalog's illustrations are SVG, which the image optimiser would only re-encode.
const isVector = (path: string): boolean =>
  path.startsWith("/placeholder.svg") || path.endsWith(".svg");

// Fills its parent, which must be `relative` and have a fixed aspect ratio (so the page does not
// jump as images arrive). Falls back to a paw print when a product has no picture.
export const ProductImage = ({ image, sizes, priority = false, className }: ProductImageProps) => {
  if (!image) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-surface text-accent">
        <PawMark className="h-1/3 w-1/3 opacity-60" />
      </div>
    );
  }

  return (
    <Image
      src={image.path}
      alt={image.alt}
      fill
      sizes={sizes}
      preload={priority}
      fetchPriority={priority ? "high" : undefined}
      unoptimized={isVector(image.path)}
      className={cn("object-cover", className)}
    />
  );
};
