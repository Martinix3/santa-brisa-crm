"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import { Loader2, HardHat, CheckCircle, AlertTriangle, FileJson } from "lucide-react";
import { testFlow, type TestFlowInput, type TestFlowOutput } from "@/ai/flows/test-flow";
import { useToast } from "@/hooks/use-toast";

export default function CloudTestPage() {
  const { user, teamMember, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = React.useState(false);
  const [testResult, setTestResult] = React.useState<TestFlowOutput | null>(null);
  const [testError, setTestError] = React.useState<string | null>(null);

  const handleRunTest = async () => {
    setIsLoading(true);
    setTestResult(null);
    setTestError(null);

    try {
      const input: TestFlowInput = {
        message: `Hola desde el cliente, usuario: ${user?.email}`,
      };
      const result = await testFlow(input);
      setTestResult(result);
      toast({
        title: "¡Prueba Exitosa!",
        description: "La comunicación con Google AI a través de Genkit funciona.",
      });
    } catch (error: any) {
      console.error("Cloud Test Error:", error);
      setTestError(error.message || "Ocurrió un error desconocido.");
      toast({
        title: "Error en la Prueba",
        description: "No se pudo comunicar con el servicio de IA. Revisa la consola para más detalles.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center space-x-2">
        <HardHat className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-headline font-semibold">Página de Prueba de Integración</h1>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Chivato 1: Autenticación de Firebase</CardTitle>
          <CardDescription>Verifica que el contexto de autenticación funciona y recupera tus datos.</CardDescription>
        </CardHeader>
        <CardContent>
          {authLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando datos de usuario...
            </div>
          ) : user ? (
            <div className="space-y-2 text-sm p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-600"/> <strong>Estado:</strong> Autenticado Correctamente</p>
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>UID de Firebase:</strong> {user.uid}</p>
              <p><strong>Nombre del Perfil:</strong> {teamMember?.name || "No encontrado"}</p>
              <p><strong>Rol del Perfil:</strong> {teamMember?.role || "No encontrado"}</p>
            </div>
          ) : (
            <div className="space-y-2 text-sm p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-red-600"/> <strong>Estado:</strong> No Autenticado</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Chivato 2: Conexión con Google AI (Genkit)</CardTitle>
          <CardDescription>
            Pulsa el botón para ejecutar un flujo simple de Genkit que llama a un modelo de IA. 
            Esto verifica que la API Key y la configuración del flujo son correctas.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-start gap-4">
          <Button onClick={handleRunTest} disabled={isLoading}>
            {isLoading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Ejecutando prueba...</>
            ) : "Ejecutar Prueba de IA"}
          </Button>

          {testResult && (
            <div className="w-full space-y-2 p-4 bg-blue-50 border border-blue-200 rounded-md">
                 <h3 className="font-semibold flex items-center gap-2"><FileJson className="h-5 w-5 text-blue-600"/>Respuesta del Flujo de IA:</h3>
                 <pre className="text-xs bg-white p-2 rounded overflow-x-auto">
                    <code>{JSON.stringify(testResult, null, 2)}</code>
                 </pre>
            </div>
          )}

          {testError && (
             <div className="w-full space-y-2 p-4 bg-red-50 border border-red-200 rounded-md">
                 <h3 className="font-semibold flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-red-600"/>Error Recibido:</h3>
                 <p className="text-sm font-mono bg-white p-2 rounded">{testError}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
