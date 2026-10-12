import Link from "next/link";
import { DepartmentTheme } from "@/components/department-theme";
import { DepartmentMark } from "@/components/pet-marks";
import { SearchBox } from "@/components/search-box";
import { getStoreConfig } from "@/lib/store";
import { buttonClasses } from "@/lib/ui";

// A page that doesn't exist should still lead somewhere: a search box, and a way into each pet.
const NotFound = async () => {
  const config = await getStoreConfig();

  return (
    <div className="container-page py-16 text-center md:py-24">
      <p className="text-sm font-bold uppercase tracking-wider text-emphasis">Error 404</p>
      <h1 className="mt-2 text-4xl font-bold sm:text-5xl">We can’t find that page</h1>
      <p className="mx-auto mt-3 max-w-lg text-lg text-foreground/80">
        It may have moved, or the link might be wrong. Try searching, or head to one of our shops.
      </p>

      <div className="mx-auto mt-8 max-w-md">
        <SearchBox />
      </div>

      <ul className="mt-10 flex flex-wrap justify-center gap-6">
        {config.departments.map((department) => (
          <li key={department.slug}>
            <DepartmentTheme department={department}>
              <Link href={`/${department.slug}`} className="group flex flex-col items-center gap-3">
                <span className="flex h-32 w-32 items-center justify-center rounded-full bg-surface transition motion-safe:group-hover:scale-105">
                  <DepartmentMark slug={department.slug} className="h-24 w-24" />
                </span>
                <span className={buttonClasses("primary", "md")}>Shop {department.name}</span>
              </Link>
            </DepartmentTheme>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default NotFound;
