
import type { Kpi, StrategicObjective, TeamMember, Order, MarketingResourceCategory, OrderStatus, MarketingResourceType } from '@/types';
import { Package, Users, ShoppingBag, BarChart3 } from 'lucide-react'; 

export const mockKpis: Kpi[] = [
  { id: 'kpi1', title: 'Botellas Vendidas (Mes)', value: '8,750', icon: Package, trend: 'up', trendValue: '+12%', colorClass: 'text-green-500' }, 
  { id: 'kpi2', title: 'Nuevos Clientes Adquiridos', value: '82', icon: Users, trend: 'up', trendValue: '+5', colorClass: 'text-green-500' },
  { id: 'kpi3', title: 'Pedidos Procesados', value: '320', icon: ShoppingBag, trend: 'neutral', trendValue: '-2%', colorClass: 'text-yellow-500' },
  { id: 'kpi4', title: 'Tasa de Conversión (Pedidos/Visitas)', value: '25%', icon: BarChart3, trend: 'down', trendValue: '-1.5%', colorClass: 'text-red-500' },
];

export const mockStrategicObjectives: StrategicObjective[] = [
  { id: 'obj1', text: 'Expandirse al nuevo mercado de la región Sur para Q4.', completed: false },
  { id: 'obj2', text: 'Aumentar el promedio de botellas por pedido en un 10% en Q3.', completed: true }, 
  { id: 'obj3', text: 'Lanzar nueva línea de productos premium (botellas especiales) para fin de año.', completed: false },
  { id: 'obj4', text: 'Alcanzar una tasa de satisfacción del cliente del 95%.', completed: false },
];

export const mockTeamMembers: TeamMember[] = [
  {
    id: 'tm1', name: 'Nico', avatarUrl: 'https://placehold.co/100x100.png', role: 'Rep. de Ventas Senior',
    bottlesSold: 3250, orders: 120, visits: 250, 
    performanceData: [ 
      { month: 'Enero', bottles: 450 }, { month: 'Febrero', bottles: 500 }, { month: 'Marzo', bottles: 520 },
      { month: 'Abril', bottles: 600 }, { month: 'Mayo', bottles: 650 }, { month: 'Junio', bottles: 530 },
    ],
  },
  {
    id: 'tm2', name: 'Alfonso', avatarUrl: 'https://placehold.co/100x100.png', role: 'Rep. de Ventas',
    bottlesSold: 2800, orders: 95, visits: 180, 
    performanceData: [ 
      { month: 'Enero', bottles: 380 }, { month: 'Febrero', bottles: 420 }, { month: 'Marzo', bottles: 450 },
      { month: 'Abril', bottles: 500 }, { month: 'Mayo', bottles: 550 }, { month: 'Junio', bottles: 500 },
    ],
  },
  {
    id: 'tm3', name: 'Federica', avatarUrl: 'https://placehold.co/100x100.png', role: 'Rep. de Ventas Junior',
    bottlesSold: 1500, orders: 60, visits: 120, 
    performanceData: [ 
      { month: 'Enero', bottles: 200 }, { month: 'Febrero', bottles: 220 }, { month: 'Marzo', bottles: 250 },
      { month: 'Abril', bottles: 280 }, { month: 'Mayo', bottles: 250 }, { month: 'Junio', bottles: 300 },
    ],
  },
];

export const orderStatusesList: OrderStatus[] = ['Pendiente', 'Confirmado', 'Procesando', 'Enviado', 'Entregado', 'Cancelado', 'Fallido'];
const clientNames = ['Café Central', 'Restaurante del Sol', 'El Rincón Diario', 'Bistró Vista al Mar', 'Café Cima de Montaña'];
const salesReps = ['Nico', 'Alfonso', 'Federica'];

export const mockOrders: Order[] = Array.from({ length: 25 }, (_, i) => {
  const date = new Date(2024, 5 - Math.floor(i / 5), 28 - (i % 28) + 1); 
  return {
    id: `ORD${1001 + i}`,
    clientName: clientNames[i % clientNames.length],
    visitDate: date.toISOString().split('T')[0],
    products: ['Botellas tipo A', 'Botellas tipo B', 'Pack degustación botellas'].slice(0, Math.floor(Math.random() * 3) + 1), 
    value: Math.floor(Math.random() * 500) + 50, 
    status: orderStatusesList[i % orderStatusesList.length],
    salesRep: salesReps[i % salesReps.length],
    lastUpdated: new Date(date.getTime() + Math.random() * 5 * 24*60*60*1000).toISOString().split('T')[0],
  };
});

const marketingResourceTypes: MarketingResourceType[] = ['Folleto', 'Presentación', 'Imagen', 'Guía'];

export const mockMarketingResources: MarketingResourceCategory[] = [
  {
    id: 'cat1', name: 'Folletos y Catálogos de Botellas', 
    resources: [
      { id: 'res1', title: 'Catálogo de Botellas 2024', description: 'Catálogo completo de nuestras botellas.', link: '#', type: 'Folleto' },
      { id: 'res2', title: 'Folleto de Botellas Premium', description: 'Destacando nuestras botellas de alta gama.', link: '#', type: 'Folleto' },
    ],
  },
  {
    id: 'cat2', name: 'Presentaciones de Ventas',
    resources: [
      { id: 'res3', title: 'Presentación de Ventas Q3 2024 (Enfoque Botellas)', description: 'Presentación de ventas estándar.', link: '#', type: 'Presentación' },
      { id: 'res4', title: 'Iniciativas de Sostenibilidad (Packaging)', description: 'Nuestro compromiso con el packaging sostenible.', link: '#', type: 'Presentación' },
    ],
  },
  {
    id: 'cat3', name: 'Imágenes de Botellas', 
    resources: [
      { id: 'res5', title: 'Fotos de Botellas en Alta Resolución', description: 'Galería de imágenes de botellas.', link: '#', type: 'Imagen' },
    ],
  },
  {
    id: 'cat4', name: 'Guías de Marca',
    resources: [
      { id: 'res6', title: 'Manual de Marca Santa Brisa', description: 'Guías oficiales de uso de la marca.', link: '#', type: 'Guía' },
    ],
  },
];

