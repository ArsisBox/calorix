import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { dayRangeFromKey } from "@/lib/date";
import { EntryList } from "@/components/EntryList";
import { Card, CardContent } from "@/components/ui/card";

export default async function HistoryDayPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    notFound();
  }

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

  const { start, end } = dayRangeFromKey(date);

  const { data: entries } = await supabase
    .from("diary_entries")
    .select("*, foods(name, brand)")
    .eq("user_id", user.id)
    .gte("logged_at", start.toISOString())
    .lte("logged_at", end.toISOString())
    .order("logged_at", { ascending: true });

  const totalCalories = (entries ?? []).reduce((sum, e) => sum + e.calories, 0);
  const goal = profile?.daily_calorie_goal ?? 2000;
  const remaining = goal - totalCalories;
  const progress = Math.min(100, Math.round((totalCalories / goal) * 100));

  return (
    <div className="mx-auto max-w-md space-y-6 px-4 py-8">
      <header className="flex items-center gap-3">
        <Link href="/history" className="text-sm text-muted-foreground hover:underline">
          ← Historial
        </Link>
        <h1 className="text-xl font-bold capitalize">
          {start.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
        </h1>
      </header>

      <Card>
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

      <section>
        <EntryList entries={entries ?? []} />
      </section>
    </div>
  );
}
