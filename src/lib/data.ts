import type { Kpi, StrategicObjective, TeamMember, Order, MarketingResourceCategory, OrderStatus, MarketingResourceType } from '@/types';
import { DollarSign, Users, ShoppingBag, BarChart3 } from 'lucide-react';

export const mockKpis: Kpi[] = [
  { id: 'kpi1', title: 'Ventas Totales (Mes)', value: '$125,670', icon: DollarSign, trend: 'up', trendValue: '+15%', colorClass: 'text-green-500' },
  { id: 'kpi2', title: 'Nuevos Clientes Adquiridos', value: '82', icon: Users, trend: 'up', trendValue: '+5', colorClass: 'text-green-500' },
  { id: 'kpi3', title: 'Pedidos Procesados', value: '320', icon: ShoppingBag, trend: 'neutral', trendValue: '-2%', colorClass: 'text-yellow-500' },
  { id: 'kpi4', title: 'Tasa de Conversión', value: '25%', icon: BarChart3, trend: 'down', trendValue: '-1.5%', colorClass: 'text-red-500' },
];

export const mockStrategicObjectives: StrategicObjective[] = [
  { id: 'obj1', text: 'Expandirse al nuevo mercado de la región Sur para Q4.', completed: false },
  { id: 'obj2', text: 'Aumentar el valor promedio de pedido en un 10% en Q3.', completed: true },
  { id: 'obj3', text: 'Lanzar nueva línea de productos premium para fin de año.', completed: false },
  { id: 'obj4', text: 'Alcanzar una tasa de satisfacción del cliente del 95%.', completed: false },
];

export const mockTeamMembers: TeamMember[] = [
  {
    id: 'tm1', name: 'Elena Rodriguez', avatarUrl: 'https://placehold.co/100x100.png', role: 'Rep. de Ventas Senior',
    sales: 45200, orders: 120, visits: 250,
    performanceData: [
      { month: 'Enero', sales: 5000 }, { month: 'Febrero', sales: 7000 }, { month: 'Marzo', sales: 6500 },
      { month: 'Abril', sales: 8200 }, { month: 'Mayo', sales: 9500 }, { month: 'Junio', sales: 9000 },
    ],
  },
  {
    id: 'tm2', name: 'Marcus Chen', avatarUrl: 'https://placehold.co/100x100.png', role: 'Rep. de Ventas',
    sales: 32500, orders: 95, visits: 180,
    performanceData: [
      { month: 'Enero', sales: 4000 }, { month: 'Febrero', sales: 5500 }, { month: 'Marzo', sales: 5000 },
      { month: 'Abril', sales: 6200 }, { month: 'Mayo', sales: 6800 }, { month: 'Junio', sales: 5000 },
    ],
  },
  {
    id: 'tm3', name: 'Aisha Khan', avatarUrl: 'https://placehold.co/100x100.png', role: 'Rep. de Ventas Junior',
    sales: 18700, orders: 60, visits: 120,
    performanceData: [
      { month: 'Enero', sales: 2000 }, { month: 'Febrero', sales: 2500 }, { month: 'Marzo', sales: 3000 },
      { month: 'Abril', sales: 3200 }, { month: 'Mayo', sales: 4000 }, { month: 'Junio', sales: 4000 },
    ],
  },
];

const orderStatuses: OrderStatus[] = ['Pendiente', 'Confirmado', 'Procesando', 'Enviado', 'Entregado', 'Cancelado', 'Fallido'];
const clientNames = ['Café Central', 'Restaurante del Sol', 'El Rincón Diario', 'Bistró Vista al Mar', 'Café Cima de Montaña'];
const salesReps = ['Elena Rodriguez', 'Marcus Chen', 'Aisha Khan'];

export const mockOrders: Order[] = Array.from({ length: 25 }, (_, i) => {
  const date = new Date(2024, 5 - Math.floor(i / 5), 28 - (i % 28) + 1); 
  return {
    id: `ORD${1001 + i}`,
    clientName: clientNames[i % clientNames.length],
    visitDate: date.toISOString().split('T')[0],
    products: ['Granos Arábica Premium', 'Robusta Origen Único', 'Mezcla Descafeinada'].slice(0, Math.floor(Math.random() * 3) + 1),
    value: Math.floor(Math.random() * 500) + 50,
    status: orderStatuses[i % orderStatuses.length],
    salesRep: salesReps[i % salesReps.length],
    lastUpdated: new Date(date.getTime() + Math.random() * 5 * 24*60*60*1000).toISOString().split('T')[0],
  };
});

const marketingResourceTypes: MarketingResourceType[] = ['Folleto', 'Presentación', 'Imagen', 'Guía'];

export const mockMarketingResources: MarketingResourceCategory[] = [
  {
    id: 'cat1', name: 'Folletos y Catálogos',
    resources: [
      { id: 'res1', title: 'Catálogo de Productos 2024', description: 'Catálogo completo de nuestros productos de café.', link: '#', type: 'Folleto' },
      { id: 'res2', title: 'Folleto de Mezclas Premium', description: 'Destacando nuestras mezclas de café de alta gama.', link: '#', type: 'Folleto' },
    ],
  },
  {
    id: 'cat2', name: 'Presentaciones',
    resources: [
      { id: 'res3', title: 'Presentación de Ventas Q3 2024', description: 'Presentación de ventas estándar.', link: '#', type: 'Presentación' },
      { id: 'res4', title: 'Iniciativas de Sostenibilidad', description: 'Nuestro compromiso con el abastecimiento ético.', link: '#', type: 'Presentación' },
    ],
  },
  {
    id: 'cat3', name: 'Imágenes de Productos',
    resources: [
      { id: 'res5', title: 'Fotos de Productos en Alta Resolución', description: 'Galería de imágenes de productos.', link: '#', type: 'Imagen' },
    ],
  },
  {
    id: 'cat4', name: 'Guías de Marca',
    resources: [
      { id: 'res6', title: 'Manual de Marca Santa Brisa', description: 'Guías oficiales de uso de la marca.', link: '#', type: 'Guía' },
    ],
  },
];
