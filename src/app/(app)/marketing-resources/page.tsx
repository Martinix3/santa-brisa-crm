
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MarketingResourceCategory } from "@/types";
import { mockMarketingResources } from "@/lib/seeds";
import { Download, FileText, Image as ImageIcon, Presentation, BookOpen, Library } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TipoRecursoMarketing as MarketingResourceType } from "@ssot";

const getIconForType = (type: MarketingResourceType) => {
  switch (type) {
    case 'Folleto': return <FileText className="h-5 w-5 text-primary" />;
    case 'Presentación': return <Presentation className="h-5 w-5 text-primary" />;
    case 'Imagen': return <ImageIcon className="h-5 w-5 text-primary" />;
    case 'Guía': return <BookOpen className="h-5 w-5 text-primary" />;
    default: return <FileText className="h-5 w-5 text-primary" />;
  }
};

export default function MarketingResourcesPage() {
  return (
    <div className="space-y-6">
       <header className="flex items-center space-x-2">
        <Library className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-headline font-semibold">Biblioteca de Recursos de Marketing</h1>
      </header>
      <Card className="shadow-subtle hover:shadow-md transition-shadow duration-300">
        <CardHeader>
          <CardTitle>Materiales Disponibles</CardTitle>
          <CardDescription>Encuentra y descarga materiales de marketing actualizados, incluyendo folletos, presentaciones, imágenes de producto y guías de marca.</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {mockMarketingResources.map((category: MarketingResourceCategory) => (
              <AccordionItem value={category.id} key={category.id}>
                <AccordionTrigger className="text-lg hover:no-underline">
                  {category.name}
                </AccordionTrigger>
                <AccordionContent>
                  {category.resources.length > 0 ? (
                    <ul className="space-y-3 pt-2">
                      {category.resources.map(resource => (
                        <li key={resource.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-md shadow-sm">
                          <div className="flex items-center space-x-3">
                            {getIconForType(resource.type)}
                            <div>
                              <h4 className="font-medium">{resource.title}</h4>
                              <p className="text-sm text-muted-foreground">{resource.description}</p>
                            </div>
                          </div>
                          <Button variant="outline" size="sm" asChild>
                            <Link href={resource.link} target="_blank" rel="noopener noreferrer">
                              <Download className="mr-2 h-4 w-4" />
                              Descargar
                            </Link>
                          </Button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground pt-2">No hay recursos disponibles en esta categoría.</p>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
