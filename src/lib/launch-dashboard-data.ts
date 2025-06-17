
import type { Kpi, StrategicObjective } from "@/types";
import { TrendingUp, Users, Briefcase, CalendarPlus } from "lucide-react";

// Datos de KPI para el lanzamiento del producto
// These currentValue fields will be mutated by the order form.
export const kpiDataLaunch: Kpi[] = [
  { id: 'kpi1', title: 'Ventas Totales', currentValue: 0, targetValue: 50000, unit: 'botellas', icon: TrendingUp },
  { id: 'kpi2', title: 'Ventas del Equipo', currentValue: 0, targetValue: 27000, unit: 'botellas', icon: Users },
  { id: 'kpi3', title: 'Cuentas Nuevas Equipo (Anual)', currentValue: 0, targetValue: 230, unit: 'cuentas', icon: Briefcase },
  { id: 'kpi4', title: 'Cuentas Nuevas Equipo (Mensual)', currentValue: 0, targetValue: 32, unit: 'cuentas', icon: CalendarPlus },
];

export const objetivoTotalVentasEquipo = kpiDataLaunch.find(kpi => kpi.id === 'kpi2')!.targetValue;
export const objetivoTotalCuentasEquipoAnual = kpiDataLaunch.find(kpi => kpi.id === 'kpi3')!.targetValue;

export const mockStrategicObjectives: StrategicObjective[] = [
  { id: 'obj1', text: 'Expandirse al nuevo mercado de la región Sur para Q4.', completed: false },
  { id: 'obj2', text: 'Aumentar el promedio de botellas por pedido en un 10% en Q3.', completed: true },
  { id: 'obj3', text: 'Lanzar nueva línea de productos premium (botellas especiales) para fin de año.', completed: false },
  { id: 'obj4', text: 'Alcanzar una tasa de satisfacción del cliente del 95%.', completed: false },
  { id: 'obj5', text: 'Optimizar la cadena de suministro para reducir costes de envío en un 5%.', completed: false },
  { id: 'obj6', text: 'Implementar un programa de fidelización de clientes HORECA para Q2.', completed: true },
];
