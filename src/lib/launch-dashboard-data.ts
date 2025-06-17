
import type { Kpi } from "@/types";
import { TrendingUp, Users, Briefcase, CalendarPlus } from "lucide-react";

// Datos de KPI para el lanzamiento del producto
// These currentValue fields will be mutated by the order form.
export const kpiDataLaunch: Kpi[] = [
  { id: 'kpi1', title: 'Ventas Totales', currentValue: 18500, targetValue: 50000, unit: 'botellas', icon: TrendingUp },
  { id: 'kpi2', title: 'Ventas del Equipo', currentValue: 11200, targetValue: 27000, unit: 'botellas', icon: Users },
  { id: 'kpi3', title: 'Cuentas Nuevas Equipo (Anual)', currentValue: 95, targetValue: 230, unit: 'cuentas', icon: Briefcase },
  { id: 'kpi4', title: 'Cuentas Nuevas Equipo (Mensual)', currentValue: 12, targetValue: 32, unit: 'cuentas', icon: CalendarPlus },
];

// Note: The actual data for charts like ventasDistribucionData, progresoVentasEquipoData, 
// and progresoCuentasEquipoData will now be constructed dynamically within the
// DashboardPage component, using the latest values from kpiDataLaunch.
// We still export the target values if they are needed directly.

export const objetivoTotalVentasEquipo = kpiDataLaunch.find(kpi => kpi.id === 'kpi2')!.targetValue;
export const objetivoTotalCuentasEquipoAnual = kpiDataLaunch.find(kpi => kpi.id === 'kpi3')!.targetValue;

// The following data structures will be built inside the dashboard component
// to ensure they use the latest, potentially mutated, kpiDataLaunch values.
/*
export const ventasDistribucionData = [...] 
export const progresoVentasEquipoData = [...]
export const progresoCuentasEquipoData = [...]
*/

