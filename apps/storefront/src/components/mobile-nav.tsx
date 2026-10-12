"use client";

import { ChevronDown, Menu, X } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";
import { DepartmentMark } from "./pet-marks";

export type NavDepartment = {
  slug: string;
  name: string;
  tagline: string;
  // colours for this department, applied as inline custom properties on its section
  style: Record<string, string>;
  collections: { slug: string; title: string }[];
};

type MobileNavProps = {
  storeName: string;
  departments: NavDepartment[];
  helpLinks: { label: string; href: string }[];
};

// The small-screen menu: a full-height drawer from the left. Each pet gets its own coloured
// section that opens to show its collections.
export const MobileNav = ({ storeName, departments, helpLinks }: MobileNavProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const open = () => dialogRef.current?.showModal();
  const close = () => dialogRef.current?.close();

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-label="Open menu"
        className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-surface md:hidden"
      >
        <Menu aria-hidden="true" className="h-6 w-6" />
      </button>

      <dialog
        ref={dialogRef}
        className="drawer fixed inset-y-0 left-0 right-auto w-full max-w-sm [--drawer-from:-100%]"
        aria-label={`${storeName} menu`}
        onClick={(event) => {
          // close when the dimmed area, or any link inside the menu, is clicked
          const target = event.target as HTMLElement;
          if (target === dialogRef.current || target.closest("a")) {
            close();
          }
        }}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-muted px-5 py-4">
            <span className="font-heading text-xl font-bold">{storeName}</span>
            <button
              type="button"
              onClick={close}
              aria-label="Close menu"
              className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-surface"
            >
              <X aria-hidden="true" className="h-5 w-5" />
            </button>
          </div>

          <nav aria-label="Mobile" className="flex-1 space-y-3 overflow-y-auto p-4">
            {departments.map((department) => (
              <details
                key={department.slug}
                style={department.style}
                className="group overflow-hidden rounded-2xl bg-surface"
              >
                <summary className="flex list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
                  <DepartmentMark slug={department.slug} className="h-12 w-12 shrink-0" />
                  <span className="flex-1">
                    <span className="block font-heading text-xl font-bold text-emphasis">
                      {department.name}
                    </span>
                    <span className="block text-sm text-foreground/75">{department.tagline}</span>
                  </span>
                  <ChevronDown
                    aria-hidden="true"
                    className="h-5 w-5 text-emphasis transition-transform group-open:rotate-180"
                  />
                </summary>
                <ul className="space-y-1 px-4 pb-4">
                  <li>
                    <Link
                      href={`/${department.slug}`}
                      className="block rounded-xl bg-primary px-4 py-3 text-center font-bold text-primary-foreground"
                    >
                      Shop all {department.name.toLowerCase()}
                    </Link>
                  </li>
                  {department.collections.map((collection) => (
                    <li key={collection.slug}>
                      <Link
                        href={`/${department.slug}/${collection.slug}`}
                        className="block rounded-xl px-4 py-3 font-semibold hover:bg-background"
                      >
                        {collection.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </details>
            ))}

            <ul className="space-y-1 pt-2">
              {helpLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="block rounded-xl px-4 py-3 font-semibold hover:bg-surface"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </dialog>
    </>
  );
};
