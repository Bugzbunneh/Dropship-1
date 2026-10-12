import type { Metadata } from "next";
import { DepartmentListingPage } from "@/components/listing/department-listing-page";
import { getStoreConfig } from "@/lib/store";
import { findDepartment } from "@/lib/theme";

type PageProps = {
  params: Promise<{ department: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const generateStaticParams = async () => {
  const config = await getStoreConfig();
  return config.departments.map((department) => ({ department: department.slug }));
};

export const generateMetadata = async ({
  params,
}: Pick<PageProps, "params">): Promise<Metadata> => {
  const { department: slug } = await params;
  const config = await getStoreConfig();
  const department = findDepartment(config.departments, slug);
  if (!department) {
    return {};
  }
  return {
    title: `Everything for ${department.name.toLowerCase()}`,
    description: `Everything for ${department.name.toLowerCase()} in one place, delivered within ${config.policies.deliveryMaxWorkingDays} working days.`,
    alternates: { canonical: `/${slug}/all` },
  };
};

const AllProductsPage = async ({ params, searchParams }: PageProps) => {
  const { department } = await params;
  return <DepartmentListingPage departmentSlug={department} searchParams={searchParams} />;
};

export default AllProductsPage;
