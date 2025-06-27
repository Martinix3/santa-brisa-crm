
import * as React from 'react';
import { CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Building, PlusCircle } from 'lucide-react';
import type { Account } from '@/types';
import type { useSampleRequestWizard } from '@/hooks/use-sample-request-wizard';

type WizardHookReturn = ReturnType<typeof useSampleRequestWizard>;

interface StepClientProps extends Pick<WizardHookReturn, 'searchTerm' | 'setSearchTerm' | 'filteredAccounts' | 'handleClientSelect' | 'debouncedSearchTerm'> {}

export const StepClient: React.FC<StepClientProps> = ({ searchTerm, setSearchTerm, filteredAccounts, handleClientSelect, debouncedSearchTerm }) => (
  <>
    <CardHeader>
      <CardTitle>Paso 1: ¿Para qué cliente son las muestras?</CardTitle>
      <CardDescription>Busca un cliente existente o introduce el nombre de uno nuevo para continuar.</CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input placeholder="Buscar por nombre o CIF..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10"/>
      </div>
      {filteredAccounts.length > 0 && (
        <div className="space-y-2 max-h-60 overflow-y-auto p-1">
          {filteredAccounts.map(acc => ( <Button key={acc.id} type="button" variant="outline" className="w-full justify-start" onClick={() => handleClientSelect(acc)}> <Building className="mr-2 h-4 w-4 text-muted-foreground"/> {acc.name} </Button> ))}
        </div>
      )}
      {debouncedSearchTerm && filteredAccounts.length === 0 && (
        <div className="text-center p-4 border-dashed border-2 rounded-md">
          <p className="text-sm text-muted-foreground">No se encontró al cliente "{debouncedSearchTerm}".</p>
          <Button type="button" className="mt-2" onClick={() => handleClientSelect({ id: 'new', name: debouncedSearchTerm })}> <PlusCircle className="mr-2 h-4 w-4"/> Continuar como nuevo cliente </Button>
        </div>
      )}
    </CardContent>
  </>
);
