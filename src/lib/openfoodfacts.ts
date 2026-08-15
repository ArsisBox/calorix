const BASE_URL = "https://world.openfoodfacts.org";

export interface OffProduct {
  barcode: string;
  name: string;
  brand: string | null;
  caloriesPer100g: number;
  proteinPer100g: number | null;
  carbsPer100g: number | null;
  fatPer100g: number | null;
  fiberPer100g: number | null;
}

interface OffApiProduct {
  code: string;
  product_name?: string;
  brands?: string;
  nutriments?: {
    "energy-kcal_100g"?: number;
    proteins_100g?: number;
    carbohydrates_100g?: number;
    fat_100g?: number;
    fiber_100g?: number;
  };
}

function toOffProduct(p: OffApiProduct): OffProduct | null {
  const kcal = p.nutriments?.["energy-kcal_100g"];
  if (!p.product_name || kcal == null) return null;

  return {
    barcode: p.code,
    name: p.product_name,
    brand: p.brands ?? null,
    caloriesPer100g: kcal,
    proteinPer100g: p.nutriments?.proteins_100g ?? null,
    carbsPer100g: p.nutriments?.carbohydrates_100g ?? null,
    fatPer100g: p.nutriments?.fat_100g ?? null,
    fiberPer100g: p.nutriments?.fiber_100g ?? null,
  };
}

export async function searchOffProducts(query: string): Promise<OffProduct[]> {
  const url = new URL(`${BASE_URL}/cgi/search.pl`);
  url.searchParams.set("search_terms", query);
  url.searchParams.set("search_simple", "1");
  url.searchParams.set("action", "process");
  url.searchParams.set("json", "1");
  url.searchParams.set("page_size", "20");
  url.searchParams.set(
    "fields",
    "code,product_name,brands,nutriments",
  );

  const res = await fetch(url, {
    headers: { "User-Agent": "Calorix - Web App - Version 1.0" },
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`Open Food Facts search failed: ${res.status}`);

  const data = (await res.json()) as { products: OffApiProduct[] };
  return data.products
    .map(toOffProduct)
    .filter((p): p is OffProduct => p !== null);
}

export async function getOffProductByBarcode(
  barcode: string,
): Promise<OffProduct | null> {
  const url = new URL(`${BASE_URL}/api/v2/product/${barcode}.json`);
  url.searchParams.set(
    "fields",
    "code,product_name,brands,nutriments",
  );

  const res = await fetch(url, {
    headers: { "User-Agent": "Calorix - Web App - Version 1.0" },
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`Open Food Facts lookup failed: ${res.status}`);

  const data = (await res.json()) as { status: number; product?: OffApiProduct };
  if (data.status !== 1 || !data.product) return null;

  return toOffProduct(data.product);
}
