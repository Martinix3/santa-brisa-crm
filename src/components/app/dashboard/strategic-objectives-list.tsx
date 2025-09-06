
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StrategicObjective } from "@/types";

interface StrategicObjectivesListProps {
  objectives: StrategicObjective[];
}

export function StrategicObjectivesList({ objectives }: StrategicObjectivesListProps) {
  if (!objectives || !Array.isArray(objectives)) {
    return (
        <Card className="shadow-subtle">
            <CardHeader>
                <CardTitle>Objetivos Estratégicos Clave</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">Cargando objetivos...</p>
            </CardContent>
        </Card>
    );
  }

  const objectivesToShow = objectives.slice(0, 5);
  const remainingCount = objectives.length - objectivesToShow.length;

  return (
    <Card className="shadow-subtle hover:shadow-md transition-shadow duration-300">
      <CardHeader>
        <CardTitle>Objetivos Estratégicos Clave</CardTitle>
        <CardDescription>Resumen de los principales objetivos estratégicos cualitativos de la empresa. Gestión completa en Configuración.</CardDescription>
      </CardHeader>
      <CardContent>
        {objectives.length > 0 ? (
          <ul className="space-y-3">
            {objectivesToShow.map((objective) => (
              <li key={objective.id} className="flex items-start space-x-3 p-3 bg-secondary/20 rounded-md shadow-sm">
                {objective.completed ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                ) : (
                  <Circle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                )}
                <p className={cn("text-sm", objective.completed && "line-through text-muted-foreground")}>
                  {objective.text}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No hay objetivos estratégicos definidos. Pueden gestionarse desde la sección de Configuración.</p>
        )}
        {remainingCount > 0 && (
          <p className="text-xs text-muted-foreground mt-3">
            Y {remainingCount} más objetivos. Ver todos en Configuración.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
