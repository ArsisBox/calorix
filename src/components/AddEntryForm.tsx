"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Tables, Enums } from "@/lib/supabase/types";

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
    <div className="rounded-xl border border-gray-200 p-4 space-y-4">
      <h2 className="font-semibold">Agregar alimento</h2>

      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          placeholder="Buscar alimento (ej. banana, arroz...)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={searching}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {searching ? "..." : "Buscar"}
        </button>
      </form>

      {results.length > 0 && !selected && (
        <ul className="max-h-56 divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-100">
          {results.map((food) => (
            <li key={food.id}>
              <button
                onClick={() => setSelected(food)}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-50"
              >
                <span>
                  {food.name}
                  {food.brand ? ` · ${food.brand}` : ""}
                </span>
                <span className="text-gray-500">{food.calories_per_100g} kcal/100g</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <div className="space-y-3 rounded-lg bg-gray-50 p-3">
          <p className="text-sm font-medium">{selected.name}</p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <span className="text-sm text-gray-500">gramos</span>
          </div>
          <select
            value={mealType}
            onChange={(e) => setMealType(e.target.value as MealType)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            {Object.entries(MEAL_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={saving}
              className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Agregar al diario"}
            </button>
            <button
              onClick={() => setSelected(null)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
