import type { StoreConfig } from "@dropship/config";
import Link from "next/link";

type SiteHeaderProps = {
  storeName: string;
  navigation: StoreConfig["navigation"];
};

const SiteHeader = ({ storeName, navigation }: SiteHeaderProps) => {
  const links = navigation.map((item) => (
    <li key={item.href}>
      <Link href={item.href} className="text-sm hover:underline">
        {item.label}
      </Link>
    </li>
  ));

  return (
    <header className="border-b border-muted">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/" className="font-heading text-xl font-semibold text-primary">
          {storeName}
        </Link>
        <nav aria-label="Main">
          <ul className="flex flex-wrap gap-x-5 gap-y-2">{links}</ul>
        </nav>
      </div>
    </header>
  );
};

export default SiteHeader;
