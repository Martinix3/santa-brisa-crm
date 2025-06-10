import type { Kpi, StrategicObjective, TeamMember, Order, MarketingResourceCategory, OrderStatus } from '@/types';
import { TrendingUp, TrendingDown, DollarSign, Users, ShoppingBag, BarChart3, CheckCircle, Target, XCircle } from 'lucide-react';

export const mockKpis: Kpi[] = [
  { id: 'kpi1', title: 'Total Sales (Month)', value: '$125,670', icon: DollarSign, trend: 'up', trendValue: '+15%', colorClass: 'text-green-500' },
  { id: 'kpi2', title: 'New Clients Acquired', value: '82', icon: Users, trend: 'up', trendValue: '+5', colorClass: 'text-green-500' },
  { id: 'kpi3', title: 'Orders Processed', value: '320', icon: ShoppingBag, trend: 'neutral', trendValue: '-2%', colorClass: 'text-yellow-500' },
  { id: 'kpi4', title: 'Conversion Rate', value: '25%', icon: BarChart3, trend: 'down', trendValue: '-1.5%', colorClass: 'text-red-500' },
];

export const mockStrategicObjectives: StrategicObjective[] = [
  { id: 'obj1', text: 'Expand to new Southern region market by Q4.', completed: false },
  { id: 'obj2', text: 'Increase average order value by 10% in Q3.', completed: true },
  { id: 'obj3', text: 'Launch new premium product line by end of year.', completed: false },
  { id: 'obj4', text: 'Achieve 95% customer satisfaction rate.', completed: false },
];

export const mockTeamMembers: TeamMember[] = [
  {
    id: 'tm1', name: 'Elena Rodriguez', avatarUrl: 'https://placehold.co/100x100.png', role: 'Senior Sales Rep',
    sales: 45200, orders: 120, visits: 250,
    performanceData: [
      { month: 'Jan', sales: 5000 }, { month: 'Feb', sales: 7000 }, { month: 'Mar', sales: 6500 },
      { month: 'Apr', sales: 8200 }, { month: 'May', sales: 9500 }, { month: 'Jun', sales: 9000 },
    ],
  },
  {
    id: 'tm2', name: 'Marcus Chen', avatarUrl: 'https://placehold.co/100x100.png', role: 'Sales Rep',
    sales: 32500, orders: 95, visits: 180,
    performanceData: [
      { month: 'Jan', sales: 4000 }, { month: 'Feb', sales: 5500 }, { month: 'Mar', sales: 5000 },
      { month: 'Apr', sales: 6200 }, { month: 'May', sales: 6800 }, { month: 'Jun', sales: 5000 },
    ],
  },
  {
    id: 'tm3', name: 'Aisha Khan', avatarUrl: 'https://placehold.co/100x100.png', role: 'Junior Sales Rep',
    sales: 18700, orders: 60, visits: 120,
    performanceData: [
      { month: 'Jan', sales: 2000 }, { month: 'Feb', sales: 2500 }, { month: 'Mar', sales: 3000 },
      { month: 'Apr', sales: 3200 }, { month: 'May', sales: 4000 }, { month: 'Jun', sales: 4000 },
    ],
  },
];

const orderStatuses: OrderStatus[] = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Failed'];
const clientNames = ['Cafe Central', 'Restaurante del Sol', 'The Daily Grind', 'Ocean View Bistro', 'Mountain Top Cafe'];
const salesReps = ['Elena Rodriguez', 'Marcus Chen', 'Aisha Khan'];

export const mockOrders: Order[] = Array.from({ length: 25 }, (_, i) => {
  const date = new Date(2024, 5 - Math.floor(i / 5), 28 - (i % 28) + 1); // Spread orders over last few months
  return {
    id: `ORD${1001 + i}`,
    clientName: clientNames[i % clientNames.length],
    visitDate: date.toISOString().split('T')[0],
    products: ['Premium Arabica Beans', 'Single Origin Robusta', 'Decaf Blend'].slice(0, Math.floor(Math.random() * 3) + 1),
    value: Math.floor(Math.random() * 500) + 50,
    status: orderStatuses[i % orderStatuses.length],
    salesRep: salesReps[i % salesReps.length],
    lastUpdated: new Date(date.getTime() + Math.random() * 5 * 24*60*60*1000).toISOString().split('T')[0],
  };
});


export const mockMarketingResources: MarketingResourceCategory[] = [
  {
    id: 'cat1', name: 'Brochures & Catalogs',
    resources: [
      { id: 'res1', title: '2024 Product Catalog', description: 'Full catalog of our coffee products.', link: '#', type: 'Brochure' },
      { id: 'res2', title: 'Premium Blends Brochure', description: 'Highlighting our top-tier coffee blends.', link: '#', type: 'Brochure' },
    ],
  },
  {
    id: 'cat2', name: 'Presentations',
    resources: [
      { id: 'res3', title: 'Sales Pitch Deck Q3 2024', description: 'Standard sales presentation.', link: '#', type: 'Presentation' },
      { id: 'res4', title: 'Sustainability Initiatives', description: 'Our commitment to ethical sourcing.', link: '#', type: 'Presentation' },
    ],
  },
  {
    id: 'cat3', name: 'Product Images',
    resources: [
      { id: 'res5', title: 'High-Res Product Shots', description: 'Gallery of product images.', link: '#', type: 'Image' },
    ],
  },
  {
    id: 'cat4', name: 'Brand Guidelines',
    resources: [
      { id: 'res6', title: 'Santa Brisa Brand Book', description: 'Official brand usage guidelines.', link: '#', type: 'Guideline' },
    ],
  },
];

export const salesData = [
  { name: 'Jan', totalSales: Math.floor(Math.random() * 50000) + 10000 },
  { name: 'Feb', totalSales: Math.floor(Math.random() * 50000) + 10000 },
  { name: 'Mar', totalSales: Math.floor(Math.random() * 50000) + 10000 },
  { name: 'Apr', totalSales: Math.floor(Math.random() * 50000) + 10000 },
  { name: 'May', totalSales: Math.floor(Math.random() * 10000) + 60000 }, // Spike in May
  { name: 'Jun', totalSales: Math.floor(Math.random() * 50000) + 10000 },
  { name: 'Jul', totalSales: Math.floor(Math.random() * 50000) + 10000 },
];
