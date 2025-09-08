
"use client";

import * as React from "react";
import { Loader2, Building, PlusCircle, ChevronsUpDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Account } from "@/types";
import { cn } from "@/lib/utils";

interface AccountSelectorProps {
  accounts: Account[];
  selectedAccount: Account | null;
  onAccountSelected: (account: Account | null) => void;
  onGoCreateAccount: (name: string) => void;
  isLoading: boolean;
}

export function AccountSelector({
  accounts,
  selectedAccount,
  onAccountSelected,
  onGoCreateAccount,
  isLoading,
}: AccountSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");

  React.useEffect(() => {
    if (selectedAccount) {
      setSearchTerm(selectedAccount.name);
    } else {
      setSearchTerm("");
    }
  }, [selectedAccount]);

  const handleSelect = (account: Account) => {
    onAccountSelected(account);
    setSearchTerm(account.name);
    setOpen(false);
  };
  
  const handleCreateNew = () => {
    onAccountSelected(null);
    onGoCreateAccount(searchTerm);
    setOpen(false);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Cuenta</label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : selectedAccount ? (
              <span className="flex items-center"><Building className="mr-2 h-4 w-4" /> {selectedAccount.name}</span>
            ) : (
              "Buscar o crear una cuenta..."
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
          <Command
            filter={(value, search) => {
              const account = accounts.find(a => a.id === value);
              if (!account) return 0;
              if (account.name.toLowerCase().includes(search.toLowerCase())) return 1;
              return 0;
            }}
          >
            <CommandInput
              placeholder="Buscar por nombre..."
              value={searchTerm}
              onValueChange={setSearchTerm}
            />
            <CommandList>
              <CommandEmpty>
                <div className="p-2 text-center text-sm">
                  <p>No se encontró la cuenta "{searchTerm}".</p>
                   <Button variant="link" onClick={handleCreateNew} className="mt-1">
                      <PlusCircle className="mr-2 h-4 w-4"/> Crear nueva cuenta
                   </Button>
                </div>
              </CommandEmpty>
              <CommandGroup>
                {accounts.map((account) => (
                  <CommandItem
                    key={account.id}
                    value={account.id}
                    onSelect={() => handleSelect(account)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedAccount?.id === account.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {account.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
