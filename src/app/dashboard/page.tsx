import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AddEntryForm } from "@/components/AddEntryForm";
import { EntryList } from "@/components/EntryList";
import { LogoutButton } from "@/components/LogoutButton";
import { Card, CardContent } from "@/components/ui/card";

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

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const { data: entries } = await supabase
    .from("diary_entries")
    .select("*, foods(name, brand)")
    .eq("user_id", user.id)
    .gte("logged_at", startOfDay.toISOString())
    .lte("logged_at", endOfDay.toISOString())
    .order("logged_at", { ascending: true });

  const totalCalories = (entries ?? []).reduce((sum, e) => sum + e.calories, 0);
  const goal = profile?.daily_calorie_goal ?? 2000;
  const remaining = goal - totalCalories;
  const progress = Math.min(100, Math.round((totalCalories / goal) * 100));

  return (
    <div className="mx-auto max-w-md space-y-6 px-4 py-8">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image src="/logo.svg" alt="Calorix" width={36} height={36} />
          <div>
            <h1 className="text-xl font-bold">Hola{profile?.full_name ? `, ${profile.full_name}` : ""}</h1>
            <p className="text-sm text-muted-foreground">
              {new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
            </p>
          </div>
        </div>
        <LogoutButton />
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

      <AddEntryForm userId={user.id} />

      <section>
        <h2 className="mb-3 font-semibold">Hoy</h2>
        <EntryList entries={entries ?? []} />
      </section>
    </div>
  );
}
