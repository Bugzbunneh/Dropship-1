// Friendly line-and-shape portraits of a dog and a cat, drawn in the current department's colours
// (they read the CSS variables, so the dog is amber and the cat is teal wherever they appear).
// Decorative, so hidden from screen readers.

type MarkProps = {
  className?: string | undefined;
};

export const DogMark = ({ className }: MarkProps) => (
  <svg viewBox="0 0 240 240" className={className} aria-hidden="true" focusable="false">
    <ellipse
      cx="62"
      cy="108"
      rx="34"
      ry="62"
      transform="rotate(14 62 108)"
      fill="var(--color-emphasis)"
    />
    <ellipse
      cx="178"
      cy="108"
      rx="34"
      ry="62"
      transform="rotate(-14 178 108)"
      fill="var(--color-emphasis)"
    />
    <ellipse cx="120" cy="134" rx="74" ry="82" fill="var(--color-primary)" />
    <ellipse cx="120" cy="164" rx="44" ry="34" fill="var(--color-background)" opacity="0.92" />
    <circle cx="94" cy="118" r="9" fill="var(--color-foreground)" />
    <circle cx="146" cy="118" r="9" fill="var(--color-foreground)" />
    <circle cx="97" cy="115" r="3" fill="var(--color-background)" />
    <circle cx="149" cy="115" r="3" fill="var(--color-background)" />
    <ellipse cx="120" cy="150" rx="15" ry="11" fill="var(--color-foreground)" />
    <path
      d="M120 161 V174 M104 178 Q120 190 136 178"
      fill="none"
      stroke="var(--color-foreground)"
      strokeWidth="5"
      strokeLinecap="round"
    />
    <path d="M110 188 Q120 214 130 188 Z" fill="var(--color-sale)" />
  </svg>
);

export const CatMark = ({ className }: MarkProps) => (
  <svg viewBox="0 0 240 240" className={className} aria-hidden="true" focusable="false">
    <path d="M46 96 L52 28 L110 66 Z" fill="var(--color-emphasis)" />
    <path d="M194 96 L188 28 L130 66 Z" fill="var(--color-emphasis)" />
    <path d="M62 82 L64 50 L90 68 Z" fill="var(--color-background)" opacity="0.7" />
    <path d="M178 82 L176 50 L150 68 Z" fill="var(--color-background)" opacity="0.7" />
    <ellipse cx="120" cy="136" rx="80" ry="74" fill="var(--color-primary)" />
    <ellipse cx="92" cy="122" rx="12" ry="15" fill="var(--color-background)" />
    <ellipse cx="148" cy="122" rx="12" ry="15" fill="var(--color-background)" />
    <ellipse cx="94" cy="124" rx="5" ry="11" fill="var(--color-foreground)" />
    <ellipse cx="146" cy="124" rx="5" ry="11" fill="var(--color-foreground)" />
    <path d="M110 150 L130 150 L120 162 Z" fill="var(--color-sale)" />
    <path
      d="M120 162 V172 M104 178 Q114 186 120 172 Q126 186 136 178"
      fill="none"
      stroke="var(--color-foreground)"
      strokeWidth="4.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <g stroke="var(--color-foreground)" strokeWidth="3.5" strokeLinecap="round" opacity="0.75">
      <path d="M56 146 L16 138" />
      <path d="M58 160 L18 166" />
      <path d="M184 146 L224 138" />
      <path d="M182 160 L222 166" />
    </g>
  </svg>
);

export const PawMark = ({ className }: MarkProps) => (
  <svg
    viewBox="0 0 64 64"
    className={className}
    aria-hidden="true"
    focusable="false"
    fill="currentColor"
  >
    <ellipse cx="32" cy="42" rx="14" ry="11" />
    <ellipse cx="13" cy="30" rx="6" ry="8" transform="rotate(-20 13 30)" />
    <ellipse cx="25" cy="17" rx="6" ry="8.5" transform="rotate(-8 25 17)" />
    <ellipse cx="39" cy="17" rx="6" ry="8.5" transform="rotate(8 39 17)" />
    <ellipse cx="51" cy="30" rx="6" ry="8" transform="rotate(20 51 30)" />
  </svg>
);

export const DepartmentMark = ({
  slug,
  className,
}: {
  slug: string;
  className?: string | undefined;
}) => {
  if (slug === "cats") {
    return <CatMark className={className} />;
  }
  if (slug === "dogs") {
    return <DogMark className={className} />;
  }
  return <PawMark className={className} />;
};
