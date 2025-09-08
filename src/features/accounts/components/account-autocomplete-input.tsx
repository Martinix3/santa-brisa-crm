
"use client";

import * as React from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import type { Account } from "@/types";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

type AccountAutocompleteInputProps = {
  inputValue: string;
  matches: Account[];
  selectedAccount: Account | null;
  onInputChange: (v: string) => void;
  onPick: (a: Account) => void;
  placeholder?: string;
  isLoading?: boolean;
  maxResults?: number;
};

export const AccountAutocompleteInput = React.forwardRef<
    HTMLInputElement,
    AccountAutocompleteInputProps
>(({ inputValue, matches, selectedAccount, onInputChange, onPick, placeholder, isLoading }, ref) => {
  return (
    <Command
      filter={(value, search) => {
        const account = matches.find(a => a.name === value);
        if (!account) return 0;
        const normalizedSearch = search.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
        const normalizedName = account.name.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
        if (normalizedName.includes(normalizedSearch)) return 1;
        return 0;
      }}
    >
      <CommandInput
        ref={ref}
        placeholder={placeholder || "Buscar cuenta..."}
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
                  {account.type} • {account.city || 'Sin ciudad'}
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
