import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserTimezone } from "@/lib/timezone-server";
import { zonedDateKey } from "@/lib/timezone";
import { Card, CardContent } from "@/components/ui/card";

export default async function HistoryPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("daily_calorie_goal")
    .eq("id", user.id)
    .single();

  const goal = profile?.daily_calorie_goal ?? 2000;
  const timeZone = await getUserTimezone();

  const since = new Date();
  since.setDate(since.getDate() - 90);
  since.setHours(0, 0, 0, 0);

  const { data: entries } = await supabase
    .from("diary_entries")
    .select("logged_at, calories")
    .eq("user_id", user.id)
    .gte("logged_at", since.toISOString())
    .order("logged_at", { ascending: false });

  const byDay = new Map<string, { total: number; date: Date }>();
  for (const entry of entries ?? []) {
    const date = new Date(entry.logged_at);
    const key = zonedDateKey(date, timeZone);
    const existing = byDay.get(key);
    if (existing) {
      existing.total += entry.calories;
    } else {
      byDay.set(key, { total: entry.calories, date });
    }
  }

  const days = Array.from(byDay.entries())
    .map(([key, value]) => ({ key, ...value }))
    .sort((a, b) => (a.key < b.key ? 1 : -1));

  return (
    <div className="mx-auto max-w-md space-y-6 px-4 py-8">
      <header className="flex items-center gap-3">
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
          ← Volver
        </Link>
        <h1 className="text-xl font-bold">Historial</h1>
      </header>

      {days.length === 0 ? (
        <p className="text-sm text-muted-foreground">Todavía no hay días registrados.</p>
      ) : (
        <ul className="space-y-2">
          {days.map((day) => {
            const progress = Math.min(100, Math.round((day.total / goal) * 100));
            return (
              <li key={day.key}>
                <Link href={`/history/${day.key}`}>
                  <Card className="transition-colors hover:bg-accent hover:text-accent-foreground">
                    <CardContent>
                      <div className="flex items-baseline justify-between">
                        <span className="font-medium capitalize">
                          {day.date.toLocaleDateString("es-AR", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                            timeZone,
                          })}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {day.total} / {goal} kcal
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
