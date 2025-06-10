export interface Kpi {
  id: string;
  title: string;
  value: string;
  icon?: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  colorClass?: string; 
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
  bottlesSold: number; // Cambiado de sales a bottlesSold
  orders: number;
  visits: number;
  performanceData: { month: string; bottles: number }[]; // Cambiado de sales a bottles
}

export type OrderStatus = 'Pendiente' | 'Confirmado' | 'Enviado' | 'Procesando' | 'Entregado' | 'Cancelado' | 'Fallido';

export interface Order {
  id: string;
  clientName: string;
  visitDate: string;
  products: string[];
  value: number; // Esto sigue siendo valor monetario del pedido
  status: OrderStatus;
  salesRep: string;
  lastUpdated: string;
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
