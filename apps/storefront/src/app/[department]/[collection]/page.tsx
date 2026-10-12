import type { Metadata } from "next";
import { DepartmentListingPage } from "@/components/listing/department-listing-page";
import { getSnapshot } from "@/lib/catalog";
import { collectionsOf, findCollection } from "@/lib/catalog/queries";
import { getStoreConfig } from "@/lib/store";
import { findDepartment } from "@/lib/theme";

type PageProps = {
  params: Promise<{ department: string; collection: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

// Known collections are built ahead of time. If the catalog can't be read at build time (for
// example a preview build without database access) none are, and each is built on first visit.
export const generateStaticParams = async () => {
  try {
    const [config, snapshot] = await Promise.all([getStoreConfig(), getSnapshot()]);
    return config.departments.flatMap((department) =>
      collectionsOf(snapshot, department.slug).map((collection) => ({
        department: department.slug,
        collection: collection.slug,
      })),
    );
  } catch {
    return [];
  }
};

export const generateMetadata = async ({
  params,
}: Pick<PageProps, "params">): Promise<Metadata> => {
  const { department: departmentSlug, collection: collectionSlug } = await params;
  const config = await getStoreConfig();
  const department = findDepartment(config.departments, departmentSlug);
  const collection = findCollection(await getSnapshot(), departmentSlug, collectionSlug);
  if (!department || !collection) {
    return {};
  }

  return {
    title: `${collection.title} for ${department.name}`,
    description:
      `${collection.description ?? ""} Shop ${collection.title.toLowerCase()} for ${department.name.toLowerCase()}, delivered within ${config.policies.deliveryMaxWorkingDays} working days.`.trim(),
    alternates: { canonical: `/${departmentSlug}/${collectionSlug}` },
  };
};

const CollectionPage = async ({ params, searchParams }: PageProps) => {
  const { department, collection } = await params;
  return (
    <DepartmentListingPage
      departmentSlug={department}
      collectionSlug={collection}
      searchParams={searchParams}
    />
  );
};

export default CollectionPage;
