export interface MoodItem {
  id: string;
  label: string;
  subtitle: string;
  image: string;
  targetSection: string;
}

export interface LookPiece {
  id: string;
  role: "Saree" | "Blouse" | "Choker" | "Jhumkas" | "Ottiyanam" | "Bangles";
  name: string;
  price: number;
  image: string;
}

export interface StyledLook {
  id: string;
  title: string;
  weaveNote: string;
  modelImage: string;
  pieces: LookPiece[];
}

export interface SilkCardItem {
  id: string;
  title: string;
  subtitle: string;
  price: number;
  bgHex: string;
  textHex: string;
  image: string;
  category: string;
}

export type RackCategory =
  | "All pieces"
  | "Silk Sarees"
  | "Half Sarees"
  | "Blouses"
  | "Checked Sarees"
  | "Zari & Brocade";

export interface RackProduct {
  id: string;
  name: string;
  category: Exclude<RackCategory, "All pieces">;
  price: number;
  fabric: string;
  frontImage: string;
  backImage: string;
  swatchHex: string;
  sizes: string[];
  inStockAt: string[];
}

export interface MuseReel {
  id: string;
  number: string;
  duration: string;
  fabricType: string;
  title: string;
  location: string;
  poster: string;
  linkedProductId: string;
  linkedProductName: string;
  linkedProductPrice: number;
}

export interface BridalSaree {
  id: string;
  name: string;
  fabricNote: string;
  palluNote: string;
  price: number;
  originalPrice?: number;
  tag?: string;
  image: string;
}

export const MOODS: MoodItem[] = [
  {
    id: "wedding-edit",
    label: "WEDDING EDIT",
    subtitle: "Muhurtham Pure Zari",
    image: "/images/mood-wedding.jpg",
    targetSection: "#bridal",
  },
  {
    id: "kanchipuram-icons",
    label: "KANCHIPURAM ICONS",
    subtitle: "Three-Shuttle Korvai",
    image: "/images/mood-kanchi.jpg",
    targetSection: "#pick-a-silk",
  },
  {
    id: "banarasi-heirlooms",
    label: "BANARASI HEIRLOOMS",
    subtitle: "Kadhwa Floral Brocade",
    image: "/images/mood-banarasi.jpg",
    targetSection: "#the-rack",
  },
  {
    id: "temple-zari",
    label: "TEMPLE ZARI",
    subtitle: "Gopuram Border Weaves",
    image: "/images/look-emerald.jpg",
    targetSection: "#try-the-look",
  },
  {
    id: "ivory-classics",
    label: "IVORY CLASSICS",
    subtitle: "Kora & Kasavu Gold",
    image: "/images/look-ivory.jpg",
    targetSection: "#try-the-look",
  },
  {
    id: "festive-drapes",
    label: "FESTIVE DRAPES",
    subtitle: "Rani & Coral Silk",
    image: "/images/look-rani.jpg",
    targetSection: "#muse-reels",
  },
];

export const STYLED_LOOKS: StyledLook[] = [
  {
    id: "look-01",
    title: "Emerald Temple",
    weaveNote: "Handloom Kanchipuram · 24K Gold-Dipped Silver Zari",
    modelImage: "/images/look-emerald.jpg",
    pieces: [
      { id: "lk1-saree", role: "Saree", name: "Vana Maragatham Korvai Saree", price: 42500, image: "/images/look-emerald.jpg" },
      { id: "lk1-blouse", role: "Blouse", name: "Zari Embroidered Emerald Blouse", price: 6800, image: "/images/saree-fold-gold.jpg" },
      { id: "lk1-choker", role: "Choker", name: "Nagas Kemp Temple Choker", price: 14500, image: "/images/mood-wedding.jpg" },
      { id: "lk1-jhumkas", role: "Jhumkas", name: "Kundan Pearl Temple Jhumkas", price: 5400, image: "/images/mood-kanchi.jpg" },
      { id: "lk1-ottiyanam", role: "Ottiyanam", name: "Lakshmi Nakshi Waist Belt", price: 12900, image: "/images/look-ivory.jpg" },
      { id: "lk1-bangles", role: "Bangles", name: "Antique Gold Kada Set (Pair)", price: 7200, image: "/images/mood-banarasi.jpg" },
    ],
  },
  {
    id: "look-02",
    title: "Ivory Elephant",
    weaveNote: "Yali & Elephant Butta · Pure Mulberry Silk",
    modelImage: "/images/look-ivory.jpg",
    pieces: [
      { id: "lk2-saree", role: "Saree", name: "Ivory Gajendra Zari Kanchipuram", price: 48000, image: "/images/look-ivory.jpg" },
      { id: "lk2-blouse", role: "Blouse", name: "Raw Silk Zardozi Ivory Blouse", price: 7400, image: "/images/saree-fold-gold.jpg" },
      { id: "lk2-choker", role: "Choker", name: "Guttapusalu Pearl Haar", price: 16200, image: "/images/mood-wedding.jpg" },
      { id: "lk2-jhumkas", role: "Jhumkas", name: "Bell Dome Temple Jhumkas", price: 4800, image: "/images/look-emerald.jpg" },
      { id: "lk2-ottiyanam", role: "Ottiyanam", name: "Heritage Coin Ottiyanam", price: 13500, image: "/images/mood-kanchi.jpg" },
      { id: "lk2-bangles", role: "Bangles", name: "Filigree Gold Bangle Stack", price: 6900, image: "/images/look-rani.jpg" },
    ],
  },
  {
    id: "look-03",
    title: "Rani Durbar",
    weaveNote: "Floral Rose Motifs · Inspired by Krishara Crest",
    modelImage: "/images/look-rani.jpg",
    pieces: [
      { id: "lk3-saree", role: "Saree", name: "Gulab Rani Floral Silk Saree", price: 39500, image: "/images/look-rani.jpg" },
      { id: "lk3-blouse", role: "Blouse", name: "Rani Brocade Maggam Blouse", price: 6500, image: "/images/mood-banarasi.jpg" },
      { id: "lk3-choker", role: "Choker", name: "Ruby Polki Heritage Choker", price: 18400, image: "/images/mood-wedding.jpg" },
      { id: "lk3-jhumkas", role: "Jhumkas", name: "Meenakari Rose Jhumkas", price: 5200, image: "/images/look-rani.jpg" },
      { id: "lk3-ottiyanam", role: "Ottiyanam", name: "Kemp Stone Bridal Belt", price: 14200, image: "/images/mood-kanchi.jpg" },
      { id: "lk3-bangles", role: "Bangles", name: "Emerald & Gold Kangan Set", price: 7800, image: "/images/look-emerald.jpg" },
    ],
  },
  {
    id: "look-04",
    title: "Kanchi Crimson",
    weaveNote: "Classic Rekku Temple Border · 3-Ply Silk",
    modelImage: "/images/mood-kanchi.jpg",
    pieces: [
      { id: "lk4-saree", role: "Saree", name: "Sindoora Korvai Kanchipuram", price: 52000, image: "/images/mood-kanchi.jpg" },
      { id: "lk4-blouse", role: "Blouse", name: "Crimson Gold Tissue Blouse", price: 7100, image: "/images/saree-fold-gold.jpg" },
      { id: "lk4-choker", role: "Choker", name: "Kasu Mala Heritage Necklace", price: 19500, image: "/images/mood-wedding.jpg" },
      { id: "lk4-jhumkas", role: "Jhumkas", name: "Jimikki Mattal Ear Chains", price: 6200, image: "/images/look-ivory.jpg" },
      { id: "lk4-ottiyanam", role: "Ottiyanam", name: "Temple Carving Vanki Belt", price: 15000, image: "/images/look-emerald.jpg" },
      { id: "lk4-bangles", role: "Bangles", name: "Gajra Pearl Gold Bangles", price: 6400, image: "/images/mood-banarasi.jpg" },
    ],
  },
  {
    id: "look-05",
    title: "Muhurtham Emerald",
    weaveNote: "Bridal Heirloom · Heavy Peacock Pallu",
    modelImage: "/images/mood-wedding.jpg",
    pieces: [
      { id: "lk5-saree", role: "Saree", name: "Meenakshi Bridal Emerald Silk", price: 88000, image: "/images/mood-wedding.jpg" },
      { id: "lk5-blouse", role: "Blouse", name: "Hand-Aari Bridal Emerald Blouse", price: 12500, image: "/images/look-emerald.jpg" },
      { id: "lk5-choker", role: "Choker", name: "Pachai Emerald & Gold Choker", price: 24000, image: "/images/mood-wedding.jpg" },
      { id: "lk5-jhumkas", role: "Jhumkas", name: "Bridal Chandbali Jhumkas", price: 7900, image: "/images/look-ivory.jpg" },
      { id: "lk5-ottiyanam", role: "Ottiyanam", name: "22K Gold-Plated Bridal Oddiyanam", price: 18500, image: "/images/mood-kanchi.jpg" },
      { id: "lk5-bangles", role: "Bangles", name: "Bridal Chooda & Gold Kada", price: 9600, image: "/images/look-rani.jpg" },
    ],
  },
  {
    id: "look-06",
    title: "Banarasi Rose",
    weaveNote: "Jangla Floral Brocade · Pure Katan Silk",
    modelImage: "/images/mood-banarasi.jpg",
    pieces: [
      { id: "lk6-saree", role: "Saree", name: "Noorani Pink Katan Brocade", price: 44000, image: "/images/mood-banarasi.jpg" },
      { id: "lk6-blouse", role: "Blouse", name: "Zari Butti Silk Blouse", price: 6200, image: "/images/look-rani.jpg" },
      { id: "lk6-choker", role: "Choker", name: "Jadau Kundan Collar", price: 17800, image: "/images/look-ivory.jpg" },
      { id: "lk6-jhumkas", role: "Jhumkas", name: "Polki Drop Earrings", price: 5600, image: "/images/mood-banarasi.jpg" },
      { id: "lk6-ottiyanam", role: "Ottiyanam", name: "Sleek Zari Waist Chain", price: 9800, image: "/images/saree-fold-gold.jpg" },
      { id: "lk6-bangles", role: "Bangles", name: "Meenakari Kundan Bangles", price: 7100, image: "/images/mood-wedding.jpg" },
    ],
  },
  {
    id: "look-07",
    title: "Golden Tissue",
    weaveNote: "Liquid Gold Zari · Evening Reception Edit",
    modelImage: "/images/saree-fold-gold.jpg",
    pieces: [
      { id: "lk7-saree", role: "Saree", name: "Swarna Emerald Tissue Saree", price: 56000, image: "/images/saree-fold-gold.jpg" },
      { id: "lk7-blouse", role: "Blouse", name: "Metallic Tissue Boatneck Blouse", price: 7800, image: "/images/look-emerald.jpg" },
      { id: "lk7-choker", role: "Choker", name: "Antique Matte Gold Choker", price: 15400, image: "/images/look-ivory.jpg" },
      { id: "lk7-jhumkas", role: "Jhumkas", name: "Temple Bell Studs", price: 4900, image: "/images/mood-wedding.jpg" },
      { id: "lk7-ottiyanam", role: "Ottiyanam", name: "Carved Peacock Belt", price: 13200, image: "/images/mood-kanchi.jpg" },
      { id: "lk7-bangles", role: "Bangles", name: "Hammered Gold Bangles", price: 6800, image: "/images/look-rani.jpg" },
    ],
  },
  {
    id: "look-08",
    title: "Teal Peacock",
    weaveNote: "Mayil Chakram Weave · Deep Forest Border",
    modelImage: "/images/look-emerald.jpg",
    pieces: [
      { id: "lk8-saree", role: "Saree", name: "Mayura Emerald Peacock Silk", price: 46500, image: "/images/look-emerald.jpg" },
      { id: "lk8-blouse", role: "Blouse", name: "Peacock Feather Aari Blouse", price: 8200, image: "/images/saree-fold-gold.jpg" },
      { id: "lk8-choker", role: "Choker", name: "Emerald Bead Temple Choker", price: 16900, image: "/images/mood-wedding.jpg" },
      { id: "lk8-jhumkas", role: "Jhumkas", name: "Mayil Jhumka Drops", price: 5500, image: "/images/look-emerald.jpg" },
      { id: "lk8-ottiyanam", role: "Ottiyanam", name: "Temple Gold Oddiyanam", price: 14100, image: "/images/look-ivory.jpg" },
      { id: "lk8-bangles", role: "Bangles", name: "Green Stone Gold Kadas", price: 7500, image: "/images/mood-banarasi.jpg" },
    ],
  },
];

export const PICK_A_SILK_CARDS: SilkCardItem[] = [
  {
    id: "silk-01",
    title: "PALACE CHECK",
    subtitle: "Emerald & Gold Zari Checks",
    price: 38500,
    bgHex: "#09492E",
    textHex: "#C6A253",
    image: "/images/look-emerald.jpg",
    category: "Checked Sarees",
  },
  {
    id: "silk-02",
    title: "BENGAL GARDEN",
    subtitle: "Coral Floral Jamdani Silk",
    price: 41000,
    bgHex: "#D6453D",
    textHex: "#FBF8F3",
    image: "/images/mood-kanchi.jpg",
    category: "Silk Sarees",
  },
  {
    id: "silk-03",
    title: "KANCHI RANI",
    subtitle: "Rani Rose Pure Korvai",
    price: 44500,
    bgHex: "#B81D56",
    textHex: "#FBF8F3",
    image: "/images/look-rani.jpg",
    category: "Silk Sarees",
  },
  {
    id: "silk-04",
    title: "IVORY TEMPLE",
    subtitle: "Kora Silk & Antique Gold",
    price: 48000,
    bgHex: "#C6A253",
    textHex: "#09492E",
    image: "/images/look-ivory.jpg",
    category: "Zari & Brocade",
  },
  {
    id: "silk-05",
    title: "MAYURA TEAL",
    subtitle: "Deep Teal Peacock Zari",
    price: 52500,
    bgHex: "#185E4B",
    textHex: "#E2C887",
    image: "/images/mood-wedding.jpg",
    category: "Bridal Silk",
  },
];

export const RACK_PRODUCTS: RackProduct[] = [
  {
    id: "rack-01",
    name: "VANA MARAGATHAM KORVAI",
    category: "Silk Sarees",
    price: 42500,
    fabric: "100% Pure Kanchipuram Mulberry Silk · Tested Gold Zari",
    frontImage: "/images/look-emerald.jpg",
    backImage: "/images/saree-fold-gold.jpg",
    swatchHex: "#09492E",
    sizes: ["34", "36", "38", "40", "42"],
    inStockAt: ["Kanchipuram Flagship", "Chennai Mylapore", "Online Dispatch (24h)"],
  },
  {
    id: "rack-02",
    name: "IVORY GAJENDRA SILK",
    category: "Zari & Brocade",
    price: 48000,
    fabric: "Pure Kora & Mulberry Warp · Antique Temple Zari",
    frontImage: "/images/look-ivory.jpg",
    backImage: "/images/saree-fold-gold.jpg",
    swatchHex: "#E8DFCE",
    sizes: ["34", "36", "38", "40", "42"],
    inStockAt: ["Chennai Mylapore", "Online Dispatch (24h)"],
  },
  {
    id: "rack-03",
    name: "GULAB RANI FLORAL SILK",
    category: "Silk Sarees",
    price: 39500,
    fabric: "Kanchipuram Rose Butta Silk · Contrast Zari Pallu",
    frontImage: "/images/look-rani.jpg",
    backImage: "/images/mood-banarasi.jpg",
    swatchHex: "#B81D56",
    sizes: ["34", "36", "38", "40", "42"],
    inStockAt: ["Kanchipuram Flagship", "Bengaluru Indiranagar", "Online Dispatch (24h)"],
  },
  {
    id: "rack-04",
    name: "SINDOORA TEMPLE KORVAI",
    category: "Silk Sarees",
    price: 52000,
    fabric: "Three-Shuttle Handloom Korvai · Deep Rekku Border",
    frontImage: "/images/mood-kanchi.jpg",
    backImage: "/images/saree-fold-gold.jpg",
    swatchHex: "#8B1E24",
    sizes: ["34", "36", "38", "40", "42"],
    inStockAt: ["Kanchipuram Flagship", "Online Dispatch (24h)"],
  },
  {
    id: "rack-05",
    name: "KRISHARA ZARI AARI BLOUSE",
    category: "Blouses",
    price: 7800,
    fabric: "Pure Raw Silk · Hand-worked Gold Kasab & Pearl Sleeves",
    frontImage: "/images/saree-fold-gold.jpg",
    backImage: "/images/look-emerald.jpg",
    swatchHex: "#06321F",
    sizes: ["34", "36", "38", "40", "42"],
    inStockAt: ["Kanchipuram Flagship", "Chennai Mylapore", "Online Dispatch (24h)"],
  },
  {
    id: "rack-06",
    name: "CHETTINAD PALACE CHECKS",
    category: "Checked Sarees",
    price: 36500,
    fabric: "Vairaoosi Needle-Stripe & Kattam Checks · Pure Silk",
    frontImage: "/images/look-emerald.jpg",
    backImage: "/images/mood-wedding.jpg",
    swatchHex: "#185E4B",
    sizes: ["34", "36", "38", "40", "42"],
    inStockAt: ["Chennai Mylapore", "Online Dispatch (24h)"],
  },
  {
    id: "rack-07",
    name: "PAVADAI DAVANI HALF SAREE",
    category: "Half Sarees",
    price: 34000,
    fabric: "Langa Voni Kanchipuram Silk Set · Pleated Zari Skirt",
    frontImage: "/images/mood-banarasi.jpg",
    backImage: "/images/look-rani.jpg",
    swatchHex: "#D6453D",
    sizes: ["34", "36", "38", "40", "42"],
    inStockAt: ["Kanchipuram Flagship", "Bengaluru Indiranagar"],
  },
  {
    id: "rack-08",
    name: "SWARNA TISSUE BROCADE",
    category: "Zari & Brocade",
    price: 61000,
    fabric: "Pure Silver-Gold Tissue Weave · Rich Bridal Pallu",
    frontImage: "/images/mood-wedding.jpg",
    backImage: "/images/saree-fold-gold.jpg",
    swatchHex: "#C6A253",
    sizes: ["34", "36", "38", "40", "42"],
    inStockAt: ["Kanchipuram Flagship", "Online Dispatch (24h)"],
  },
  {
    id: "rack-09",
    name: "RANI MAGGAM SILK BLOUSE",
    category: "Blouses",
    price: 6900,
    fabric: "Katan Silk Base · Floral Rose Zardozi Neckline",
    frontImage: "/images/look-rani.jpg",
    backImage: "/images/mood-banarasi.jpg",
    swatchHex: "#A81E52",
    sizes: ["34", "36", "38", "40", "42"],
    inStockAt: ["Chennai Mylapore", "Online Dispatch (24h)"],
  },
];

export const MUSE_REELS: MuseReel[] = [
  {
    id: "reel-01",
    number: "01",
    duration: "0:38",
    fabricType: "3-Ply Korvai Silk",
    title: "Dawn at Ekambareswarar Looms",
    location: "Kanchipuram, Tamil Nadu",
    poster: "/images/mood-wedding.jpg",
    linkedProductId: "bridal-01",
    linkedProductName: "Meenakshi Muhurtham Kanchipuram",
    linkedProductPrice: 88000,
  },
  {
    id: "reel-02",
    number: "02",
    duration: "0:44",
    fabricType: "Pure Zari Tissue",
    title: "Gold Thread & Brass Lamps",
    location: "Mylapore Heritage Courtyard",
    poster: "/images/look-ivory.jpg",
    linkedProductId: "rack-02",
    linkedProductName: "Ivory Gajendra Silk",
    linkedProductPrice: 48000,
  },
  {
    id: "reel-03",
    number: "03",
    duration: "0:52",
    fabricType: "Emerald Temple Silk",
    title: "The Krishara Flagship Drape",
    location: "Chettinad Mansion, Karaikudi",
    poster: "/images/look-emerald.jpg",
    linkedProductId: "rack-01",
    linkedProductName: "Vana Maragatham Korvai",
    linkedProductPrice: 42500,
  },
  {
    id: "reel-04",
    number: "04",
    duration: "0:35",
    fabricType: "Katan Floral Brocade",
    title: "Roses in Crimson & Gold",
    location: "Pondicherry Heritage Veranda",
    poster: "/images/look-rani.jpg",
    linkedProductId: "rack-03",
    linkedProductName: "Gulab Rani Floral Silk",
    linkedProductPrice: 39500,
  },
  {
    id: "reel-05",
    number: "05",
    duration: "0:47",
    fabricType: "Bridal Rekku Weave",
    title: "Walk to the Mandapam",
    location: "Tanjore Royal Palace",
    poster: "/images/mood-kanchi.jpg",
    linkedProductId: "rack-04",
    linkedProductName: "Sindoora Temple Korvai",
    linkedProductPrice: 52000,
  },
];

export const BRIDAL_SAREES: BridalSaree[] = [
  {
    id: "bridal-01",
    name: "Meenakshi Muhurtham Kanchipuram",
    fabricNote: "Heavy 3-Ply Emerald Silk · 24K Gold-Dipped Zari",
    palluNote: "Grand Temple Gopuram & Yali Pallu",
    price: 88000,
    originalPrice: 98000,
    tag: "10% OFF",
    image: "/images/mood-wedding.jpg",
  },
  {
    id: "bridal-02",
    name: "Kalyani Crimson Korvai",
    fabricNote: "Pure Mulberry Silk · Handwoven 18-Day Loom",
    palluNote: "Annapakshi & Rudraksham Border Pallu",
    price: 74500,
    image: "/images/mood-kanchi.jpg",
  },
  {
    id: "bridal-03",
    name: "Rajahamsa Ivory Bridal",
    fabricNote: "Kora Mulberry Silk · Antique Temple Gold",
    palluNote: "Swan & Lotus Medallion Pallu",
    price: 69000,
    originalPrice: 81000,
    tag: "15% OFF",
    image: "/images/look-ivory.jpg",
  },
  {
    id: "bridal-04",
    name: "Pushpa Rani Rose Brocade",
    fabricNote: "Jangla Pure Katan Silk · Zari Butti",
    palluNote: "Full-Bloom Bridal Floral Pallu",
    price: 64000,
    tag: "LIMITED WEAVE",
    image: "/images/mood-banarasi.jpg",
  },
  {
    id: "bridal-05",
    name: "Vana Emerald Royal Drape",
    fabricNote: "Deep Forest Silk · Intricate Peacock Checks",
    palluNote: "Mayil Chakram & Zari Tassel Pallu",
    price: 79000,
    image: "/images/look-emerald.jpg",
  },
];

export const ALL_SEARCHABLE_PRODUCTS = [
  ...RACK_PRODUCTS.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    price: p.price,
    image: p.frontImage,
  })),
  ...BRIDAL_SAREES.map((b) => ({
    id: b.id,
    name: b.name,
    category: "Bridal Collection",
    price: b.price,
    image: b.image,
  })),
  ...PICK_A_SILK_CARDS.map((s) => ({
    id: s.id,
    name: s.title,
    category: s.category,
    price: s.price,
    image: s.image,
  })),
];

