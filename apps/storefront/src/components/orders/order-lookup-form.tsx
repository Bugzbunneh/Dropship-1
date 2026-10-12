"use client";

import { Loader2, Search } from "lucide-react";
import { useActionState, useState } from "react";
import { lookupOrder, type LookupState } from "@/app/orders/actions";
import { buttonClasses } from "@/lib/ui";

const fieldClasses =
  "w-full rounded-xl border-2 border-muted bg-background px-4 py-3 text-base focus:border-emphasis";

export const OrderLookupForm = ({ initialOrder }: { initialOrder: string }) => {
  const [state, action, pending] = useActionState<LookupState, FormData>(lookupOrder, {
    order: initialOrder,
  });
  // Kept in state because React empties a form's uncontrolled fields after an action finishes,
  // which would wipe what someone typed just because they made a typo.
  const [order, setOrder] = useState(state.order ?? initialOrder);
  const [email, setEmail] = useState(state.email ?? "");

  return (
    <form action={action} className="space-y-5" data-testid="order-lookup-form">
      <div className="space-y-2">
        <label htmlFor="lookup-order" className="block font-semibold">
          Order number
        </label>
        <input
          id="lookup-order"
          name="order"
          type="text"
          required
          value={order}
          onChange={(event) => setOrder(event.target.value)}
          placeholder="PP-7K3M-9Q2X"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          autoComplete="off"
          aria-describedby="lookup-order-hint"
          className={fieldClasses}
        />
        <p id="lookup-order-hint" className="text-sm text-foreground/75">
          It’s in your confirmation email and starts with two or three letters.
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="lookup-email" className="block font-semibold">
          Email address
        </label>
        <input
          id="lookup-email"
          name="email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          className={fieldClasses}
        />
        <p className="text-sm text-foreground/75">The one you used when you paid.</p>
      </div>

      {state.error ? (
        <p role="alert" className="rounded-xl bg-sale/10 p-3 text-sm font-semibold text-sale">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className={buttonClasses("primary", "lg", "w-full sm:w-auto")}
      >
        {pending ? (
          <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
        ) : (
          <Search aria-hidden="true" className="h-4 w-4" />
        )}
        Find my order
      </button>
    </form>
  );
};
