export interface Kpi {
  id: string;
  title: string;
  value: string;
  icon?: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  colorClass?: string; // e.g., 'text-brand-yellow'
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
  sales: number;
  orders: number;
  visits: number;
  performanceData: { month: string; sales: number }[];
}

export type OrderStatus = 'Pending' | 'Confirmed' | 'Shipped' | 'Processing' | 'Delivered' | 'Cancelled' | 'Failed';

export interface Order {
  id: string;
  clientName: string;
  visitDate: string;
  products: string[];
  value: number;
  status: OrderStatus;
  salesRep: string;
  lastUpdated: string;
}

export interface MarketingResource {
  id: string;
  title: string;
  description: string;
  link: string;
  type: 'Brochure' | 'Presentation' | 'Image' | 'Guideline';
}

export interface MarketingResourceCategory {
  id: string;
  name: string;
  resources: MarketingResource[];
}
