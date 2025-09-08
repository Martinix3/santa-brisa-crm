
'use client';

import * as React from 'react';
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import type { Account } from '@/types';
import { cn } from '@/lib/utils';
import { getAccountHistory } from '@/app/(app)/accounts/actions'; // Asumiendo que esta acción existe

type HistoryItem = {
  id: string;
  kind?: 'order' | 'interaction';
  date: string;          // ISO
  title?: string;
  amount?: number;       // si es pedido
  note?: string;         // si es interacción
  status?: string;
};

function LazyHistory({ accountId }: { accountId: string }) {
  const [loading, setLoading] = React.useState(true);
  const [history, setHistory] = React.useState<HistoryItem[] | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await getAccountHistory(accountId);
        if (!cancelled) setHistory(data as HistoryItem[]);
      } catch {
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

  return (
    <div className="p-2 bg-muted/20">
      <ul className="space-y-1">
        {history.map(item => (
          <li key={item.id} className="grid grid-cols-12 items-center rounded-lg bg-background p-2 text-xs">
            <span className="col-span-2 text-muted-foreground">
              {new Date(item.date).toLocaleDateString('es-ES')}
            </span>
            <span className={cn(
              'col-span-2 rounded px-2 py-0.5 w-fit',
              item.kind === 'order' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
            )}>
              {item.kind === 'order' ? 'Pedido' : 'Interacción'}
            </span>
            <span className="col-span-4 truncate">{item.title ?? item.note ?? '—'}</span>
            <span className="col-span-2 text-right tabular-nums">
              {typeof item.amount === 'number' ? `${item.amount.toFixed(2)} €` : '—'}
            </span>
            <span className="col-span-2 text-right text-xs text-muted-foreground">
              {item.status ?? '—'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}


export function AccountRow({
  account,
}: {
  account: Account;
}) {
  const [expanded, setExpanded] = React.useState(false);
  
  return (
    <React.Fragment>
      <tr className="group">
        <td className="w-8">
          <button
            aria-label={expanded ? 'Contraer' : 'Expandir'}
            className="p-1 rounded hover:bg-muted"
            onClick={() => setExpanded(v => !v)}
          >
            {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </button>
        </td>
        <td className="font-medium">{account.name}</td>
        <td className="text-muted-foreground">{account.city ?? '--'}</td>
        <td>{/* próxima tarea, estado, etc. */}</td>
        <td className="text-right">{/* valor total */}</td>
        <td className="text-right">{/* acciones (Registrar, etc.) */}</td>
      </tr>

      {expanded && (
        <tr>
          <td colSpan={6} className="bg-muted/30 p-0">
             <LazyHistory accountId={account.id} />
          </td>
        </tr>
      )}
    </React.Fragment>
  );
}
