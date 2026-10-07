/**
 * Imagoo product page details (Product.storefront on the server).
 * Shared fields (name, price, colours, images) are edited in the other cards.
 */
export interface StorefrontDetails {
  tagline: string;
  highlights: string[];
  specs: { dimensions: string; material: string; weight: string; includes: string; care: string[] };
  notice: string;
  propsNote: string;
  badges: string[];
  tags: string[];
  featured: boolean;
  everyday: boolean;
  rank: number;
  alsoIn: string[];
  personalization: {
    label: string;
    placeholder: string;
    help: string;
    maxLength: number;
    required: boolean;
  } | null;
  design: {
    title: string;
    designer: string;
    platform: string;
    url: string;
    license: string;
    licenseUrl: string;
    checkedOn: string;
    note: string;
  } | null;
  colorSwatches: { color: string; swatches: string[] }[];
}

export const emptyStorefront = (): StorefrontDetails => ({
  tagline: "",
  highlights: [],
  specs: { dimensions: "", material: "", weight: "", includes: "", care: [] },
  notice: "",
  propsNote: "",
  badges: [],
  tags: [],
  featured: false,
  everyday: false,
  rank: 100,
  alsoIn: [],
  personalization: null,
  design: null,
  colorSwatches: [],
});


/** Merge a product's stored storefront details over the defaults. */
export const storefrontFromProduct = (sf: Partial<StorefrontDetails> | null | undefined): StorefrontDetails => {
  const base = emptyStorefront();
  if (!sf) return base;
  return {
    ...base,
    ...sf,
    specs: { ...base.specs, ...(sf.specs || {}), care: sf.specs?.care ?? [] },
    highlights: sf.highlights ?? [],
    badges: sf.badges ?? [],
    tags: sf.tags ?? [],
    alsoIn: (sf.alsoIn ?? []).map(String),
    colorSwatches: sf.colorSwatches ?? [],
    personalization: sf.personalization ?? null,
    design: sf.design ? { ...sf.design, note: sf.design.note ?? "" } : null,
  };
};
