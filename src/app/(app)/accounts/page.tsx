
"use client";
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BarChart, Users, ShoppingCart, Briefcase, Megaphone, Settings, Plus, Search, Filter, MapPin, Phone, Mail, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import type { EnrichedAccount, TeamMember } from "@/types";
import { getCarteraBundle } from "@/features/accounts/repo";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import AccountDialog from "@/features/accounts/components/account-dialog";
import { MultiSelect } from "@/components/ui/multi-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CANALES, TIPOS_CUENTA } from "@ssot";
import { startOfDay, isBefore, isEqual, parseISO, isValid } from 'date-fns';

// Helpers
const clsx = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(" ");
const hexToRgba = (hex: string, a: number) => { const h = hex.replace('#',''); const f = h.length === 3 ? h.split('').map(c=>c+c).join('') : h; const n = parseInt(f,16); const r=(n>>16)&255, g=(n>>8)&255, b=n&255; return `rgba(${r},${g},${b},${a})`; };

// Header agua rápido (puedes omitir si usas sb-header + --sb-water)
const waterHeader = (seed = "hdr", base = "#F7D15F") => {
  const hash = Array.from(seed).reduce((s,c)=> (s*33+c.charCodeAt(0))>>>0,5381);
  let a = hash||1; const rnd = ()=> (a = (a*1664525+1013904223)>>>0, (a>>>8)/16777216);
  const L:string[]=[]; const blobs = 4;
  const rgba=(h:string,x:number)=>{ const H=h.replace('#',''); const F=H.length===3?H.split('').map(c=>c+c).join(''):H; const N=parseInt(F,16); const R=(N>>16)&255,G=(N>>8)&255,B=N&255; return `rgba(${R},${G},${B},${x})`; };
  for(let i=0;i<blobs;i++){
    const x = (i%2? 80+ rnd()*18 : rnd()*18).toFixed(2);
    const y = (rnd()*70+15).toFixed(2);
    const rx = 100 + rnd()*120, ry = 60 + rnd()*120;
    const a1 = 0.06 + rnd()*0.06; const a2 = a1*0.5; const s1=45+rnd()*10, s2=70+rnd()*12;
    L.push(`radial-gradient(${rx}px ${ry}px at ${x}% ${y}%, ${rgba(base,a1)}, ${rgba(base,a2)} ${s1}%, rgba(255,255,255,0) ${s2}%)`);
  }
  L.push(`linear-gradient(to bottom, ${rgba(base,0.08)}, rgba(255,255,255,0.02))`);
  return L.join(',');
};

function Badge({color, text}:{color:string; text:string}){
  const bg = hexToRgba(color,0.12), brd = hexToRgba(color,0.45);
  return (
    <span className="relative inline-flex items-center gap-1.5 px-2 py-0.5 text-xs rounded-md" style={{background:bg,border:`1px solid ${brd}`,color:"#24323"}}>
      {text}
    </span>
  );
}

export default function AccountsPageDropIn(){
  const { userRole } = useAuth();
  const { toast } = useToast();
  
  const [enrichedAccounts, setEnrichedAccounts] = React.useState<EnrichedAccount[]>([]);
  const [teamMembers, setTeamMembers] = React.useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Dialog state
  const [isAccountDialogOpen, setAccountDialogOpen] = React.useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = React.useState("");
  const [responsibleFilter, setResponsibleFilter] = React.useState("Todos");
  const [bucketFilter, setBucketFilter] = React.useState<"Todos" | "Vencidas" | "Para Hoy">("Todos");
  const [channelFilter, setChannelFilter] = React.useState<string[]>([]);
  
  const isAdmin = userRole === 'Admin';
  const salesAndAdminMembers = teamMembers.filter(m => m.role === 'Admin' || m.role === 'Ventas');
  
  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { enrichedAccounts, teamMembers: members } = await getCarteraBundle();
      setEnrichedAccounts(enrichedAccounts);
      setTeamMembers(members);
    } catch (err: any) {
      console.error("Error fetching data:", err);
      setError("No se pudieron cargar los datos de las cuentas. Por favor, inténtalo de nuevo más tarde.");
      toast({
          title: "Error de Red",
          description: err.message || "Error al conectar con el servidor.",
          variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);
  
  const grupos = {
    Activas: { color: '#A7D8D9', data: [] as EnrichedAccount[] },
    Seguimiento: { color: '#F7D15F', data: [] as EnrichedAccount[] },
    Potenciales: { color: '#559091', data: [] as EnrichedAccount[] },
    Fallidas: { color: '#E25B52', data: [] as EnrichedAccount[] },
  } as const;

  const filteredCuentas = useMemo(() => {
    const todayStart = startOfDay(new Date());

    return enrichedAccounts
      .filter(acc => !searchTerm || acc.name.toLowerCase().includes(searchTerm.toLowerCase()) || (acc.city && acc.city.toLowerCase().includes(searchTerm.toLowerCase())))
      .filter(acc => channelFilter.length === 0 || (acc.channel && channelFilter.includes(acc.channel)))
      .filter(acc => !isAdmin || responsibleFilter === "Todos" || acc.responsableId === responsibleFilter)
      .filter(acc => {
        if (bucketFilter === 'Todos') return true;
        const nextActionDate = acc.nextInteraction?.status === 'Programada' ? (acc.nextInteraction.visitDate ? parseISO(acc.nextInteraction.visitDate) : null) : (acc.nextInteraction?.nextActionDate ? parseISO(acc.nextInteraction.nextActionDate) : null);
        if (!nextActionDate || !isValid(nextActionDate)) return false;
        if (bucketFilter === 'Vencidas') return isBefore(nextActionDate, todayStart);
        if (bucketFilter === 'Para Hoy') return isEqual(startOfDay(nextActionDate), todayStart);
        return false;
      });
  }, [searchTerm, channelFilter, enrichedAccounts, responsibleFilter, bucketFilter, isAdmin]);

  filteredCuentas.forEach(c => {
    if (c.status === 'Activo' || c.status === 'Repetición' || c.status === 'Inactivo') grupos.Activas.data.push(c);
    else if (c.status === 'Seguimiento' || c.status === 'Programada') grupos.Seguimiento.data.push(c);
    else if (c.status === 'Pendiente') grupos.Potenciales.data.push(c);
    else if (c.status === 'Fallido') grupos.Fallidas.data.push(c);
  });

  const headerBG = waterHeader('sb:accounts');

  return (
    <div className="sb-theme flex-1 flex flex-col min-w-0">
        <header className="relative border-b border-zinc-200 shadow-sm" style={{background: headerBG}}>
          <div className="px-sb6 py-sb3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg" style={{background:'var(--sb-primary)'}}/>
              <div className="font-semibold">Cuentas</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="h-4 w-4 text-zinc-600 absolute left-3 top-1/2 -translate-y-1/2"/>
                <Input value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder="Buscar…" className="sb-input pl-9 pr-3"/>
              </div>
              <Button onClick={()=>setAccountDialogOpen(true)} className="sb-btn sb-btn--solid"><Plus className="h-4 w-4"/>Nueva cuenta</Button>
              <MultiSelect
                options={CANALES.map(c => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }))}
                selected={channelFilter}
                onChange={setChannelFilter}
                className="w-[200px]"
                placeholder="Canal..."
              />
            </div>
          </div>
        </header>

        <main className="p-sb6 space-y-sb6">
          <div className="flex items-center gap-sb2 text-xs">
            {Object.entries(grupos).map(([key, {color}]) => (
              <Badge key={key} color={color} text={key} />
            ))}
          </div>
          
          <section className="sb-table">
             <div className="grid grid-cols-[1.3fr_1fr_1fr_1fr] gap-3 px-4 py-2 text-[11px] uppercase tracking-wide text-zinc-500 border-b bg-white rounded-t-2xl">
              <span>Cuenta</span><span>Ubicación</span><span>Tipo</span><span className="text-right">Contacto</span>
            </div>
            {isLoading ? (
              <div><Loader2 className="animate-spin m-4" /></div>
            ) : error ? (
              <div className="p-4"><AlertCircle className="inline-block mr-2" />{error}</div>
            ) : Object.entries(grupos).map(([groupName, { color, data }]) => (
                data.length > 0 && (
                  <React.Fragment key={groupName}>
                     <div className="grid grid-cols-1 px-4 py-2 text-sm font-bold text-gray-800" style={{background: hexToRgba(color, 0.1)}}>
                       {groupName}
                     </div>
                     {data.map((c, i) => (
                         <div key={c.id} className={clsx("grid grid-cols-[1.3fr_1fr_1fr_1fr] items-center gap-3 px-4 py-3 border-b hover:bg-zinc-50")} style={{background: hexToRgba(color, 0.04), borderColor: hexToRgba(color,0.15)}}>
                           <div className="min-w-0">
                             <Link href={`/accounts/${c.id}`} className="truncate text-sm font-medium hover:underline text-primary">{c.name}</Link>
                             <div className="text-xs text-zinc-500">{c.status}</div>
                           </div>
                           <div className="text-sm text-zinc-700 flex items-center gap-2"><MapPin className="h-4 w-4"/>{c.city}, {c.country}</div>
                           <div className="text-sm text-zinc-700">{c.type}</div>
                           <div className="text-sm text-zinc-700 flex items-center justify-end gap-4">
                             <a className="inline-flex items-center gap-1 hover:underline" href={`tel:${c.mainContactPhone}`}><Phone className="h-4 w-4"/>{c.mainContactPhone || '-'}</a>
                             <a className="inline-flex items-center gap-1 hover:underline" href={`mailto:${c.mainContactEmail}`}><Mail className="h-4 w-4"/>{c.mainContactEmail || '-'}</a>
                           </div>
                         </div>
                     ))}
                  </React.Fragment>
                )
            ))}
          </section>
        </main>
        <AccountDialog
          open={isAccountDialogOpen}
          onOpenChange={setAccountDialogOpen}
          initial={null}
          onSaved={() => loadData()}
        />
    </div>
  );
}
