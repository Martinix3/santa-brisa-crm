
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Waypoints, Loader2, Search, PowerOff } from 'lucide-react';
import { getTraceabilityReportAction } from '@/services/server/traceability-actions';
import type { TraceabilityReportInput, TraceabilityReportOutput } from '@/ai/flows/traceability-report-flow';

export default function TraceabilityPage() {
  const { toast } = useToast();
  const [batchId, setBatchId] = React.useState('');
  const [reportHtml, setReportHtml] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const isApiDisabled = true; // API is disabled

  const handleSearch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (isApiDisabled) {
      toast({
        title: 'Función Desactivada',
        description: 'La trazabilidad con IA está temporalmente desactivada.',
        variant: 'destructive',
      });
      return;
    }

    if (!batchId.trim()) {
      toast({
        title: 'Lote Vacío',
        description: 'Por favor, introduce un ID de lote para buscar.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setReportHtml(''); 

    try {
      const input: TraceabilityReportInput = { batchId: batchId.trim() };
      const result: TraceabilityReportOutput = await getTraceabilityReportAction(input);
      setReportHtml(result.html);
    } catch (error: any) {
      console.error('Error al generar el informe de trazabilidad:', error);
      toast({
        title: 'Error de Trazabilidad',
        description: `No se pudo obtener el informe: ${error.message}`,
        variant: 'destructive',
      });
      setReportHtml(`<div class="text-red-500">Hubo un error al generar el informe: ${error.message}</div>`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex items-center space-x-2">
        <Waypoints className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-headline font-semibold">Centro de Trazabilidad</h1>
      </header>

      <Card className="shadow-subtle">
        <CardHeader>
            <CardTitle className="flex justify-between items-center">
                <span>Buscar Lote</span>
                {isApiDisabled && (
                    <span className="flex items-center text-sm font-medium text-destructive bg-destructive/10 px-3 py-1 rounded-full">
                        <PowerOff className="mr-2 h-4 w-4" />
                        DESACTIVADO
                    </span>
                )}
            </CardTitle>
          <CardDescription>
            Introduce un ID de lote interno (ej: generado en una producción) o un ID de documento para generar un informe de trazabilidad completo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                placeholder="El servicio de trazabilidad está desactivado."
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
                className="pl-9"
                disabled={isLoading || isApiDisabled}
                />
            </div>
            <Button type="submit" disabled={isLoading || !batchId.trim() || isApiDisabled}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Buscar Lote
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {reportHtml && (
        <Card className="shadow-subtle bg-background">
          <CardContent className="pt-6">
            <div
                className="report-container"
                dangerouslySetInnerHTML={{ __html: reportHtml }}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
