
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import FormattedNumericValue from '@/components/lib/formatted-numeric-value';
import { cn } from "@/lib/utils";

interface ProgressMetric {
  title: string;
  target: number;
  current: number;
  unit: string;
  colorClass: string;
}

interface MonthlyProgressProps {
  title: string;
  metrics: ProgressMetric[];
}

const calculateProgressValue = (current: number, target: number): number => {
  if (target <= 0) return current > 0 ? 100 : 0;
  return Math.min((current / target) * 100, 100);
};

export function MonthlyProgress({ title, metrics }: MonthlyProgressProps) {
  return (
    <section className="mt-6">
      <h2 className="text-2xl font-headline font-semibold mb-4">{title}</h2>
      <div className="grid gap-6 md:grid-cols-2">
        {metrics.map((metric) => {
          const progress = calculateProgressValue(metric.current, metric.target);
          const isTargetAchieved = metric.target > 0 && metric.current >= metric.target;
          return (
            <Card key={metric.title} className="shadow-subtle hover:shadow-md transition-shadow duration-300">
              <CardHeader>
                <CardTitle>{metric.title}</CardTitle>
                <CardDescription>
                  Objetivo: <FormattedNumericValue value={metric.target} locale="es-ES" /> {metric.unit}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  <FormattedNumericValue value={metric.current} locale="es-ES" />
                </div>
                <Progress
                  value={progress}
                  className={cn("mt-2 h-2", isTargetAchieved ? "[&>div]:bg-green-500" : metric.colorClass)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {isTargetAchieved
                    ? "¡Objetivo mensual cumplido!"
                    : `Faltan: ${Math.max(0, metric.target - metric.current)} ${metric.unit}`}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
