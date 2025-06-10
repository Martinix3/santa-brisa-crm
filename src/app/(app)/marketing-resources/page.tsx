import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MarketingResourceCategory } from "@/types";
import { mockMarketingResources } from "@/lib/data";
import { Download, FileText, Image as ImageIcon, Presentation, BookOpen } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const getIconForType = (type: MarketingResourceCategory['resources'][0]['type']) => {
  switch (type) {
    case 'Brochure': return <FileText className="h-5 w-5 text-primary" />;
    case 'Presentation': return <Presentation className="h-5 w-5 text-primary" />;
    case 'Image': return <ImageIcon className="h-5 w-5 text-primary" />;
    case 'Guideline': return <BookOpen className="h-5 w-5 text-primary" />;
    default: return <FileText className="h-5 w-5 text-primary" />;
  }
};

export default function MarketingResourcesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-headline font-semibold">Marketing Resources</h1>
      <Card className="shadow-subtle hover:shadow-md transition-shadow duration-300">
        <CardHeader>
          <CardTitle>Resource Library</CardTitle>
          <CardDescription>Access brochures, presentations, images, and brand guidelines.</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {mockMarketingResources.map((category: MarketingResourceCategory) => (
              <AccordionItem value={category.id} key={category.id}>
                <AccordionTrigger className="text-lg hover:no-underline">
                  {category.name}
                </AccordionTrigger>
                <AccordionContent>
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
                            Download
                          </Link>
                        </Button>
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
