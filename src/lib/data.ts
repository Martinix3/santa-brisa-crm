
import type { Kpi, StrategicObjective, TeamMember, Order, MarketingResourceCategory, OrderStatus, MarketingResourceType, UserRole, ClientType } from '@/types';
import { Package, Users, ShoppingBag, BarChart3 } from 'lucide-react';

export const mockKpis: Kpi[] = [
  { id: 'kpi1', title: 'Botellas Vendidas (Mes)', currentValue: 8750, icon: Package, targetValue:10000, unit:"botellas" },
  { id: 'kpi2', title: 'Nuevos Clientes Adquiridos', currentValue: 82, icon: Users, targetValue:100, unit:"clientes" },
  { id: 'kpi3', title: 'Pedidos Procesados', currentValue: 320, icon: ShoppingBag, targetValue:400, unit:"pedidos" },
  { id: 'kpi4', title: 'Tasa de Conversión (Pedidos/Visitas)', currentValue: 25, icon: BarChart3, targetValue:30, unit:"%" },
];

// mockStrategicObjectives is now in launch-dashboard-data.ts to be accessible by the main dashboard.
// The /admin/objectives-management page will import it from there.

export const mockTeamMembers: TeamMember[] = [
  {
    id: 'tm1', name: 'Nico', email: 'nico@santabrisa.com', avatarUrl: 'https://placehold.co/100x100.png', role: 'SalesRep',
    bottlesSold: 3250, 
    monthlyTargetAccounts: 20, // New target
    monthlyTargetVisits: 100, // New target
    orders: 22, visits: 95, // Actuals
    performanceData: [
      { month: 'Enero', bottles: 450 }, { month: 'Febrero', bottles: 500 }, { month: 'Marzo', bottles: 520 },
      { month: 'Abril', bottles: 600 }, { month: 'Mayo', bottles: 650 }, { month: 'Junio', bottles: 530 },
    ],
  },
  {
    id: 'tm2', name: 'Alfonso', email: 'alfonso@santabrisa.com', avatarUrl: 'https://placehold.co/100x100.png', role: 'SalesRep',
    bottlesSold: 2800, 
    monthlyTargetAccounts: 15, // New target
    monthlyTargetVisits: 80, // New target
    orders: 18, visits: 70, // Actuals
    performanceData: [
      { month: 'Enero', bottles: 380 }, { month: 'Febrero', bottles: 420 }, { month: 'Marzo', bottles: 450 },
      { month: 'Abril', bottles: 500 }, { month: 'Mayo', bottles: 550 }, { month: 'Junio', bottles: 500 },
    ],
  },
  {
    id: 'tm3', name: 'Federica', email: 'federica@santabrisa.com', avatarUrl: 'https://placehold.co/100x100.png', role: 'SalesRep',
    bottlesSold: 1500, 
    monthlyTargetAccounts: 10, // New target
    monthlyTargetVisits: 60, // New target
    orders: 9, visits: 55, // Actuals
    performanceData: [
      { month: 'Enero', bottles: 200 }, { month: 'Febrero', bottles: 220 }, { month: 'Marzo', bottles: 250 },
      { month: 'Abril', bottles: 280 }, { month: 'Mayo', bottles: 250 }, { month: 'Junio', bottles: 300 },
    ],
  },
  {
    id: 'admin01', name: 'Admin User', email: 'admin@santabrisa.com', role: 'Admin', avatarUrl: 'https://placehold.co/100x100.png'
  },
  {
    id: 'adminMJ', name: 'Martín (Admin)', email: 'mj@santabrisa.com', role: 'Admin', avatarUrl: 'https://placehold.co/100x100.png'
  },
  {
    id: 'dist01', name: 'Distribuidor Principal', email: 'distribuidor@example.com', role: 'Distributor', avatarUrl: 'https://placehold.co/100x100.png'
  }
];

// globalTeamMonthlyTarget (for bottles) is removed as individual bottle targets are removed.
// If a new global target is needed (e.g., for accounts or visits), it would need a different definition.

export const orderStatusesList: OrderStatus[] = ['Pendiente', 'Confirmado', 'Procesando', 'Enviado', 'Entregado', 'Cancelado', 'Fallido'];
export const clientTypeList: ClientType[] = ['Distribuidor', 'HORECA', 'Retail', 'Cliente Final'];

const clientNames = ['Café Central', 'Restaurante del Sol', 'El Rincón Diario', 'Bistró Vista al Mar', 'Café Cima de Montaña'];

const salesRepsData = mockTeamMembers.filter(member => member.role === 'SalesRep');
const salesRepsNames = salesRepsData.length > 0 ? salesRepsData.map(sr => sr.name) : ['Equipo Ventas'];


export const mockOrders: Order[] = Array.from({ length: 25 }, (_, i) => {
  const date = new Date(2024, 5 - Math.floor(i / 5), 28 - (i % 28) + 1);
  const isSuccessfulMockScenario = i % orderStatusesList.length < 5; 

  return {
    id: `ORD${1001 + i}`,
    clientName: clientNames[i % clientNames.length],
    visitDate: date.toISOString().split('T')[0],
    products: ['Botellas tipo A', 'Botellas tipo B', 'Pack degustación botellas'].slice(0, Math.floor(Math.random() * 3) + 1),
    value: Math.floor(Math.random() * 500) + 50,
    status: orderStatusesList[i % orderStatusesList.length],
    salesRep: salesRepsNames[i % salesRepsNames.length],
    lastUpdated: new Date(date.getTime() + Math.random() * 5 * 24*60*60*1000).toISOString().split('T')[0],

    clientType: isSuccessfulMockScenario ? clientTypeList[i % clientTypeList.length] : undefined,
    numberOfUnits: isSuccessfulMockScenario ? Math.floor(Math.random() * 50) + 10 : undefined,
    unitPrice: isSuccessfulMockScenario ? parseFloat(((Math.random() * 20) + 5).toFixed(2)) : undefined,

    nombreFiscal: isSuccessfulMockScenario ? `${clientNames[i % clientNames.length]} S.L.` : undefined,
    cif: isSuccessfulMockScenario ? `B1234567${i % 10}` : undefined,
    direccionFiscal: isSuccessfulMockScenario ? `Calle Falsa 123, Ciudad, Provincia ${i % 5}` : undefined,
    direccionEntrega: isSuccessfulMockScenario ? `Calle Verdadera 456, Ciudad, Provincia ${i % 5}` : undefined,
    contactoNombre: isSuccessfulMockScenario ? `Contacto Persona ${i % 3}` : undefined,
    contactoCorreo: isSuccessfulMockScenario ? `contacto${i}@empresa.com` : undefined,
    contactoTelefono: isSuccessfulMockScenario ? `60012345${i % 10}` : undefined,
    observacionesAlta: isSuccessfulMockScenario && i % 4 === 0 ? 'Cliente referido, primer pedido.' : undefined,
    notes: i % 3 === 0 ? 'Notas generales sobre la visita.' : undefined,
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

export const userRolesList: UserRole[] = ['Admin', 'SalesRep', 'Distributor'];
