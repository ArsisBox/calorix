"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Tables, Enums } from "@/lib/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Food = Tables<"foods">;
type MealType = Enums<"meal_type">;

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Desayuno",
  lunch: "Almuerzo",
  dinner: "Cena",
  snack: "Snack",
};

export function AddEntryForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Food[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Food | null>(null);
  const [quantity, setQuantity] = useState("100");
  const [mealType, setMealType] = useState<MealType>("breakfast");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setError(null);
    setSelected(null);

    try {
      const res = await fetch(`/api/foods/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error buscando alimentos");
      setResults(data.foods ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error buscando alimentos");
    } finally {
      setSearching(false);
    }
  }

  async function handleAdd() {
    if (!selected) return;
    const grams = parseFloat(quantity);
    if (!grams || grams <= 0) {
      setError("Ingresá una cantidad válida");
      return;
    }

    setSaving(true);
    setError(null);

    const factor = grams / 100;
    const supabase = createClient();
    const { error } = await supabase.from("diary_entries").insert({
      user_id: userId,
      food_id: selected.id,
      meal_type: mealType,
      quantity_grams: grams,
      calories: Math.round(selected.calories_per_100g * factor),
      protein: selected.protein_per_100g ? selected.protein_per_100g * factor : null,
      carbs: selected.carbs_per_100g ? selected.carbs_per_100g * factor : null,
      fat: selected.fat_per_100g ? selected.fat_per_100g * factor : null,
    });

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }

    setSelected(null);
    setResults([]);
    setQuery("");
    setQuantity("100");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Agregar alimento</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            type="text"
            placeholder="Buscar alimento (ej. banana, arroz...)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Button type="submit" disabled={searching} variant="secondary">
            {searching ? "..." : "Buscar"}
          </Button>
        </form>

        {results.length > 0 && !selected && (
          <ul className="max-h-56 divide-y divide-border overflow-y-auto rounded-lg border">
            {results.map((food) => (
              <li key={food.id}>
                <button
                  onClick={() => setSelected(food)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                >
                  <span>
                    {food.name}
                    {food.brand ? ` · ${food.brand}` : ""}
                  </span>
                  <span className="text-muted-foreground">{food.calories_per_100g} kcal/100g</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {selected && (
          <div className="space-y-3 rounded-lg bg-muted p-3">
            <p className="text-sm font-medium">{selected.name}</p>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">gramos</span>
            </div>
            <select
              value={mealType}
              onChange={(e) => setMealType(e.target.value as MealType)}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              {Object.entries(MEAL_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <Button onClick={handleAdd} disabled={saving} className="flex-1">
                {saving ? "Guardando..." : "Agregar al diario"}
              </Button>
              <Button variant="outline" onClick={() => setSelected(null)}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
