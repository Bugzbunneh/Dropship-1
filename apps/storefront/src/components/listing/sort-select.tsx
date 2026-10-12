"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useId, useTransition } from "react";
import { SORT_LABELS } from "@/lib/catalog/listing-params";
import type { SortKey } from "@/lib/catalog/types";

type SortSelectProps = {
  value: SortKey;
  // "relevance" is only offered on search results
  includeRelevance: boolean;
  defaultSort: SortKey;
};

export const SortSelect = ({ value, includeRelevance, defaultSort }: SortSelectProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const id = useId();

  const options = (Object.keys(SORT_LABELS) as SortKey[]).filter(
    (key) => key !== "relevance" || includeRelevance,
  );

  const change = (next: SortKey) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === defaultSort) {
      params.delete("sort");
    } else {
      params.set("sort", next);
    }
    params.delete("page");
    const queryString = params.toString();
    startTransition(() => {
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
    });
  };

  return (
    <div className="flex items-center gap-2" aria-busy={pending}>
      <label
        htmlFor={id}
        className="sr-only whitespace-nowrap text-sm font-semibold sm:not-sr-only"
      >
        Sort by
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => change(event.target.value as SortKey)}
        className="h-10 rounded-full border-2 border-muted bg-background px-4 pr-8 font-semibold focus:border-emphasis focus:outline-none"
        data-testid="sort-select"
      >
        {options.map((key) => (
          <option key={key} value={key}>
            {SORT_LABELS[key]}
          </option>
        ))}
      </select>
    </div>
  );
};
