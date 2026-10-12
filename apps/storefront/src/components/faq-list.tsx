import { ChevronDown } from "lucide-react";
import Link from "next/link";
import type { FaqItem } from "@/lib/content/faq";

type FaqListProps = {
  items: FaqItem[];
  // how many to show, for the short version on the home page
  limit?: number;
};

// Questions that open and close with the keyboard or a tap. Native <details>, so it works without
// any script.
export const FaqList = ({ items, limit }: FaqListProps) => (
  <div className="divide-y divide-muted rounded-3xl border border-muted bg-background">
    {items.slice(0, limit).map((item) => (
      <details key={item.question} className="group px-5 sm:px-7">
        <summary className="flex list-none items-center justify-between gap-4 py-5 font-heading text-lg font-bold [&::-webkit-details-marker]:hidden">
          {item.question}
          <ChevronDown
            aria-hidden="true"
            className="h-5 w-5 shrink-0 transition-transform group-open:rotate-180"
          />
        </summary>
        <div className="space-y-3 pb-6 pr-8 text-foreground/85">
          {item.answer.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          {item.link ? (
            <p>
              <Link
                href={item.link.href}
                className="font-bold text-emphasis underline underline-offset-4"
              >
                {item.link.label}
              </Link>
            </p>
          ) : null}
        </div>
      </details>
    ))}
  </div>
);
