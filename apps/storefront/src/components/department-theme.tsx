import type { StoreConfig } from "@dropship/config";
import type { CSSProperties, ElementType, ReactNode } from "react";
import { departmentToCssVariables } from "@/lib/theme";

type Department = StoreConfig["departments"][number];

type DepartmentThemeProps = {
  department: Department | undefined;
  as?: ElementType;
  className?: string;
  children: ReactNode;
};

// Wraps a section in a department's colours (amber for dogs, teal for cats). Everything inside
// that uses bg-primary, text-emphasis and friends picks them up with no further wiring. With no
// department it adds nothing, so the store's neutral theme applies.
export const DepartmentTheme = ({
  department,
  as: Tag = "div",
  className,
  children,
}: DepartmentThemeProps) => {
  if (!department) {
    return <Tag className={className}>{children}</Tag>;
  }
  return (
    <Tag
      data-department={department.slug}
      style={departmentToCssVariables(department) as CSSProperties}
      className={className}
    >
      {children}
    </Tag>
  );
};
