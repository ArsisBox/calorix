import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchOffProducts } from "@/lib/openfoodfacts";
import type { TablesInsert } from "@/lib/supabase/types";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();
  if (!query) {
    return NextResponse.json({ error: "Missing query param 'q'" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: cached, error: cacheError } = await supabase
    .from("foods")
    .select("*")
    .ilike("name", `%${query}%`)
    .limit(20);

  if (cacheError) {
    return NextResponse.json({ error: cacheError.message }, { status: 500 });
  }

  if (cached && cached.length > 0) {
    return NextResponse.json({ foods: cached });
  }

  const offResults = await searchOffProducts(query);
  if (offResults.length === 0) {
    return NextResponse.json({ foods: [] });
  }

  const rows: TablesInsert<"foods">[] = offResults.map((p) => ({
    barcode: p.barcode,
    name: p.name,
    brand: p.brand,
    calories_per_100g: p.caloriesPer100g,
    protein_per_100g: p.proteinPer100g,
    carbs_per_100g: p.carbsPer100g,
    fat_per_100g: p.fatPer100g,
    fiber_per_100g: p.fiberPer100g,
    source: "openfoodfacts",
  }));

  const { data: inserted, error: insertError } = await supabase
    .from("foods")
    .upsert(rows, { onConflict: "barcode", ignoreDuplicates: false })
    .select("*");

  if (insertError) {
    return NextResponse.json({ foods: [], warning: insertError.message });
  }

  return NextResponse.json({ foods: inserted ?? [] });
}
