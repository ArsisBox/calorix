"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Tables, Enums } from "@/lib/supabase/types";

type DiaryEntry = Tables<"diary_entries"> & {
  foods: Pick<Tables<"foods">, "name" | "brand"> | null;
};

type MealType = Enums<"meal_type">;

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Desayuno",
  lunch: "Almuerzo",
  dinner: "Cena",
  snack: "Snack",
};

export function EntryList({ entries }: { entries: DiaryEntry[] }) {
  const router = useRouter();

  async function handleDelete(id: string) {
    const supabase = createClient();
    await supabase.from("diary_entries").delete().eq("id", id);
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
              {items.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-center justify-between px-3 py-2 text-sm"
                >
                  <div>
                    <p>{entry.custom_name ?? entry.foods?.name ?? "Alimento"}</p>
                    <p className="text-xs text-muted-foreground">
                      {entry.quantity_grams}g · {entry.calories} kcal
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="text-xs text-destructive hover:underline"
                  >
                    Eliminar
                  </button>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
