
import type { Kpi } from "@/types";
import { TrendingUp, Users, Briefcase, CalendarPlus } from "lucide-react";

// Datos de KPI para el lanzamiento del producto
export const kpiDataLaunch: Kpi[] = [
  { id: 'kpi1', title: 'Ventas Totales', currentValue: 18500, targetValue: 50000, unit: 'botellas', icon: TrendingUp },
  { id: 'kpi2', title: 'Ventas del Equipo', currentValue: 11200, targetValue: 27000, unit: 'botellas', icon: Users },
  { id: 'kpi3', title: 'Cuentas Nuevas Equipo (Anual)', currentValue: 95, targetValue: 230, unit: 'cuentas', icon: Briefcase },
  { id: 'kpi4', title: 'Cuentas Nuevas Equipo (Mensual)', currentValue: 12, targetValue: 32, unit: 'cuentas', icon: CalendarPlus },
];

// Datos para el gráfico de barras "Distribución de Ventas"
// Ventas Totales Actuales: 18,500
// Ventas Equipo Actuales: 11,200
const ventasEquipoActuales = 11200;
const ventasTotalesActuales = 18500;
const restoCanalesVentas = ventasTotalesActuales - ventasEquipoActuales;

export const ventasDistribucionData = [
  { name: "Ventas Equipo", value: ventasEquipoActuales, fill: "hsl(var(--primary))" },
  { name: "Resto Canales", value: restoCanalesVentas, fill: "hsl(var(--brand-turquoise-hsl))" },
];

// Datos para el gráfico de dona "Progreso Ventas del Equipo"
// Objetivo Ventas Equipo: 27,000
// Ventas Equipo Actuales: 11,200
const objetivoVentasEquipo = 27000;
const faltanteVentasEquipo = objetivoVentasEquipo - ventasEquipoActuales;

export const progresoVentasEquipoData = [
  { name: "Alcanzado", value: ventasEquipoActuales, color: "hsl(var(--brand-turquoise-hsl))" },
  { name: "Faltante", value: faltanteVentasEquipo, color: "hsl(var(--muted))" },
];
export const objetivoTotalVentasEquipo = objetivoVentasEquipo;


// Datos para el gráfico de dona "Progreso Cuentas del Equipo (Anual)"
// Objetivo Cuentas Equipo: 230
// Cuentas Equipo Actuales: 95
const cuentasEquipoActualesAnual = 95;
const objetivoCuentasEquipoAnual = 230;
const faltanteCuentasEquipoAnual = objetivoCuentasEquipoAnual - cuentasEquipoActualesAnual;

export const progresoCuentasEquipoData = [
  { name: "Alcanzado", value: cuentasEquipoActualesAnual, color: "hsl(var(--brand-turquoise-hsl))" },
  { name: "Faltante", value: faltanteCuentasEquipoAnual, color: "hsl(var(--muted))" },
];
export const objetivoTotalCuentasEquipoAnual = objetivoCuentasEquipoAnual;
