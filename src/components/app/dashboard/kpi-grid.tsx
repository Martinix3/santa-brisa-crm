
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import FormattedNumericValue from '@/components/lib/formatted-numeric-value';
import { cn } from "@/lib/utils";
import type { Kpi } from "@/types";

interface KpiGridProps {
  kpis: Kpi[];
}

export function KpiGrid({ kpis }: KpiGridProps) {
  return (
    <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {kpis.map((kpi: Kpi) => {
        const progress = kpi.targetValue > 0 ? Math.min((kpi.currentValue / kpi.targetValue) * 100, 100) : (kpi.currentValue > 0 ? 100 : 0);
        const isTurquoiseKpi = ['kpi2', 'kpi3', 'kpi4'].includes(kpi.id);
        const isPrimaryKpi = kpi.id === 'kpi1';
        const isAccentKpi = kpi.id === 'kpi5';

        let progressBarClass = "";
        if (isTurquoiseKpi) progressBarClass = "[&>div]:bg-[hsl(var(--brand-turquoise-hsl))]";
        else if (isPrimaryKpi) progressBarClass = "[&>div]:bg-primary";
        else if (isAccentKpi) progressBarClass = "[&>div]:bg-accent";

        return (
          <Card key={kpi.id} className="shadow-subtle hover:shadow-md transition-shadow duration-300">
            <CardHeader className="pb-2">
              <div className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
                {kpi.icon && <kpi.icon className="h-5 w-5 text-muted-foreground" />}
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-3xl font-bold">
                <FormattedNumericValue value={kpi.currentValue} locale="es-ES" />
                {kpi.unit === '%' && '%'}
              </div>
              <p className="text-xs text-muted-foreground">
                Objetivo: <FormattedNumericValue value={kpi.targetValue} locale="es-ES" /> {kpi.unit}
              </p>
              <Progress
                value={progress}
                aria-label={`${progress.toFixed(0)}% completado`}
                className={cn("h-2", progressBarClass)}
              />
            </CardContent>
          </Card>
        );
      })}
    </section>
  );
}
