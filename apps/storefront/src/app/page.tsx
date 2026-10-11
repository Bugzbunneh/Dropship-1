import { getStoreConfig } from "@/lib/store";

const HomePage = async () => {
  const store = await getStoreConfig();

  return (
    <section className="rounded-store bg-muted px-6 py-12 text-center">
      <h1 className="font-heading text-3xl font-semibold sm:text-4xl">{store.name}</h1>
      {store.tagline ? <p className="mt-3 text-lg opacity-80">{store.tagline}</p> : null}
    </section>
  );
};

export default HomePage;
