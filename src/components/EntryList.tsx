"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Tables, Enums } from "@/lib/supabase/types";
import type { Unit } from "@/lib/units";
import { toGrams } from "@/lib/units";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UnitSelect } from "@/components/UnitSelect";

type DiaryEntry = Tables<"diary_entries"> & {
  foods: Pick<Tables<"foods">, "name" | "brand" | "density_g_per_ml"> | null;
};

type MealType = Enums<"meal_type">;

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Desayuno",
  lunch: "Almuerzo",
  dinner: "Cena",
  snack: "Snack",
};

export function EntryList({ entries, units }: { entries: DiaryEntry[]; units: Unit[] }) {
  const router = useRouter();
  const gramUnit = units.find((u) => u.abbreviation === "g") ?? units[0];
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState("");
  const [editUnitId, setEditUnitId] = useState("");
  const [editMealType, setEditMealType] = useState<MealType>("breakfast");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(id: string) {
    const supabase = createClient();
    await supabase.from("diary_entries").delete().eq("id", id);
    router.refresh();
  }

  function startEdit(entry: DiaryEntry) {
    setEditingId(entry.id);
    setEditQuantity(String(entry.input_quantity ?? entry.quantity_grams));
    setEditUnitId(entry.input_unit_id ?? gramUnit?.id ?? "");
    setEditMealType(entry.meal_type);
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setError(null);
  }

  async function handleSaveEdit(entry: DiaryEntry) {
    const qty = parseFloat(editQuantity);
    const unit = units.find((u) => u.id === editUnitId);
    if (!qty || qty <= 0 || !unit) {
      setError("Ingresá una cantidad válida");
      return;
    }

    setSaving(true);
    setError(null);

    const grams = toGrams(qty, unit, entry.foods?.density_g_per_ml);
    // Derive per-100g values from the originally stored data so we can
    // rescale calories/macros to the new quantity without re-fetching food.
    const ratio = grams / entry.quantity_grams;
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("diary_entries")
      .update({
        quantity_grams: grams,
        input_quantity: qty,
        input_unit_id: unit.id,
        meal_type: editMealType,
        calories: Math.round(entry.calories * ratio),
        protein: entry.protein != null ? entry.protein * ratio : null,
        carbs: entry.carbs != null ? entry.carbs * ratio : null,
        fat: entry.fat != null ? entry.fat * ratio : null,
      })
      .eq("id", entry.id);

    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }

    setEditingId(null);
    router.refresh();
  }

  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Todavía no registraste nada hoy.
      </p>
    );
  }

  const grouped = entries.reduce<Record<MealType, DiaryEntry[]>>(
    (acc, entry) => {
      acc[entry.meal_type] = [...(acc[entry.meal_type] ?? []), entry];
      return acc;
    },
    {} as Record<MealType, DiaryEntry[]>,
  );

  return (
    <div className="space-y-5">
      {(Object.keys(MEAL_LABELS) as MealType[]).map((meal) => {
        const items = grouped[meal];
        if (!items || items.length === 0) return null;

        return (
          <div key={meal}>
            <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
              {MEAL_LABELS[meal]}
            </h3>
            <ul className="divide-y divide-border rounded-lg border">
              {items.map((entry) =>
                editingId === entry.id ? (
                  <li key={entry.id} className="space-y-3 px-3 py-3 text-sm">
                    <p className="font-medium">{entry.custom_name ?? entry.foods?.name ?? "Alimento"}</p>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        step="any"
                        value={editQuantity}
                        onChange={(e) => setEditQuantity(e.target.value)}
                        className="w-24"
                      />
                      <UnitSelect units={units} value={editUnitId} onChange={setEditUnitId} />
                    </div>
                    <select
                      value={editMealType}
                      onChange={(e) => setEditMealType(e.target.value as MealType)}
                      className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    >
                      {Object.entries(MEAL_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    {error && <p className="text-xs text-destructive">{error}</p>}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleSaveEdit(entry)}
                        disabled={saving}
                        className="flex-1"
                      >
                        {saving ? "Guardando..." : "Guardar"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={cancelEdit}>
                        Cancelar
                      </Button>
                    </div>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="text-xs text-destructive hover:underline"
                    >
                      Eliminar
                    </button>
                  </li>
                ) : (
                  <li
                    key={entry.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => startEdit(entry)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") startEdit(entry);
                    }}
                    className="flex cursor-pointer items-center justify-between px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                  >
                    <div>
                      <p>{entry.custom_name ?? entry.foods?.name ?? "Alimento"}</p>
                      <p className="text-xs text-muted-foreground">
                        {entry.quantity_grams}g · {entry.calories} kcal
                      </p>
                    </div>
                  </li>
                ),
              )}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
