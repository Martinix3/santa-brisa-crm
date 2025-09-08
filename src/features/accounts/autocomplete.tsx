
import * as React from "react";
import type { Account } from "@/types";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

/** Normaliza para búsqueda insensible a mayúsculas y acentos. */
function norm(s: string) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

export type UseAccountAutocompleteOpts = {
  accounts: Account[];
  initialAccount?: Account | null;
  maxResults?: number; // por defecto 8
};

export type UseAccountAutocomplete = {
  /** Texto visible en el input. Si hay cuenta seleccionada, su nombre; si no, el borrador. */
  inputValue: string;
  /** Texto libre cuando NO hay cuenta seleccionada. */
  draftAccountName: string;
  /** Cuenta actualmente seleccionada (si el usuario eligió un match). */
  selectedAccount: Account | null;
  /** Coincidencias top-N por name o city. */
  matches: Account[];
  /** onChange del input */
  setInputValue: (v: string) => void;
  /** Elegir una cuenta (o limpiar con null). */
  selectAccount: (a: Account | null) => void;
  /** Reset simple (útil al cerrar diálogos). */
  reset: () => void;
};

export function useAccountAutocomplete(
  opts: UseAccountAutocompleteOpts
): UseAccountAutocomplete {
  const { accounts, initialAccount = null, maxResults = 8 } = opts;

  const [selectedAccount, setSelectedAccount] = React.useState<Account | null>(initialAccount);
  const [draftAccountName, setDraftAccountName] = React.useState<string>(initialAccount?.name ?? "");

  const inputValue = selectedAccount?.name ?? draftAccountName;

  const matches = React.useMemo(() => {
    const q = norm(inputValue.trim());
    if (!q) return [];
    const res: Account[] = [];
    for (const a of accounts) {
      const name = norm(a.name || "");
      const city = norm((a as any).city || "");
      if (name.includes(q) || city.includes(q)) {
        res.push(a);
        if (res.length >= maxResults) break;
      }
    }
    return res;
  }, [accounts, inputValue, maxResults]);

  const setInputValue = (v: string) => {
    // Si había selección y el texto cambia respecto al nombre, des-selecciona
    if (selectedAccount && v !== (selectedAccount.name ?? "")) {
      setSelectedAccount(null);
    }
    setDraftAccountName(v);
  };

  const selectAccount = (a: Account | null) => {
    setSelectedAccount(a);
    if (a) setDraftAccountName(a.name ?? "");
  };

  const reset = () => {
    setSelectedAccount(initialAccount);
    setDraftAccountName(initialAccount?.name ?? "");
  };

  React.useEffect(() => {
    // Si cambian las props externas (p.ej. al abrir el diálogo)
    setSelectedAccount(initialAccount);
    setDraftAccountName(initialAccount?.name ?? "");
  }, [initialAccount?.id]); // id basta para detectar cambio

  return { inputValue, draftAccountName, selectedAccount, matches, setInputValue, selectAccount, reset };
}


type AccountAutocompleteInputProps = {
  inputValue: string;
  matches: Account[];
  selectedAccount: Account | null;
  onInputChange: (v: string) => void;
  onPick: (a: Account) => void;
  placeholder?: string;
  isLoading?: boolean;
  maxResults?: number; // opcional, por defecto 8
};

export const AccountAutocompleteInput = React.forwardRef<
    HTMLInputElement,
    AccountAutocompleteInputProps
>(({ inputValue, matches, selectedAccount, onInputChange, onPick, placeholder, isLoading }, ref) => {
  return (
    <Command
      filter={(value, search) => {
        const accountName = value.toLowerCase();
        const searchNorm = search.toLowerCase();
        if (accountName.includes(searchNorm)) return 1;
        return 0;
      }}
    >
      <CommandInput
        ref={ref}
        placeholder={placeholder}
        value={inputValue}
        onValueChange={onInputChange}
        disabled={isLoading}
      />
      <CommandList>
        <CommandEmpty>No se encontraron cuentas.</CommandEmpty>
        <CommandGroup>
          {matches.map((account) => (
            <CommandItem
              key={account.id}
              value={account.name}
              onSelect={() => onPick(account)}
            >
              <Check
                className={cn(
                  "mr-2 h-4 w-4",
                  selectedAccount?.id === account.id ? "opacity-100" : "opacity-0"
                )}
              />
              <div className="flex flex-col">
                <span className="font-medium">{account.name}</span>
                <span className="text-xs text-muted-foreground">
                  {account.type} • {(account as any).city || 'Sin ciudad'}
                </span>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
});

AccountAutocompleteInput.displayName = 'AccountAutocompleteInput';
