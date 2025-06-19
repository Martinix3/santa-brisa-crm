'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, Loader2, Send } from 'lucide-react';
import { askMarketingAssistant, type MarketingAssistantInput, type MarketingAssistantOutput } from '@/ai/flows/marketing-assistant-flow';

export default function AiAssistantPage() {
  const { toast } = useToast();
  const [question, setQuestion] = React.useState('');
  const [answer, setAnswer] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!question.trim()) {
      toast({
        title: 'Pregunta Vacía',
        description: 'Por favor, introduce una pregunta para el asistente.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setAnswer(''); // Clear previous answer

    try {
      const input: MarketingAssistantInput = { question };
      const result: MarketingAssistantOutput = await askMarketingAssistant(input);
      setAnswer(result.answer);
    } catch (error) {
      console.error('Error al contactar al asistente de IA:', error);
      toast({
        title: 'Error de IA',
        description: 'No se pudo obtener una respuesta del asistente. Inténtalo de nuevo.',
        variant: 'destructive',
      });
      setAnswer('Hubo un error al procesar tu pregunta. Por favor, intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex items-center space-x-2">
        <Sparkles className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-headline font-semibold">Asistente de Marketing IA</h1>
      </header>

      <Card className="shadow-subtle hover:shadow-md transition-shadow duration-300">
        <CardHeader>
          <CardTitle>Pregunta a Santi, tu Asistente Experto</CardTitle>
          <CardDescription>
            Haz cualquier pregunta sobre los productos de Santa Brisa, argumentos de venta,
            o información de la empresa para obtener ayuda instantánea.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Textarea
              placeholder="Ej: ¿Cuáles son los principales beneficios del agua Santa Brisa para deportistas?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={3}
              className="focus:ring-2 focus:ring-primary"
              disabled={isLoading}
            />
            <Button type="submit" disabled={isLoading || !question.trim()}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Pensando...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Enviar Pregunta
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {answer && (
        <Card className="shadow-subtle bg-secondary/30">
          <CardHeader>
            <CardTitle className="text-lg">Respuesta de Santi:</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none whitespace-pre-line">
              {answer}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
