import type { Enums } from "@/lib/supabase/types";

type Sex = Enums<"sex_type">;
type ActivityLevel = Enums<"activity_level">;

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: "Sedentario (poco o nada de ejercicio)",
  light: "Actividad leve (1-3 días/semana)",
  moderate: "Actividad moderada (3-5 días/semana)",
  active: "Activo (6-7 días/semana)",
  very_active: "Muy activo (ejercicio intenso a diario)",
};

export const SEX_LABELS: Record<Sex, string> = {
  male: "Masculino",
  female: "Femenino",
  other: "Otro",
};

export function calculateAge(birthDate: string, reference = new Date()): number {
  const birth = new Date(birthDate);
  let age = reference.getFullYear() - birth.getFullYear();
  const monthDiff = reference.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && reference.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export interface MacroGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

/**
 * Estimates daily calorie needs via Mifflin-St Jeor (BMR) x activity factor,
 * then splits calories into a standard 30% protein / 40% carbs / 30% fat.
 */
export function calculateGoals(params: {
  sex: Sex;
  birthDate: string;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
}): MacroGoals {
  const age = calculateAge(params.birthDate);
  const sexOffset = params.sex === "female" ? -161 : 5;
  const bmr = 10 * params.weightKg + 6.25 * params.heightCm - 5 * age + sexOffset;
  const calories = Math.round(bmr * ACTIVITY_MULTIPLIERS[params.activityLevel]);

  const protein = Math.round((calories * 0.3) / 4);
  const carbs = Math.round((calories * 0.4) / 4);
  const fat = Math.round((calories * 0.3) / 9);

  return { calories, protein, carbs, fat };
}
