import { TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { missingBusinessDetails } from "@/lib/content/business";
import { getStoreConfig } from "@/lib/store";
import { Breadcrumbs } from "./breadcrumbs";

type PolicyPageProps = {
  title: string;
  path: string;
  intro?: string;
  // true for pages that are legal documents; shows the "draft" notice until they are reviewed
  legal?: boolean;
  children: ReactNode;
};

// Shared layout for the delivery, returns, privacy, terms, FAQ and contact pages. Legal pages
// carry a prominent notice until a solicitor has reviewed them and the seller's details are
// filled in, so they cannot go live unnoticed (README risk R10).
export const PolicyPage = async ({
  title,
  path,
  intro,
  legal = false,
  children,
}: PolicyPageProps) => {
  const config = await getStoreConfig();
  const missing = missingBusinessDetails(config.business);
  const showNotice = legal && (!config.policies.reviewed || missing.length > 0);

  return (
    <div className="container-page py-8 lg:py-12">
      <Breadcrumbs
        items={[
          { name: "Home", href: "/" },
          { name: title, href: path },
        ]}
        className="mb-6"
      />
      <h1 className="text-4xl font-bold">{title}</h1>
      {intro ? <p className="mt-3 max-w-2xl text-lg text-foreground/85">{intro}</p> : null}

      {showNotice ? (
        <aside
          className="mt-6 flex max-w-2xl gap-3 rounded-2xl border-2 border-sale bg-sale/10 p-4"
          role="note"
          data-testid="draft-notice"
        >
          <TriangleAlert aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-sale" />
          <div className="space-y-1 text-sm">
            <p className="font-bold text-sale">Draft: not yet reviewed for launch</p>
            {!config.policies.reviewed ? (
              <p>
                This page is a working draft and must be checked by a solicitor before the store
                opens.
              </p>
            ) : null}
            {missing.length > 0 ? (
              <p>Still to add to the store’s business details: {missing.join(", ")}.</p>
            ) : null}
          </div>
        </aside>
      ) : null}

      <div className="prose-page mt-8">{children}</div>
    </div>
  );
};
