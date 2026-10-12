import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CartPageContent } from "@/components/cart-page-content";
import { ProductGrid } from "@/components/product-grid";
import { SectionHeading } from "@/components/section-heading";
import { getSnapshot } from "@/lib/catalog";
import { featuredCards } from "@/lib/catalog/queries";

export const metadata: Metadata = {
  title: "Your cart",
  robots: { index: false, follow: false },
};

const CartPage = async () => {
  const snapshot = await getSnapshot();
  const suggestions = featuredCards(snapshot, { limit: 4 });

  return (
    <div className="container-page py-8 lg:py-12">
      <Breadcrumbs
        items={[
          { name: "Home", href: "/" },
          { name: "Your cart", href: "/cart" },
        ]}
        className="mb-4"
      />
      <h1 className="mb-8 text-4xl font-bold">Your cart</h1>
      <CartPageContent />

      <section className="mt-20" aria-labelledby="cart-suggestions">
        <SectionHeading
          id="cart-suggestions"
          title="Popular right now"
          description="Favourites that go well with most baskets."
        />
        <ProductGrid cards={suggestions} showDepartment />
      </section>
    </div>
  );
};

export default CartPage;
