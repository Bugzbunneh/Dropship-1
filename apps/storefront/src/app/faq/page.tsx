import type { Metadata } from "next";
import { FaqList } from "@/components/faq-list";
import { PolicyPage } from "@/components/policy-page";
import { faqItems } from "@/lib/content/faq";
import { getStoreConfig } from "@/lib/store";

export const metadata: Metadata = {
  title: "FAQs",
  description: "Answers about delivery, returns, payments and choosing the right product.",
  alternates: { canonical: "/faq" },
};

const FaqPage = async () => {
  const config = await getStoreConfig();

  return (
    <PolicyPage
      title="Frequently asked questions"
      path="/faq"
      intro="Quick answers to the things people ask most."
    >
      <div className="not-prose max-w-3xl">
        <FaqList items={faqItems(config)} />
      </div>
    </PolicyPage>
  );
};

export default FaqPage;
