import type { SeedCatalog, SeedCollection, SeedProduct } from "../seed-types";

// Demo catalog for the pilot store. Every name, brand, price and description is a placeholder so
// the layouts, filters and checkout can be built and tested; none of it is real stock. The owner
// chooses the real pilot products at the start of Phase 3. All products carry the `demo` tag so the
// seed script can find and replace them without touching anything else.

const collections: SeedCollection[] = [
  {
    slug: "dog-beds",
    title: "Beds & Blankets",
    department: "dogs",
    sortOrder: 1,
    description: "Comfy places to curl up, from orthopaedic beds to travel blankets.",
  },
  {
    slug: "dog-toys",
    title: "Toys & Play",
    department: "dogs",
    sortOrder: 2,
    description: "Tugs, squeakers and puzzles for fetch, chew and brain games.",
  },
  {
    slug: "dog-walking",
    title: "Walks & Travel",
    department: "dogs",
    sortOrder: 3,
    description: "Harnesses, leads and gear that make every outing easier.",
  },
  {
    slug: "dog-feeding",
    title: "Bowls & Feeding",
    department: "dogs",
    sortOrder: 4,
    description: "Bowls and feeders for mealtimes, at home and on the go.",
  },
  {
    slug: "dog-treats",
    title: "Treats & Chews",
    department: "dogs",
    sortOrder: 5,
    description: "Training treats and long-lasting chews.",
  },
  {
    slug: "dog-grooming",
    title: "Grooming & Care",
    department: "dogs",
    sortOrder: 6,
    description: "Brushes and bath-time essentials.",
  },
  {
    slug: "cat-beds",
    title: "Beds & Hideaways",
    department: "cats",
    sortOrder: 1,
    description: "Snug spots and sunny perches for serious napping.",
  },
  {
    slug: "cat-toys",
    title: "Toys & Play",
    department: "cats",
    sortOrder: 2,
    description: "Wands, tunnels and kickers that bring out the hunter.",
  },
  {
    slug: "cat-scratchers",
    title: "Scratchers & Trees",
    department: "cats",
    sortOrder: 3,
    description: "Posts, lounges and towers that save your sofa.",
  },
  {
    slug: "cat-feeding",
    title: "Bowls & Fountains",
    department: "cats",
    sortOrder: 4,
    description: "Bowls and fountains to keep mealtimes fresh.",
  },
  {
    slug: "cat-treats",
    title: "Treats",
    department: "cats",
    sortOrder: 5,
    description: "Little rewards for good (and bad) behaviour.",
  },
  {
    slug: "cat-litter",
    title: "Litter & Hygiene",
    department: "cats",
    sortOrder: 6,
    description: "Trays, scoops and everything for a tidy home.",
  },
];

const products: SeedProduct[] = [
  // ---- Dog beds ----
  {
    slug: "cloud-comfort-orthopaedic-dog-bed",
    title: "Cloud Comfort Orthopaedic Dog Bed",
    brand: "Hearth & Paw",
    department: "dogs",
    collections: ["dog-beds"],
    summary: "A supportive memory-foam style bed with a removable, washable cover.",
    description: [
      "A generously padded bed with a raised rim to rest a chin on and a non-slip base that stays put on hard floors.",
      "The cover unzips for washing. Choose the size that lets your dog stretch out fully.",
    ],
    tags: ["demo", "bed", "orthopaedic", "washable"],
    featured: true,
    imageCount: 3,
    variants: [
      {
        sku: "PP-CCB-S-OAT",
        title: "Small, Oat",
        priceMinor: 3499,
        options: { Size: "Small", Colour: "Oat" },
      },
      {
        sku: "PP-CCB-M-OAT",
        title: "Medium, Oat",
        priceMinor: 4499,
        options: { Size: "Medium", Colour: "Oat" },
      },
      {
        sku: "PP-CCB-L-OAT",
        title: "Large, Oat",
        priceMinor: 5499,
        compareAtMinor: 6999,
        options: { Size: "Large", Colour: "Oat" },
      },
      {
        sku: "PP-CCB-S-SLATE",
        title: "Small, Slate",
        priceMinor: 3499,
        options: { Size: "Small", Colour: "Slate" },
      },
      {
        sku: "PP-CCB-M-SLATE",
        title: "Medium, Slate",
        priceMinor: 4499,
        options: { Size: "Medium", Colour: "Slate" },
      },
      {
        sku: "PP-CCB-L-SLATE",
        title: "Large, Slate",
        priceMinor: 5499,
        compareAtMinor: 6999,
        options: { Size: "Large", Colour: "Slate" },
        isAvailable: false,
      },
    ],
  },
  {
    slug: "cosy-donut-calming-dog-bed",
    title: "Cosy Donut Calming Dog Bed",
    brand: "Hearth & Paw",
    department: "dogs",
    collections: ["dog-beds"],
    summary: "A soft, round bed with a high bolster for dogs who like to curl up.",
    description: [
      "A plush donut-shaped bed with a deep centre and a bolstered edge, made for curling up.",
      "Fits neatly in a corner or beside the sofa.",
    ],
    tags: ["demo", "bed", "calming", "plush"],
    imageCount: 2,
    variants: [
      { sku: "PP-CDB-S", title: "Small", priceMinor: 2499, options: { Size: "Small" } },
      { sku: "PP-CDB-M", title: "Medium", priceMinor: 3199, options: { Size: "Medium" } },
      { sku: "PP-CDB-L", title: "Large", priceMinor: 3999, options: { Size: "Large" } },
    ],
  },
  {
    slug: "waterproof-travel-blanket",
    title: "Waterproof Travel Blanket",
    brand: "Wagwell",
    department: "dogs",
    collections: ["dog-beds", "dog-walking"],
    summary: "A quilted, wipe-clean blanket for car seats, boots and muddy days.",
    description: [
      "A quilted blanket with a waterproof backing, so it protects seats and sofas from mud and damp.",
      "Folds flat to keep in the boot.",
    ],
    tags: ["demo", "blanket", "travel", "waterproof"],
    imageCount: 2,
    variants: [{ sku: "PP-WTB", title: "One size", priceMinor: 1699, options: {} }],
  },

  // ---- Dog toys ----
  {
    slug: "tough-rope-tug-toy",
    title: "Tough Rope Tug Toy",
    brand: "Fetchworks",
    department: "dogs",
    collections: ["dog-toys"],
    summary: "Knotted cotton rope for tug games and gentle chewing.",
    description: [
      "A chunky knotted rope with two grip handles, made for tug games with you or a friend.",
      "Supervise play and replace the toy when it starts to fray.",
    ],
    tags: ["demo", "toy", "tug", "rope"],
    featured: true,
    imageCount: 2,
    variants: [
      { sku: "PP-TRT-S", title: "Small", priceMinor: 799, options: { Size: "Small" } },
      { sku: "PP-TRT-L", title: "Large", priceMinor: 1199, options: { Size: "Large" } },
    ],
  },
  {
    slug: "squeaky-plush-hedgehog",
    title: "Squeaky Plush Hedgehog",
    brand: "Fetchworks",
    department: "dogs",
    collections: ["dog-toys"],
    summary: "A soft squeaky friend for fetch and cuddles.",
    description: [
      "A soft plush hedgehog with a squeaker inside and a textured back for extra interest.",
    ],
    tags: ["demo", "toy", "plush", "squeaky"],
    imageCount: 2,
    variants: [{ sku: "PP-SPH", title: "One size", priceMinor: 699, options: {} }],
  },
  {
    slug: "treat-dispensing-puzzle-ball",
    title: "Treat-Dispensing Puzzle Ball",
    brand: "Fetchworks",
    department: "dogs",
    collections: ["dog-toys", "dog-feeding"],
    summary: "Fill it with kibble or treats and let them work it out.",
    description: [
      "A rolling ball with an adjustable opening that releases kibble or treats as your dog pushes it around.",
      "A good way to slow down mealtimes and keep busy minds occupied.",
    ],
    tags: ["demo", "toy", "puzzle", "enrichment"],
    featured: true,
    imageCount: 3,
    variants: [
      { sku: "PP-TDB-M", title: "Medium", priceMinor: 1199, options: { Size: "Medium" } },
      {
        sku: "PP-TDB-L",
        title: "Large",
        priceMinor: 1499,
        compareAtMinor: 1799,
        options: { Size: "Large" },
      },
    ],
  },

  // ---- Dog walking ----
  {
    slug: "padded-everyday-harness",
    title: "Padded Everyday Harness",
    brand: "Wagwell",
    department: "dogs",
    collections: ["dog-walking"],
    summary: "A breathable, adjustable harness with a padded chest plate.",
    description: [
      "An adjustable harness with a padded chest plate and reflective trim, with a front and back lead clip.",
      "Measure your dog's chest and check the size guide before ordering.",
    ],
    tags: ["demo", "harness", "walking", "reflective"],
    featured: true,
    imageCount: 3,
    variants: [
      {
        sku: "PP-PEH-XS",
        title: "Extra small",
        priceMinor: 1799,
        options: { Size: "Extra small" },
      },
      { sku: "PP-PEH-S", title: "Small", priceMinor: 1999, options: { Size: "Small" } },
      { sku: "PP-PEH-M", title: "Medium", priceMinor: 2199, options: { Size: "Medium" } },
      { sku: "PP-PEH-L", title: "Large", priceMinor: 2299, options: { Size: "Large" } },
    ],
  },
  {
    slug: "reflective-dog-lead",
    title: "Reflective Dog Lead 1.5m",
    brand: "Wagwell",
    department: "dogs",
    collections: ["dog-walking"],
    summary: "A comfortable-grip lead with reflective stitching for dusk walks.",
    description: [
      "A 1.5 metre lead with a padded handle, a secure clip and reflective threads for low light.",
    ],
    tags: ["demo", "lead", "walking", "reflective"],
    imageCount: 2,
    variants: [
      { sku: "PP-RDL", title: "1.5m", priceMinor: 999, compareAtMinor: 1299, options: {} },
    ],
  },
  {
    slug: "collapsible-travel-water-bowl",
    title: "Collapsible Travel Water Bowl",
    brand: "Wagwell",
    department: "dogs",
    collections: ["dog-feeding", "dog-walking"],
    summary: "A pocket-sized silicone bowl that clips to your bag.",
    description: ["A flexible silicone bowl that folds flat and clips onto a bag or belt loop."],
    tags: ["demo", "bowl", "travel", "water"],
    imageCount: 2,
    variants: [{ sku: "PP-CTW", title: "One size", priceMinor: 599, options: {} }],
  },

  // ---- Dog feeding ----
  {
    slug: "slow-feed-bowl",
    title: "Slow Feed Bowl",
    brand: "Cosy Tails",
    department: "dogs",
    collections: ["dog-feeding"],
    summary: "Raised ridges slow down fast eaters.",
    description: [
      "A non-slip bowl with a maze of raised ridges that makes dogs work a little harder for each mouthful.",
    ],
    tags: ["demo", "bowl", "slow feeder"],
    imageCount: 2,
    variants: [
      { sku: "PP-SFB-S", title: "Small", priceMinor: 1099, options: { Size: "Small" } },
      { sku: "PP-SFB-L", title: "Large", priceMinor: 1499, options: { Size: "Large" } },
    ],
  },
  {
    slug: "raised-stainless-feeder",
    title: "Raised Stainless Feeder",
    brand: "Cosy Tails",
    department: "dogs",
    collections: ["dog-feeding"],
    summary: "Two stainless bowls on a sturdy raised stand.",
    description: [
      "A stand holding two removable stainless steel bowls at a comfortable height, with non-slip feet.",
    ],
    tags: ["demo", "bowl", "raised", "stainless"],
    imageCount: 2,
    variants: [
      { sku: "PP-RSF-S", title: "Small", priceMinor: 2299, options: { Size: "Small" } },
      { sku: "PP-RSF-L", title: "Large", priceMinor: 2999, options: { Size: "Large" } },
    ],
  },

  // ---- Dog treats ----
  {
    slug: "chicken-training-treats",
    title: "Chicken Training Treats 200g",
    brand: "Tailwind Treats",
    department: "dogs",
    collections: ["dog-treats"],
    summary: "Small, soft treats sized for training.",
    description: [
      "Pea-sized soft treats that are easy to carry and quick to eat, so training stays moving.",
    ],
    tags: ["demo", "treats", "training"],
    featured: true,
    imageCount: 2,
    variants: [{ sku: "PP-CTT-200", title: "200g", priceMinor: 499, options: { Weight: "200g" } }],
  },
  {
    slug: "dental-chew-sticks",
    title: "Dental Chew Sticks, 28 pack",
    brand: "Tailwind Treats",
    department: "dogs",
    collections: ["dog-treats", "dog-grooming"],
    summary: "A daily chew with a ridged texture.",
    description: [
      "A pack of 28 ridged chew sticks, one a day as a treat. Always provide fresh water.",
    ],
    tags: ["demo", "treats", "chew", "dental"],
    imageCount: 2,
    variants: [{ sku: "PP-DCS-28", title: "28 pack", priceMinor: 999, options: { Pack: "28" } }],
  },
  {
    slug: "sweet-potato-chews",
    title: "Sweet Potato Chews 250g",
    brand: "Tailwind Treats",
    department: "dogs",
    collections: ["dog-treats"],
    summary: "Slow-baked slices for a long, chewy treat.",
    description: [
      "Slices of sweet potato, baked slowly until chewy. Ideal as an occasional treat.",
    ],
    tags: ["demo", "treats", "chew", "grain free"],
    imageCount: 2,
    variants: [{ sku: "PP-SPC-250", title: "250g", priceMinor: 599, options: { Weight: "250g" } }],
  },

  // ---- Dog grooming ----
  {
    slug: "soft-slicker-brush",
    title: "Soft Slicker Brush",
    brand: "Hearth & Paw",
    department: "dogs",
    collections: ["dog-grooming"],
    summary: "Fine bristles that lift loose fur and tangles.",
    description: [
      "A slicker brush with fine, flexible bristles and a cushioned head, with a button to release collected fur.",
    ],
    tags: ["demo", "brush", "grooming"],
    imageCount: 2,
    variants: [{ sku: "PP-SSB", title: "One size", priceMinor: 899, options: {} }],
  },
  {
    slug: "gentle-oatmeal-dog-shampoo",
    title: "Gentle Oatmeal Dog Shampoo 300ml",
    brand: "Hearth & Paw",
    department: "dogs",
    collections: ["dog-grooming"],
    summary: "A mild, lightly scented shampoo for bath time.",
    description: [
      "A mild shampoo that lathers easily and rinses clean. Use a dog-specific shampoo only.",
    ],
    tags: ["demo", "shampoo", "bath"],
    imageCount: 2,
    variants: [
      { sku: "PP-GOS-300", title: "300ml", priceMinor: 749, options: { Volume: "300ml" } },
    ],
  },

  // ---- Cat beds ----
  {
    slug: "plush-round-cat-bed",
    title: "Plush Round Cat Bed",
    brand: "Cosy Tails",
    department: "cats",
    collections: ["cat-beds"],
    summary: "A deep, soft bed with a raised edge to lean on.",
    description: [
      "A soft round bed with a raised rim and a non-slip base, sized for cats who like to curl up tight.",
    ],
    tags: ["demo", "bed", "plush"],
    featured: true,
    imageCount: 3,
    variants: [
      { sku: "PP-PRC-S", title: "Small", priceMinor: 1999, options: { Size: "Small" } },
      { sku: "PP-PRC-L", title: "Large", priceMinor: 2799, options: { Size: "Large" } },
    ],
  },
  {
    slug: "window-perch-hammock",
    title: "Window Perch Hammock",
    brand: "Purrfect Co",
    department: "cats",
    collections: ["cat-beds"],
    summary: "A sunny seat with a view, held on by suction cups.",
    description: [
      "A hammock-style perch that attaches to a window with strong suction cups. Check the weight limit for your cat.",
    ],
    tags: ["demo", "perch", "window", "hammock"],
    imageCount: 2,
    variants: [
      { sku: "PP-WPH", title: "One size", priceMinor: 2199, compareAtMinor: 2799, options: {} },
    ],
  },
  {
    slug: "cave-hideaway-bed",
    title: "Cave Hideaway Bed",
    brand: "Purrfect Co",
    department: "cats",
    collections: ["cat-beds"],
    summary: "A felt cave for shy cats and serious nappers.",
    description: [
      "A soft felt cave with a removable cushion, giving shy cats a private spot to retreat to.",
    ],
    tags: ["demo", "bed", "cave", "hideaway"],
    imageCount: 2,
    variants: [
      { sku: "PP-CHB-GREY", title: "Grey", priceMinor: 2499, options: { Colour: "Grey" } },
      { sku: "PP-CHB-SAND", title: "Sand", priceMinor: 2499, options: { Colour: "Sand" } },
    ],
  },

  // ---- Cat toys ----
  {
    slug: "feather-wand-teaser",
    title: "Feather Wand Teaser",
    brand: "Purrfect Co",
    department: "cats",
    collections: ["cat-toys"],
    summary: "A flexible wand with feathers and a bell.",
    description: [
      "A flexible wand with a feather and bell attachment that is easy to swish, swoop and dangle.",
    ],
    tags: ["demo", "toy", "wand", "feather"],
    featured: true,
    imageCount: 2,
    variants: [{ sku: "PP-FWT", title: "One size", priceMinor: 599, options: {} }],
  },
  {
    slug: "crinkle-play-tunnel",
    title: "Crinkle Play Tunnel",
    brand: "Purrfect Co",
    department: "cats",
    collections: ["cat-toys"],
    summary: "A foldable tunnel with a crinkly lining and a peek-a-boo window.",
    description: [
      "A collapsible tunnel with a crinkly lining, a dangling toy and a peek-a-boo hole. Folds flat to store.",
    ],
    tags: ["demo", "toy", "tunnel", "crinkle"],
    imageCount: 2,
    variants: [{ sku: "PP-CPT", title: "One size", priceMinor: 1299, options: {} }],
  },
  {
    slug: "catnip-kicker-fish-2-pack",
    title: "Catnip Kicker Fish, 2 pack",
    brand: "Purrfect Co",
    department: "cats",
    collections: ["cat-toys"],
    summary: "Two kicker toys to grab, bunny-kick and carry.",
    description: [
      "Two fish-shaped kicker toys filled with catnip, sized for grabbing and bunny-kicking.",
    ],
    tags: ["demo", "toy", "catnip", "kicker"],
    imageCount: 2,
    variants: [{ sku: "PP-CKF-2", title: "2 pack", priceMinor: 699, options: { Pack: "2" } }],
  },

  // ---- Cat scratchers ----
  {
    slug: "tall-sisal-scratching-post",
    title: "Tall Sisal Scratching Post",
    brand: "Purrfect Co",
    department: "cats",
    collections: ["cat-scratchers"],
    summary: "A sturdy sisal post tall enough for a full stretch.",
    description: [
      "A weighted base and a sisal-wrapped post, tall enough for a cat to stretch right up.",
    ],
    tags: ["demo", "scratcher", "sisal", "post"],
    featured: true,
    imageCount: 2,
    variants: [{ sku: "PP-TSP", title: "One size", priceMinor: 2999, options: {} }],
  },
  {
    slug: "cardboard-lounge-scratcher",
    title: "Cardboard Lounge Scratcher",
    brand: "Cosy Tails",
    department: "cats",
    collections: ["cat-scratchers", "cat-beds"],
    summary: "A curved lounge that is half scratcher, half bed.",
    description: [
      "A curved scratcher made of layered cardboard, which doubles as a lounge. Includes a sachet of catnip.",
    ],
    tags: ["demo", "scratcher", "lounge", "cardboard"],
    imageCount: 2,
    variants: [{ sku: "PP-CLS", title: "One size", priceMinor: 1499, options: {} }],
  },
  {
    slug: "multi-level-cat-tree",
    title: "Multi-Level Cat Tree",
    brand: "Purrfect Co",
    department: "cats",
    collections: ["cat-scratchers", "cat-beds"],
    summary: "Perches, a cosy cabin and sisal posts on one stable tower.",
    description: [
      "A tower with a top perch, a cabin to hide in, a hammock and sisal-wrapped posts to scratch.",
      "Assembly is required. Place it against a wall for extra stability.",
    ],
    tags: ["demo", "cat tree", "tower", "scratcher"],
    featured: true,
    imageCount: 3,
    variants: [
      {
        sku: "PP-MLC-120",
        title: "120cm",
        priceMinor: 8999,
        compareAtMinor: 10999,
        options: { Height: "120cm" },
      },
    ],
  },

  // ---- Cat feeding ----
  {
    slug: "ceramic-raised-cat-bowl",
    title: "Ceramic Raised Cat Bowl",
    brand: "Cosy Tails",
    department: "cats",
    collections: ["cat-feeding"],
    summary: "A shallow ceramic bowl on a gently angled stand.",
    description: ["A shallow bowl on a low, angled stand. Dishwasher safe."],
    tags: ["demo", "bowl", "ceramic", "raised"],
    imageCount: 2,
    variants: [{ sku: "PP-CRB", title: "One size", priceMinor: 1099, options: {} }],
  },
  {
    slug: "flowing-water-fountain-2l",
    title: "Flowing Water Fountain 2L",
    brand: "Purrfect Co",
    department: "cats",
    collections: ["cat-feeding"],
    summary: "Fresh, moving water in a quiet 2 litre fountain.",
    description: [
      "A quiet 2 litre fountain with a replaceable filter. Clean it weekly and refill with fresh water.",
    ],
    tags: ["demo", "fountain", "water"],
    imageCount: 2,
    variants: [
      { sku: "PP-FWF-2L", title: "2 litre", priceMinor: 2799, options: { Capacity: "2L" } },
    ],
  },

  // ---- Cat treats ----
  {
    slug: "crunchy-salmon-cat-treats",
    title: "Crunchy Salmon Cat Treats 60g",
    brand: "Tailwind Treats",
    department: "cats",
    collections: ["cat-treats"],
    summary: "Crunchy bites to reward good behaviour.",
    description: ["Small crunchy treats in a resealable pouch, for training and rewards."],
    tags: ["demo", "treats", "crunchy"],
    imageCount: 2,
    variants: [{ sku: "PP-CSC-60", title: "60g", priceMinor: 299, options: { Weight: "60g" } }],
  },
  {
    slug: "creamy-lickable-treats-12-pack",
    title: "Creamy Lickable Treats, 12 pack",
    brand: "Tailwind Treats",
    department: "cats",
    collections: ["cat-treats"],
    summary: "Squeeze-and-lick treats in single-serve tubes.",
    description: [
      "Twelve single-serve tubes of a smooth lickable treat, easy to share and handy for travel.",
    ],
    tags: ["demo", "treats", "lickable"],
    featured: true,
    imageCount: 2,
    variants: [{ sku: "PP-CLT-12", title: "12 pack", priceMinor: 499, options: { Pack: "12" } }],
  },

  // ---- Cat litter ----
  {
    slug: "hooded-litter-tray",
    title: "Hooded Litter Tray",
    brand: "Cosy Tails",
    department: "cats",
    collections: ["cat-litter"],
    summary: "A covered tray with a swing door and carry handle.",
    description: [
      "A covered tray with a swing door and a carry handle on top. The hood lifts off for cleaning.",
    ],
    tags: ["demo", "litter", "tray", "hooded"],
    imageCount: 2,
    variants: [{ sku: "PP-HLT", title: "One size", priceMinor: 2499, options: {} }],
  },
  {
    slug: "litter-scoop-and-mat-set",
    title: "Litter Scoop & Mat Set",
    brand: "Cosy Tails",
    department: "cats",
    collections: ["cat-litter"],
    summary: "A sturdy scoop with a catching mat to keep floors clean.",
    description: [
      "A sturdy slotted scoop plus a textured mat that traps stray litter before it spreads.",
    ],
    tags: ["demo", "litter", "scoop", "mat"],
    imageCount: 2,
    variants: [{ sku: "PP-LSM", title: "Set", priceMinor: 699, options: {} }],
  },
];

const catalog: SeedCatalog = { collections, products };

export default catalog;
