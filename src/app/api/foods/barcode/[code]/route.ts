import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOffProductByBarcode } from "@/lib/openfoodfacts";
import type { TablesInsert } from "@/lib/supabase/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;

  const supabase = await createClient();

  const { data: cached, error: cacheError } = await supabase
    .from("foods")
    .select("*")
    .eq("barcode", code)
    .maybeSingle();

  if (cacheError) {
    return NextResponse.json({ error: cacheError.message }, { status: 500 });
  }

  if (cached) {
    return NextResponse.json({ food: cached });
  }

  const offProduct = await getOffProductByBarcode(code);
  if (!offProduct) {
    return NextResponse.json({ food: null }, { status: 404 });
  }

  const row: TablesInsert<"foods"> = {
    barcode: offProduct.barcode,
    name: offProduct.name,
    brand: offProduct.brand,
    calories_per_100g: offProduct.caloriesPer100g,
    protein_per_100g: offProduct.proteinPer100g,
    carbs_per_100g: offProduct.carbsPer100g,
    fat_per_100g: offProduct.fatPer100g,
    fiber_per_100g: offProduct.fiberPer100g,
    source: "openfoodfacts",
  };

  const { data: inserted, error: insertError } = await supabase
    .from("foods")
    .upsert(row, { onConflict: "barcode" })
    .select("*")
    .single();

  if (insertError) {
    return NextResponse.json({ food: null, warning: insertError.message });
  }

  return NextResponse.json({ food: inserted });
}
