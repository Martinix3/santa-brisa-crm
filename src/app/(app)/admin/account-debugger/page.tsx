"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, TestTube2, AlertCircle } from "lucide-react";
import Editor from "@/components/app/editor";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import FormattedNumericValue from "@/components/lib/formatted-numeric-value";

interface DebugBundle {
    account: any;
    related: Record<string, any[]>;
    schema: Record<string, any>;
    metrics: any;
    duplicates: any[];
}

export default function AccountDebuggerPage() {
  const { toast } = useToast();
  const [accountName, setAccountName] = React.useState("");
  const [debugBundles, setDebugBundles] = React.useState<DebugBundle[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountName.trim()) {
      toast({ title: "Nombre de Cuenta Vacío", description: "Por favor, introduce un nombre de cuenta.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setDebugBundles([]);
    setMessage(null);

    try {
      const response = await fetch('/api/debug/account-by-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: accountName.trim() }),
      });
      
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Error desconocido del servidor.");
      }

      setDebugBundles(result.bundles);
      setMessage(result.message || `Se encontraron ${result.matches} coincidencias.`);

    } catch (error: any) {
      console.error("Error fetching debug info:", error);
      toast({ title: "Error al Depurar", description: `No se pudo obtener la información: ${error.message}`, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex items-center space-x-2">
        <TestTube2 className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-headline font-semibold">Herramienta de Depuración de Cuentas</h1>
      </header>
      
      <Card>
        <CardHeader>
          <CardTitle>Buscar Cuenta por Nombre</CardTitle>
          <CardDescription>Introduce el nombre comercial de una cuenta para ver todas sus relaciones, esquema y posibles duplicados.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <Input
              placeholder="Introduce el nombre de la cuenta..."
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              disabled={isLoading}
            />
            <Button type="submit" disabled={isLoading || !accountName.trim()}>
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              Depurar
            </Button>
          </form>
        </CardContent>
      </Card>
      
      {message && (
          <Alert variant="default" className="border-primary/50 bg-primary/5">
              <AlertCircle className="h-4 w-4 text-primary" />
              <AlertTitle>Resultado de la Búsqueda</AlertTitle>
              <AlertDescription>{message}</AlertDescription>
          </Alert>
      )}
      
      {debugBundles.length > 0 && (
          <Accordion type="single" collapsible className="w-full space-y-4">
              {debugBundles.map((bundle, index) => (
                  <AccordionItem value={`item-${index}`} key={bundle.account.id} className="border rounded-lg bg-card">
                      <AccordionTrigger className="p-4 font-semibold text-lg">
                          Resultado para: {bundle.account.name} (ID: ...{bundle.account.id.slice(-6)})
                      </AccordionTrigger>
                      <AccordionContent>
                           <div className="px-4 pb-4 space-y-4">
                                <Card>
                                    <CardHeader><CardTitle>Métricas Generales</CardTitle></CardHeader>
                                    <CardContent>
                                        <p>Colecciones Relacionadas: <strong>{bundle.metrics.collections}</strong></p>
                                        <p>Documentos Relacionados: <strong>{bundle.metrics.docsCount}</strong></p>
                                        <p>Valor Total en Órdenes: <strong><FormattedNumericValue value={bundle.metrics.totalAmount} options={{ style: 'currency', currency: 'EUR' }} /></strong></p>
                                    </CardContent>
                                </Card>
                                 <Card>
                                    <CardHeader><CardTitle>Posibles Duplicados ({bundle.duplicates.length})</CardTitle></CardHeader>
                                    <CardContent className="h-64">
                                        <Editor value={JSON.stringify(bundle.duplicates, null, 2)} language="json" options={{ readOnly: true, domReadOnly: true }}/>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader><CardTitle>Esquema Inferido</CardTitle></CardHeader>
                                    <CardContent className="h-[600px]">
                                        <Editor value={JSON.stringify(bundle.schema, null, 2)} language="json" options={{ readOnly: true, domReadOnly: true }}/>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader><CardTitle>Datos Relacionados Completos</CardTitle></CardHeader>
                                    <CardContent className="h-[600px]">
                                        <Editor value={JSON.stringify(bundle.related, null, 2)} language="json" options={{ readOnly: true, domReadOnly: true }}/>
                                    </CardContent>
                                </Card>
                           </div>
                      </AccordionContent>
                  </AccordionItem>
              ))}
          </Accordion>
      )}
    </div>
  );
}
