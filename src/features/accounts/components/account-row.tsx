
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
import { TableCell, TableRow } from '@/components/ui/table';
import { Send } from 'lucide-react';
import Link from 'next/link';

function LazyHistory({ accountId, accountName }: { accountId: string; accountName: string }) {
  const [loading, setLoading] = React.useState(true);
  const [history, setHistory] = React.useState<Order[] | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/accounts/history?accountId=${accountId}&accountName=${encodeURIComponent(accountName)}`);
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
  }, [accountId, accountName]);

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
  className,
  tdClassName,
  style,
}: {
  account: EnrichedAccount;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onOpenHub: (accountId: string, mode: 'registrar' | 'editar' | 'pedido') => void;
  className?: string;
  tdClassName?: string;
  style?: React.CSSProperties;
}) {
  const nextInteractionDate = account.nextInteraction?.status === 'Programada'
    ? account.nextInteraction.visitDate
    : account.nextInteraction?.nextActionDate;

  return (
    <React.Fragment>
      <TableRow className={cn("group", className, isExpanded && "bg-muted/50")} style={style}>
        <TableCell className={cn("w-8 pl-2", tdClassName)}>
          <Button
            aria-label={isExpanded ? 'Contraer' : 'Expandir'}
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={onToggleExpand}
          >
            {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </Button>
        </TableCell>
        <TableCell className={cn("font-medium p-2", tdClassName)}>
            <Link href={`/accounts/${account.id}`} className="hover:underline text-primary">
                {account.name}
            </Link>
            <p className="text-xs text-muted-foreground">{account.city ?? '--'}</p>
        </TableCell>
        <TableCell className={cn("p-2", tdClassName)}>{account.responsableName || 'N/A'}</TableCell>
        <TableCell className={cn("p-2 text-sm", tdClassName)}>
            {account.lastInteractionDate && isValid(parseISO(account.lastInteractionDate))
                ? format(parseISO(account.lastInteractionDate), 'dd MMM yyyy', {locale: es})
                : 'Nunca'
            }
        </TableCell>
        <TableCell className={cn("p-2 text-sm", tdClassName)}>
            {nextInteractionDate && isValid(parseISO(nextInteractionDate))
                ? format(parseISO(nextInteractionDate), 'dd MMM yyyy', {locale: es})
                : 'No programada'
            }
        </TableCell>
        <TableCell className={cn("text-right p-2", tdClassName)}><FormattedNumericValue value={account.totalValue}/></TableCell>
        <TableCell className={cn("text-center p-2", tdClassName)}><StatusBadge type="account" status={account.status}/></TableCell>
        <TableCell className={cn("text-right p-2 pr-4", tdClassName)}>
             <Button size="sm" onClick={() => onOpenHub(account.id, 'registrar')}>
                <Send className="mr-2 h-4 w-4"/>
                    Registrar
                </Button>
            </TableCell>
      </TableRow>

      {isExpanded && (
        <TableRow style={style}>
          <TableCell colSpan={8} className="p-0 border-t-2 border-primary/50">
             <LazyHistory accountId={account.id} accountName={account.name} />
          </TableCell>
        </TableRow>
      )}
    </React.Fragment>
  );
}
