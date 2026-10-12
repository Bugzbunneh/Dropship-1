// Order numbers are what a customer quotes in an email or looks up. They are random rather than
// sequential, so one cannot be guessed from another and a competitor cannot count our orders.
// The alphabet leaves out look-alikes (0 O 1 I L), so they survive being read over the phone.

const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const GROUP_LENGTH = 4;
const GROUPS = 2;

export type RandomBytes = (length: number) => Uint8Array;

// "pet-pilot" becomes "PP", "shop" becomes "SH". Two or three letters.
export const orderPrefixForSlug = (slug: string): string => {
  const words = slug.split("-").filter((word) => word.length > 0);
  const initials = words.map((word) => word.charAt(0)).join("");
  const letters = initials.length >= 2 ? initials.slice(0, 3) : slug.replace(/-/g, "").slice(0, 2);
  return letters.toUpperCase();
};

const randomCharacters = (count: number, randomBytes: RandomBytes): string => {
  // 248 is the largest multiple of the alphabet size that fits in a byte; bytes above it are
  // skipped, so every character is equally likely.
  const limit = 256 - (256 % ALPHABET.length);
  let result = "";
  while (result.length < count) {
    for (const byte of randomBytes(count * 2)) {
      if (byte < limit && result.length < count) {
        result += ALPHABET.charAt(byte % ALPHABET.length);
      }
    }
  }
  return result;
};

export const generateOrderNumber = (prefix: string, randomBytes: RandomBytes): string => {
  const groups: string[] = [];
  for (let index = 0; index < GROUPS; index += 1) {
    groups.push(randomCharacters(GROUP_LENGTH, randomBytes));
  }
  return `${prefix}-${groups.join("-")}`;
};

const NUMBER_PATTERN = new RegExp(
  `^([A-Z]{2,3})([${ALPHABET}]{${GROUP_LENGTH}})([${ALPHABET}]{${GROUP_LENGTH}})$`,
);

// Accepts what people actually type: any case, with or without hyphens or spaces.
// Returns undefined when the input could not be an order number.
export const normaliseOrderNumber = (input: string): string | undefined => {
  const compact = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const match = NUMBER_PATTERN.exec(compact);
  if (!match) {
    return undefined;
  }
  return `${match[1]}-${match[2]}-${match[3]}`;
};
