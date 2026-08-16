"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Tables, Enums } from "@/lib/supabase/types";
import { calculateGoals, ACTIVITY_LABELS, SEX_LABELS } from "@/lib/macros";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Profile = Tables<"profiles">;
type Sex = Enums<"sex_type">;
type ActivityLevel = Enums<"activity_level">;

const selectClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

export function ProfileForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [fullName, setFullName] = useState(profile.full_name ?? "");
  const [sex, setSex] = useState<Sex | "">(profile.sex ?? "");
  const [birthDate, setBirthDate] = useState(profile.birth_date ?? "");
  const [heightCm, setHeightCm] = useState(profile.height_cm ? String(profile.height_cm) : "");
  const [weightKg, setWeightKg] = useState(profile.weight_kg ? String(profile.weight_kg) : "");
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | "">(
    profile.activity_level ?? "",
  );
  const [calorieGoal, setCalorieGoal] = useState(
    profile.daily_calorie_goal ? String(profile.daily_calorie_goal) : "",
  );
  const [proteinGoal, setProteinGoal] = useState(
    profile.daily_protein_goal ? String(profile.daily_protein_goal) : "",
  );
  const [carbsGoal, setCarbsGoal] = useState(
    profile.daily_carbs_goal ? String(profile.daily_carbs_goal) : "",
  );
  const [fatGoal, setFatGoal] = useState(
    profile.daily_fat_goal ? String(profile.daily_fat_goal) : "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const canCalculate = sex && birthDate && heightCm && weightKg && activityLevel;

  function handleCalculate() {
    if (!sex || !birthDate || !heightCm || !weightKg || !activityLevel) return;
    const goals = calculateGoals({
      sex,
      birthDate,
      heightCm: parseFloat(heightCm),
      weightKg: parseFloat(weightKg),
      activityLevel,
    });
    setCalorieGoal(String(goals.calories));
    setProteinGoal(String(goals.protein));
    setCarbsGoal(String(goals.carbs));
    setFatGoal(String(goals.fat));
    setSaved(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        full_name: fullName || null,
        sex: sex || null,
        birth_date: birthDate || null,
        height_cm: heightCm ? parseFloat(heightCm) : null,
        weight_kg: weightKg ? parseFloat(weightKg) : null,
        activity_level: activityLevel || null,
        daily_calorie_goal: calorieGoal ? parseFloat(calorieGoal) : null,
        daily_protein_goal: proteinGoal ? parseFloat(proteinGoal) : null,
        daily_carbs_goal: carbsGoal ? parseFloat(carbsGoal) : null,
        daily_fat_goal: fatGoal ? parseFloat(fatGoal) : null,
      })
      .eq("id", profile.id);

    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos personales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Nombre</Label>
            <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="sex">Sexo</Label>
              <select
                id="sex"
                value={sex}
                onChange={(e) => setSex(e.target.value as Sex)}
                className={selectClass}
              >
                <option value="">Seleccionar</option>
                {Object.entries(SEX_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="birthDate">Fecha de nacimiento</Label>
              <Input
                id="birthDate"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="heightCm">Altura (cm)</Label>
              <Input
                id="heightCm"
                type="number"
                min={0}
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weightKg">Peso (kg)</Label>
              <Input
                id="weightKg"
                type="number"
                min={0}
                step="0.1"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="activityLevel">Nivel de actividad</Label>
            <select
              id="activityLevel"
              value={activityLevel}
              onChange={(e) => setActivityLevel(e.target.value as ActivityLevel)}
              className={selectClass}
            >
              <option value="">Seleccionar</option>
              {Object.entries(ACTIVITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Objetivos diarios</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            type="button"
            variant="secondary"
            onClick={handleCalculate}
            disabled={!canCalculate}
            className="w-full"
          >
            Calcular a partir de mis datos
          </Button>
          <div className="space-y-2">
            <Label htmlFor="calorieGoal">Calorías (kcal)</Label>
            <Input
              id="calorieGoal"
              type="number"
              min={0}
              value={calorieGoal}
              onChange={(e) => setCalorieGoal(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="proteinGoal">Proteína (g)</Label>
              <Input
                id="proteinGoal"
                type="number"
                min={0}
                value={proteinGoal}
                onChange={(e) => setProteinGoal(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="carbsGoal">Carbs (g)</Label>
              <Input
                id="carbsGoal"
                type="number"
                min={0}
                value={carbsGoal}
                onChange={(e) => setCarbsGoal(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fatGoal">Grasa (g)</Label>
              <Input
                id="fatGoal"
                type="number"
                min={0}
                value={fatGoal}
                onChange={(e) => setFatGoal(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {saved && <p className="text-sm text-muted-foreground">Guardado.</p>}

      <Button type="submit" disabled={saving} className="w-full">
        {saving ? "Guardando..." : "Guardar"}
      </Button>
    </form>
  );
}
