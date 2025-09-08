
'use client';

import * as React from 'react';
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import type { Order } from '@/types';
import { cn } from '@/lib/utils';
import AccountHistoryTable from '@/components/app/account-history-table';
import { EnrichedAccount } from '@/types';
import StatusBadge from '@/components/app/status-badge';
import { format, isValid, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import FormattedNumericValue from '@/components/lib/formatted-numeric-value';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';
import Link from 'next/link';

function LazyHistory({ accountId }: { accountId: string }) {
  const [loading, setLoading] = React.useState(true);
  const [history, setHistory] = React.useState<Order[] | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        // Use the new API route to fetch history
        const response = await fetch(`/api/accounts/history?accountId=${accountId}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch history: ${response.statusText}`);
        }
        const data = await response.json();
        if (!cancelled) setHistory(data);
      } catch (err) {
        console.error("Failed to load account history", err);
        if (!cancelled) setHistory([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [accountId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground p-3">
        <Loader2 className="size-4 animate-spin" />
        Cargando historial…
      </div>
    );
  }

  if (!history || history.length === 0) {
    return <div className="text-sm text-muted-foreground p-3">Sin historial reciente.</div>;
  }

  return <AccountHistoryTable interactions={history} />;
}


export function AccountRow({
  account,
  isExpanded,
  onToggleExpand,
  onOpenHub,
}: {
  account: EnrichedAccount;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onOpenHub: (accountId: string, mode: 'registrar' | 'editar' | 'pedido') => void;
}) {
  const nextInteractionDate = account.nextInteraction?.status === 'Programada'
    ? account.nextInteraction.visitDate
    : account.nextInteraction?.nextActionDate;

  return (
    <React.Fragment>
      <tr className={cn("group", isExpanded && "bg-muted/50")}>
        <td className="w-8 pl-2">
          <Button
            aria-label={expanded ? 'Contraer' : 'Expandir'}
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={onToggleExpand}
          >
            {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </Button>
        </td>
        <td className="font-medium p-2">
            <Link href={`/accounts/${account.id}`} className="hover:underline text-primary">
                {account.name}
            </Link>
            <p className="text-xs text-muted-foreground">{account.city ?? '--'}</p>
        </td>
        <td className="p-2">{account.responsableName || 'N/A'}</td>
        <td className="p-2 text-sm">
            {account.lastInteractionDate && isValid(parseISO(account.lastInteractionDate))
                ? format(parseISO(account.lastInteractionDate), 'dd MMM yyyy', {locale: es})
                : 'Nunca'
            }
        </td>
        <td className="p-2 text-sm">
            {nextInteractionDate && isValid(parseISO(nextInteractionDate))
                ? format(parseISO(nextInteractionDate), 'dd MMM yyyy', {locale: es})
                : 'No programada'
            }
        </td>
        <td className="text-right p-2"><FormattedNumericValue value={account.totalValue}/></td>
        <td className="text-center p-2"><StatusBadge type="account" status={account.status}/></td>
        <td className="text-right p-2 pr-4">
             <Button size="sm" onClick={() => onOpenHub(account.id, 'registrar')}>
                <Send className="mr-2 h-4 w-4"/>
                Registrar
            </Button>
        </td>
      </tr>

      {isExpanded && (
        <tr>
          <td colSpan={8} className="p-0 border-t-2 border-primary/50">
             <LazyHistory accountId={account.id} />
          </td>
        </tr>
      )}
    </React.Fragment>
  );
}
