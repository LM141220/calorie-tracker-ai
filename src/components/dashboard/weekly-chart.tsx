type WeeklyChartProps = {
  days: Array<{ date: string; calories: number }>;
  calorieTarget: number;
};

export function WeeklyChart({ days, calorieTarget }: WeeklyChartProps) {
  const maximum = Math.max(
    calorieTarget,
    ...days.map((day) => day.calories),
    1,
  );
  const numberFormat = new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0,
  });

  return (
    <section
      aria-label="Calories consommées sur les sept derniers jours"
      className="rounded-2xl border bg-card p-5 sm:p-6"
      role="img"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Cette semaine</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Calories enregistrées par jour
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Objectif : {numberFormat.format(calorieTarget)} kcal/j
        </p>
      </div>
      <div className="mt-6 grid grid-cols-7 gap-2">
        {days.map((day) => {
          const date = new Date(`${day.date}T12:00:00Z`);
          const dayName = new Intl.DateTimeFormat("fr-FR", {
            weekday: "short",
            timeZone: "UTC",
          }).format(date);
          const percentage = Math.min(
            100,
            Math.round((day.calories / maximum) * 100),
          );
          const height = day.calories > 0 ? Math.max(percentage, 5) : 0;

          return (
            <div
              className="flex min-w-0 flex-col items-center gap-2"
              key={day.date}
            >
              <span className="text-center text-[11px] text-muted-foreground">
                {day.calories > 0 ? numberFormat.format(day.calories) : "—"}
              </span>
              <div
                aria-hidden="true"
                className="flex h-32 w-full items-end rounded-md bg-muted"
              >
                <div
                  className="w-full rounded-md bg-primary transition-[height]"
                  style={{ height: `${height}%` }}
                />
              </div>
              <span className="text-xs capitalize text-muted-foreground">
                {dayName.replace(".", "")}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
