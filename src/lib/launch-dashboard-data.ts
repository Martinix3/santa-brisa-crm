
import type { Kpi, StrategicObjective } from "@/types"; // Added StrategicObjective
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


// Moved from lib/data.ts to be co-located with other dashboard data sources
// This helps if we want to show them on the dashboard itself.
export const mockStrategicObjectives: StrategicObjective[] = [
  { id: 'obj1', text: 'Expandirse al nuevo mercado de la región Sur para Q4.', completed: false },
  { id: 'obj2', text: 'Aumentar el promedio de botellas por pedido en un 10% en Q3.', completed: true },
  { id: 'obj3', text: 'Lanzar nueva línea de productos premium (botellas especiales) para fin de año.', completed: false },
  { id: 'obj4', text: 'Alcanzar una tasa de satisfacción del cliente del 95%.', completed: false },
  { id: 'obj5', text: 'Optimizar la cadena de suministro para reducir costes de envío en un 5%.', completed: false },
  { id: 'obj6', text: 'Implementar un programa de fidelización de clientes HORECA para Q2.', completed: true },
];

// The following data structures will be built inside the dashboard component
// to ensure they use the latest, potentially mutated, kpiDataLaunch values.
/*
export const ventasDistribucionData = [...] 
export const progresoVentasEquipoData = [...]
export const progresoCuentasEquipoData = [...]
*/
