
export type UserRole = 'Admin' | 'SalesRep' | 'Distributor';

export interface Kpi {
  id: string;
  title: string;
  currentValue: number;
  targetValue: number;
  unit: string; // e.g., "botellas", "cuentas"
  icon?: React.ElementType;
}

export interface StrategicObjective {
  id: string;
  text: string;
  completed: boolean;
}

export interface TeamMember {
  id: string;
  name: string;
  avatarUrl: string;
  role: string;
  bottlesSold: number;
  monthlyTarget: number;
  orders: number;
  visits: number;
  performanceData: { month: string; bottles: number }[];
}

export type OrderStatus = 'Pendiente' | 'Confirmado' | 'Procesando' | 'Enviado' | 'Entregado' | 'Cancelado' | 'Fallido';

export interface Order {
  id: string;
  clientName: string;
  visitDate: string; // Should be YYYY-MM-DD
  products: string[];
  value: number;
  status: OrderStatus;
  salesRep: string;
  lastUpdated: string; // Should be YYYY-MM-DD

  // Customer and billing information
  nombreFiscal?: string;
  cif?: string;
  direccionFiscal?: string;
  direccionEntrega?: string;
  contactoNombre?: string;
  contactoCorreo?: string;
  contactoTelefono?: string;
  observacionesAlta?: string;
  notes?: string; // General notes for the visit/order
}

export type MarketingResourceType = 'Folleto' | 'Presentación' | 'Imagen' | 'Guía';

export interface MarketingResource {
  id: string;
  title: string;
  description: string;
  link: string;
  type: MarketingResourceType;
}

export interface MarketingResourceCategory {
  id: string;
  name: string;
  resources: MarketingResource[];
}
