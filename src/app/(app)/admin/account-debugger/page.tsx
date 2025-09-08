"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, TestTube2 } from "lucide-react";
import Editor from "@/components/app/editor";
import { getAccountDebugInfoAction } from "@/services/server/account-debugger-actions";

export default function AccountDebuggerPage() {
  const { toast } = useToast();
  const [accountId, setAccountId] = React.useState("");
  const [debugInfo, setDebugInfo] = React.useState<object | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId.trim()) {
      toast({ title: "ID de Cuenta Vacío", description: "Por favor, introduce un ID de cuenta.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setDebugInfo(null);

    try {
      const result = await getAccountDebugInfoAction(accountId.trim());
      setDebugInfo(result);
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
          <CardTitle>Buscar Cuenta</CardTitle>
          <CardDescription>Introduce el ID de una cuenta de Firestore para ver todas sus relaciones, esquema y posibles duplicados.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <Input
              placeholder="Introduce el ID de la cuenta..."
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              disabled={isLoading}
            />
            <Button type="submit" disabled={isLoading || !accountId.trim()}>
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
      
      {debugInfo && (
        <Card>
          <CardHeader>
            <CardTitle>Resultados de la Depuración</CardTitle>
          </CardHeader>
          <CardContent className="h-[600px]">
            <Editor
              value={JSON.stringify(debugInfo, null, 2)}
              language="json"
              options={{ readOnly: true, domReadOnly: true }}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
