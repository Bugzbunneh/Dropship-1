import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/ui";

type SectionHeadingProps = {
  // lets the surrounding <section> point at its heading with aria-labelledby
  id?: string;
  title: string;
  // small line above the title
  eyebrow?: string;
  description?: string;
  link?: { href: string; label: string };
  as?: "h1" | "h2";
  className?: string;
};

export const SectionHeading = ({
  id,
  title,
  eyebrow,
  description,
  link,
  as: Tag = "h2",
  className,
}: SectionHeadingProps) => (
  <div
    className={cn(
      "mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-2 sm:mb-8",
      className,
    )}
  >
    <div className="max-w-2xl">
      {eyebrow ? (
        <p className="mb-1 text-sm font-bold uppercase tracking-wider text-emphasis">{eyebrow}</p>
      ) : null}
      <Tag id={id} className="text-2xl font-bold sm:text-3xl">
        {title}
      </Tag>
      {description ? <p className="mt-2 text-foreground/80">{description}</p> : null}
    </div>
    {link ? (
      <Link
        href={link.href}
        className="group inline-flex items-center gap-1.5 font-bold text-emphasis underline-offset-4 hover:underline"
      >
        {link.label}
        <ArrowRight
          aria-hidden="true"
          className="h-4 w-4 transition-transform motion-safe:group-hover:translate-x-0.5"
        />
      </Link>
    ) : null}
  </div>
);
