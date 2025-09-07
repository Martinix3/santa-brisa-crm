
"use client";

import React, { useEffect, useMemo } from "react";
import { Sparkles, Check, Calendar, Briefcase, Megaphone, FileText, User, ChevronDown, Search } from "lucide-react";

// === Helpers ===
const clsx = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(" ");
const hexToRgba = (hex: string, a: number) => {
  const h = hex.replace('#','');
  const f = h.length === 3 ? h.split('').map(c=>c+c).join('') : h;
  const n = parseInt(f,16); const r=(n>>16)&255, g=(n>>8)&255, b=n&255; return `rgba(${r},${g},${b},${a})`;
};

// Irregular water-like header gradient (very light)
const waterHeader = (seed = "hdr", base = "#F7D15F") => {
  const hash = Array.from(seed).reduce((s,c)=> (s*33+c.charCodeAt(0))>>>0,5381);
  let a = hash||1; const rnd = ()=> (a = (a*1664525+1013904223)>>>0, (a>>>8)/16777216);
  const L:string[]=[];
  const blobs = 4;
  for(let i=0;i<blobs;i++){
    const x = (i%2? 80+ rnd()*18 : rnd()*18).toFixed(2);
    const y = (rnd()*70+15).toFixed(2);
    const rx = 100 + rnd()*120, ry = 60 + rnd()*120;
    const a1 = 0.06 + rnd()*0.06; const a2 = a1*0.5; const s1=45+rnd()*10, s2=70+rnd()*12;
    L.push(`radial-gradient(${rx}px ${ry}px at ${x}% ${y}%, ${hexToRgba(base,a1)}, ${hexToRgba(base,a2)} ${s1}%, rgba(255,255,255,0) ${s2}%)`);
  }
  L.push(`linear-gradient(to bottom, ${hexToRgba(base,0.08)}, rgba(255,255,255,0.02))`);
  return L.join(',');
};

// Agave edge (white spikes)
function AgaveEdge(){
  const cfg = useMemo(() => {
    const W = 600, H=14; let seed=0xa94f1c2b; const rnd = ()=> (seed=(seed*1664525+1013904223)>>>0, (seed>>>8)/16777216);
    const mk=(dense:boolean)=>{ const arr: any[]=[]; let x=0; while(x<W){ const w = dense? (1+Math.floor(rnd()*2)) : (2+Math.floor(rnd()*2)); const h = dense? (4+Math.floor(rnd()*5)) : (8+Math.floor(rnd()*7)); const dir = rnd()<0.5?-1:1; const skew = dir*(dense? 0.18*h:0.08*h); arr.push({x,w,h,skew}); x+=w; } return arr; };
    return {W,H,back:mk(false),front:mk(true)}
  },[]);
  return (
    <svg className="h-3 w-full" viewBox={`0 0 ${cfg.W} ${cfg.H}`} preserveAspectRatio="none" aria-hidden>
      {cfg.back.map((p: any,i: number)=> <polygon key={`b-${i}`} fill="#fff" points={`${p.x},${cfg.H} ${p.x+p.w/2+p.skew},${Math.max(0,cfg.H-p.h)} ${p.x+p.w},${cfg.H}`} />)}
      {cfg.front.map((p: any,i: number)=> <polygon key={`f-${i}`} fill="#fff" points={`${p.x},${cfg.H} ${p.x+p.w/2+p.skew},${Math.max(0,cfg.H-p.h)} ${p.x+p.w},${cfg.H}`} />)}
    </svg>
  );
}

// Chips con picos (agave)
const icons = { ventas: Briefcase, marketing: Megaphone, administracion: FileText, personal: User } as const;
function AgaveChip({color, text, icon:Icon=User}:{color:string; text:string; icon?:any}){
  const bg = hexToRgba(color,0.12), brd = hexToRgba(color,0.45), deco = hexToRgba(color,0.28);
  return (
    <span className="relative inline-flex items-center gap-1.5 px-2 py-0.5 text-xs rounded-md" style={{background:bg,border:`1px solid ${brd}`,color:"#24323"}}>
      <Icon className="h-3.5 w-3.5"/>
      {text}
      <svg className="absolute left-0 right-0 bottom-[-1px] h-2 w-full" viewBox="0 0 100 8" preserveAspectRatio="none">
        <polygon points="0,8 2.5,6 5,8 7.5,6 10,8 12.5,6 15,8 17.5,6 20,8 22.5,6 25,8 27.5,6 30,8 32.5,6 35,8 37.5,6 40,8 42.5,6 45,8 47.5,6 50,8 52.5,6 55,8 57.5,6 60,8 62.5,6 65,8 67.5,6 70,8 72.5,6 75,8 77.5,6 80,8 82.5,6 85,8 87.5,6 90,8 92.5,6 95,8 97.5,6 100,8" fill={deco}/>
      </svg>
    </span>
  );
}

// Buttons
function SBButton({variant='solid', children}:{variant?:'solid'|'outline'|'subtle';children:React.ReactNode}){
  return (
    <button className={clsx(
      'px-3 py-2 rounded-lg text-sm transition',
      variant==='solid' && 'bg-[var(--sb-primary)] text-zinc-900 hover:brightness-95',
      variant==='outline' && 'border border-zinc-300 text-zinc-800 hover:bg-white',
      variant==='subtle' && 'bg-zinc-50 text-zinc-800 hover:bg-zinc-100'
    )}>{children}</button>
  );
}

// Card con cabecera agua
function SBCard({title,children}:{title:string;children:React.ReactNode}){
  const bg = waterHeader('card:'+title);
  return (
    <div className="rounded-2xl border border-zinc-200 overflow-hidden bg-white">
      <div className="px-4 py-2.5 border-b" style={{background:bg, borderColor:'rgba(247,209,95,0.18)'}}>
        <div className="text-sm font-medium text-zinc-800">{title}</div>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

// Table sample
function SampleTable(){
  const rows = Array.from({length:4},(_,i)=>({name:`Cuenta #${i+1}`, city:i%2?'Madrid':'Valencia', value:(320+i*42).toFixed(2)+' €'}));
  return (
    <div className="rounded-2xl border border-zinc-200 overflow-hidden">
      <div className="grid grid-cols-[1.4fr_1fr_0.8fr] gap-3 px-4 py-2 text-[11px] uppercase tracking-wide text-zinc-500 border-b bg-white"> 
        <span>Cuenta</span><span>Ciudad</span><span className="text-right">Valor</span>
      </div>
      {rows.map((r,i)=> (
        <div key={i} className="grid grid-cols-[1.4fr_1fr_0.8fr] items-center gap-3 px-4 py-2 border-b border-zinc-100 hover:bg-zinc-50">
          <div className="truncate text-sm text-zinc-900 font-medium">{r.name}</div>
          <div className="text-sm text-zinc-600">{r.city}</div>
          <div className="text-sm text-zinc-900 text-right">{r.value}</div>
        </div>
      ))}
    </div>
  );
}

// Search input
function SearchInput(){
  return (
    <div className="relative w-full max-w-sm">
      <Search className="h-4 w-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2"/>
      <input className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-[var(--sb-primary)]" placeholder="Buscar…"/>
    </div>
  );
}

const CustomUiStyles = () => (
  <style jsx global>{`
    :root {
      --sb-primary: #F7D15F;
      --sb-sec-1: #D7713E;
      --sb-sec-2: #A7D8D9;
      --sb-sec-3: #618E8F;
      --sb-fg-900: #0f172a;
      --sb-fg-700: #3f4a5a;
      --sb-fg-600: #525e71;
      --sb-b-100: #eef1f5;
      --sb-b-200: #e5e8ee;
      --sb-b-300: #d8dde6;
      --sb-white: #ffffff;
      --sb-water-base: 247,209,95;
      --sb-radius: 16px;
      --sb-radius-md: 12px;
      --sb-radius-lg: 20px;
      --sb-shadow-sm: 0 1px 2px rgba(15,23,42,.06);
      --sb-shadow-md: 0 8px 24px rgba(15,23,42,.08);
    }
  `}</style>
);


export default function SantaBrisaUIKit(){
  return (
    <>
      <CustomUiStyles />
      <div className="min-h-screen bg-white">
        {/* Header de marca */}
        <div className="relative border-b border-zinc-200" style={{background: `linear-gradient(90deg, var(--sb-primary) 0, var(--sb-primary) 200px, rgba(247,209,95,0) 450px)`}}>
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl" style={{background:'var(--sb-primary)'}}/>
              <div className="font-semibold text-zinc-900">Santa Brisa · UI Kit</div>
            </div>
            <div className="text-xs text-zinc-600">Preview</div>
          </div>
          <div className="absolute left-0 right-0 -bottom-[1px]"><AgaveEdge/></div>
        </div>

        <main className="p-4 md:p-6 space-y-6">
          {/* Tokens */}
          <section>
            <div className="text-xs uppercase tracking-wide text-zinc-500 mb-2">Colores de marca</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[['Primario','var(--sb-primary)'],['Naranja','#D7713E'],['Aqua','#A7D8D9'],['Teal','#618E8F']].map(([name,val])=> (
                <div key={name} className="rounded-xl border border-zinc-200 overflow-hidden">
                  <div className="h-16" style={{background: `linear-gradient(180deg, ${val} 0%, ${hexToRgba(String(val),0.85)} 70%, ${hexToRgba(String(val),0.6)} 100%)`}}/>
                  <div className="px-3 py-2 text-sm flex items-center justify-between"><span>{name}</span><code className="text-xs text-zinc-500">{String(val)}</code></div>
                </div>
              ))}
            </div>
          </section>

          {/* Componentes base */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SBCard title="Botones">
              <div className="flex flex-wrap items-center gap-2">
                <SBButton>Primario</SBButton>
                <SBButton variant="outline">Outline</SBButton>
                <SBButton variant="subtle">Subtle</SBButton>
                <button className="px-3 py-2 rounded-lg text-sm bg-[var(--sb-sec-1)] text-white hover:brightness-95">Secundario</button>
              </div>
            </SBCard>

            <SBCard title="Inputs">
              <div className="space-y-3">
                <SearchInput/>
                <div className="flex items-center gap-2">
                  <select className="px-3 py-2 rounded-lg text-sm border border-zinc-300 bg-white">
                    <option>Seleccione</option>
                    <option>Opción A</option>
                  </select>
                  <button className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm border border-zinc-300 bg-white"><Calendar className="h-4 w-4"/>Fecha</button>
                  <button className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm border border-zinc-300 bg-white">Filtro<ChevronDown className="h-4 w-4"/></button>
                </div>
              </div>
            </SBCard>

            <SBCard title="Chips / Estado">
              <div className="flex flex-wrap gap-2">
                <AgaveChip color="#D7713E" text="Ventas" icon={icons.ventas}/>
                <AgaveChip color="#A7D8D9" text="Marketing" icon={icons.marketing}/>
                <AgaveChip color="#618E8F" text="Administración" icon={icons.administracion}/>
                <AgaveChip color="#F7D15F" text="Personal" icon={icons.personal}/>
              </div>
            </SBCard>

            <SBCard title="Tabla / Lista">
              <SampleTable/>
            </SBCard>
          </section>

          {/* Piezas de identidad */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SBCard title="Card con cabecera agua">
              <div className="text-sm text-zinc-700">Cabecera con reflejo de agua irregular, centro claro y bordes activos.</div>
            </SBCard>
            <SBCard title="CTA estilo sello">
              <button className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--sb-primary)] text-zinc-900 shadow-sm hover:brightness-95"><Sparkles className="h-4 w-4"/>Acción principal</button>
            </SBCard>
          </section>

          {/* Mini calendario sample */}
          <section>
            <SBCard title="Leyenda Agenda (chips agave)">
              <div className="flex flex-wrap gap-2">
                <AgaveChip color="#D7713E" text="Ventas" icon={icons.ventas}/>
                <AgaveChip color="#A7D8D9" text="Marketing" icon={icons.marketing}/>
                <AgaveChip color="#618E8F" text="Administración" icon={icons.administracion}/>
                <AgaveChip color="#F7D15F" text="Personal" icon={icons.personal}/>
              </div>
            </SBCard>
          </section>
        </main>
      </div>
    </>
  );
}
