import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserTimezone } from "@/lib/timezone-server";
import { zonedDayRange } from "@/lib/timezone";
import { AddEntryForm } from "@/components/AddEntryForm";
import { EntryList } from "@/components/EntryList";
import { LogoutButton } from "@/components/LogoutButton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const timeZone = await getUserTimezone();
  const { start: startOfDay, end: endOfDay } = zonedDayRange(timeZone);

  const { data: entries } = await supabase
    .from("diary_entries")
    .select("*, foods(name, brand, density_g_per_ml)")
    .eq("user_id", user.id)
    .gte("logged_at", startOfDay.toISOString())
    .lte("logged_at", endOfDay.toISOString())
    .order("logged_at", { ascending: true });

  const { data: units } = await supabase.from("units").select("*").order("unit_type").order("to_base_factor");

  const totalCalories = (entries ?? []).reduce((sum, e) => sum + e.calories, 0);
  const goal = profile?.daily_calorie_goal ?? 2000;
  const remaining = goal - totalCalories;
  const progress = Math.min(100, Math.round((totalCalories / goal) * 100));

  const totalProtein = (entries ?? []).reduce((sum, e) => sum + (e.protein ?? 0), 0);
  const totalCarbs = (entries ?? []).reduce((sum, e) => sum + (e.carbs ?? 0), 0);
  const totalFat = (entries ?? []).reduce((sum, e) => sum + (e.fat ?? 0), 0);

  const macros = [
    { label: "Proteína", total: totalProtein, goal: profile?.daily_protein_goal, color: "bg-chart-1" },
    { label: "Carbs", total: totalCarbs, goal: profile?.daily_carbs_goal, color: "bg-chart-2" },
    { label: "Grasa", total: totalFat, goal: profile?.daily_fat_goal, color: "bg-chart-3" },
  ].filter((m) => m.goal != null);

  return (
    <div className="mx-auto max-w-md space-y-6 px-4 py-8">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image src="/logo.svg" alt="Calorix" width={36} height={36} />
          <div>
            <h1 className="text-xl font-bold">Hola{profile?.full_name ? `, ${profile.full_name}` : ""}</h1>
            <p className="text-sm text-muted-foreground">
              {startOfDay.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", timeZone })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/profile">Perfil</Link>
          </Button>
          <LogoutButton />
        </div>
      </header>

      <Link href="/history">
        <Card className="transition-colors hover:bg-accent hover:text-accent-foreground">
          <CardContent>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-bold">{totalCalories}</span>
              <span className="text-sm text-muted-foreground">de {goal} kcal</span>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {remaining >= 0 ? `${remaining} kcal restantes` : `${Math.abs(remaining)} kcal por encima del objetivo`}
            </p>
          </CardContent>
        </Card>
      </Link>

      {macros.length > 0 && (
        <Card>
          <CardContent className="space-y-3">
            {macros.map((m) => {
              const g = m.goal!;
              const pct = Math.min(100, Math.round((m.total / g) * 100));
              return (
                <div key={m.label}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-medium">{m.label}</span>
                    <span className="text-muted-foreground">
                      {Math.round(m.total)} / {g} g
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full ${m.color} transition-all`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <AddEntryForm userId={user.id} units={units ?? []} />

      <section>
        <h2 className="mb-3 font-semibold">Hoy</h2>
        <EntryList entries={entries ?? []} units={units ?? []} />
      </section>
    </div>
  );
}
