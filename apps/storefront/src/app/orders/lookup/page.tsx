import type { Metadata } from "next";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { OrderLookupForm } from "@/components/orders/order-lookup-form";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export const metadata: Metadata = {
  title: "Find your order",
  robots: { index: false, follow: false },
};

const Form = async ({ searchParams }: { searchParams: SearchParams }) => {
  const { order } = await searchParams;
  const initialOrder = typeof order === "string" ? order.slice(0, 40) : "";
  return <OrderLookupForm initialOrder={initialOrder} />;
};

const OrderLookupPage = ({ searchParams }: { searchParams: SearchParams }) => (
  <div className="container-page py-8 lg:py-12">
    <Breadcrumbs
      items={[
        { name: "Home", href: "/" },
        { name: "Find your order", href: "/orders/lookup" },
      ]}
      className="mb-6"
    />
    <div className="max-w-xl">
      <h1 className="text-4xl font-bold">Find your order</h1>
      <p className="mt-3 text-lg text-foreground/85">
        See where your order is, with no account needed. We’ll ask for the order number and the
        email address you used at checkout.
      </p>
      <div className="mt-8">
        <Suspense fallback={<div className="h-72 animate-pulse rounded-3xl bg-surface" />}>
          <Form searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  </div>
);

export default OrderLookupPage;
