
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Waypoints, Loader2, Search } from 'lucide-react';
import { getTraceabilityReport, type TraceabilityReportInput, type TraceabilityReportOutput } from '@/ai/flows/traceability-report-flow';
import Markdown from 'react-markdown';

export default function TraceabilityPage() {
  const { toast } = useToast();
  const [batchNumber, setBatchNumber] = React.useState('');
  const [report, setReport] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSearch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!batchNumber.trim()) {
      toast({
        title: 'Lote Vacío',
        description: 'Por favor, introduce un número de lote para buscar.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setReport(''); 

    try {
      const input: TraceabilityReportInput = { batchNumber: batchNumber.trim() };
      const result: TraceabilityReportOutput = await getTraceabilityReport(input);
      setReport(result.report);
    } catch (error) {
      console.error('Error al contactar al asistente de trazabilidad:', error);
      toast({
        title: 'Error de IA',
        description: 'No se pudo obtener el informe. Inténtalo de nuevo.',
        variant: 'destructive',
      });
      setReport('Hubo un error al generar el informe. Por favor, intenta de nuevo.');
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
          <CardTitle>Buscar Lote</CardTitle>
          <CardDescription>
            Introduce un número de lote de producto terminado o de materia prima para generar un informe de trazabilidad completo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                placeholder="Ej: PROD-20240925103000 o LOTE-TEQUILA-XYZ"
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                className="pl-9"
                disabled={isLoading}
                />
            </div>
            <Button type="submit" disabled={isLoading || !batchNumber.trim()}>
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

      {report && (
        <Card className="shadow-subtle bg-secondary/30">
          <CardHeader>
            <CardTitle className="text-lg">Informe de Trazabilidad para el Lote: {batchNumber}</CardTitle>
            <CardDescription className="text-destructive">Nota: Los datos de este informe son de ejemplo. La funcionalidad completa requiere conectar las nuevas estructuras de datos.</CardDescription>
          </CardHeader>
          <CardContent>
            <article className="prose prose-sm dark:prose-invert max-w-none">
                <Markdown>{report}</Markdown>
            </article>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
