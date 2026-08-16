import type { Tables } from "@/lib/supabase/types";

export type Unit = Tables<"units">;

const WATER_DENSITY_G_PER_ML = 1;

/**
 * Converts a quantity in the given unit to grams.
 * Weight units convert directly; volume units go through the food's
 * density (falls back to water density, 1 g/ml, when unknown).
 */
export function toGrams(
  quantity: number,
  unit: Pick<Unit, "unit_type" | "to_base_factor">,
  densityGPerMl?: number | null,
): number {
  if (unit.unit_type === "weight") {
    return quantity * unit.to_base_factor;
  }
  const density = densityGPerMl ?? WATER_DENSITY_G_PER_ML;
  return quantity * unit.to_base_factor * density;
}

export const UNIT_TYPE_LABELS: Record<Unit["unit_type"], string> = {
  weight: "Peso",
  volume: "Volumen",
};
