"use client";

import { useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { cn } from "@/lib/ui";
import { useMoney } from "./store-settings";

type Suggestion = {
  slug: string;
  title: string;
  brand: string | null;
  department: string;
  imagePath: string | null;
  imageAlt: string;
  priceFromMinor: number;
};

const MIN_CHARACTERS = 2;
const DEBOUNCE_MS = 180;

const useDebounced = (value: string, delayMs: number): string => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
};

type SearchBoxProps = {
  className?: string;
  autoFocus?: boolean;
};

// A search field that suggests products as you type. It follows the standard combobox pattern, so
// it works with the keyboard (arrows, Enter, Escape) and with screen readers, and it still
// submits to /search without JavaScript.
export const SearchBox = ({ className, autoFocus = false }: SearchBoxProps) => {
  const router = useRouter();
  const formatMoney = useMoney();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const term = useDebounced(text.trim(), DEBOUNCE_MS);
  const enabled = term.length >= MIN_CHARACTERS;

  const { data: suggestions = [] } = useQuery({
    queryKey: ["search-suggest", term],
    enabled,
    staleTime: 60_000,
    queryFn: async ({ signal }): Promise<Suggestion[]> => {
      const response = await fetch(`/api/search/suggest?q=${encodeURIComponent(term)}`, { signal });
      return response.ok ? ((await response.json()) as Suggestion[]) : [];
    },
  });

  const visible = open && enabled && suggestions.length > 0;
  const optionId = (index: number): string => `${listId}-option-${index}`;

  const close = () => {
    setOpen(false);
    setActive(-1);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = text.trim();
    if (active >= 0 && suggestions[active]) {
      router.push(`/products/${suggestions[active].slug}`);
    } else if (trimmed) {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    }
    close();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      close();
    } else if (event.key === "ArrowDown" && suggestions.length > 0) {
      event.preventDefault();
      setOpen(true);
      setActive((current) => (current + 1) % suggestions.length);
    } else if (event.key === "ArrowUp" && suggestions.length > 0) {
      event.preventDefault();
      setActive((current) => (current <= 0 ? suggestions.length - 1 : current - 1));
    }
  };

  return (
    <div
      className={cn("relative", className)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          close();
        }
      }}
    >
      <form action="/search" method="get" role="search" onSubmit={submit} className="relative">
        <label htmlFor={`${listId}-input`} className="sr-only">
          Search products
        </label>
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-foreground/60"
        />
        <input
          ref={inputRef}
          id={`${listId}-input`}
          name="q"
          type="search"
          value={text}
          autoFocus={autoFocus}
          autoComplete="off"
          placeholder="Search beds, toys, treats…"
          role="combobox"
          aria-expanded={visible}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? optionId(active) : undefined}
          onChange={(event) => {
            setText(event.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="h-11 w-full rounded-full border-2 border-muted bg-background pl-12 pr-11 text-base placeholder:text-foreground/70 focus:border-emphasis focus:outline-none focus-visible:outline-none"
        />
        {text ? (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setText("");
              close();
              inputRef.current?.focus();
            }}
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-foreground/70 hover:bg-surface"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        ) : null}
      </form>

      <div
        hidden={!visible}
        className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[70vh] overflow-auto rounded-2xl border border-muted bg-background p-2 shadow-lift"
      >
        <ul id={listId} role="listbox" aria-label="Search suggestions">
          {suggestions.map((suggestion, index) => (
            <li key={suggestion.slug} role="presentation">
              <a
                id={optionId(index)}
                role="option"
                aria-selected={index === active}
                href={`/products/${suggestion.slug}`}
                onClick={close}
                className={cn(
                  "flex items-center gap-3 rounded-xl p-2 hover:bg-surface",
                  index === active && "bg-surface",
                )}
              >
                <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-surface">
                  {suggestion.imagePath ? (
                    <Image
                      src={suggestion.imagePath}
                      alt=""
                      fill
                      sizes="48px"
                      unoptimized
                      className="object-cover"
                    />
                  ) : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{suggestion.title}</span>
                  <span className="block text-sm text-foreground/70">
                    {suggestion.brand ?? " "}
                  </span>
                </span>
                <span className="text-sm font-bold">{formatMoney(suggestion.priceFromMinor)}</span>
              </a>
            </li>
          ))}
        </ul>
        {/* outside the listbox, which may only contain options */}
        <a
          href={`/search?q=${encodeURIComponent(text.trim())}`}
          className="mt-1 block rounded-xl border-t border-muted p-2 pt-3 text-center text-sm font-bold text-emphasis hover:bg-surface"
        >
          See all results for “{text.trim()}”
        </a>
      </div>
    </div>
  );
};
