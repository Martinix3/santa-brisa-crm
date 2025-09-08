import type { 
    TipoCuenta,
    Kpi, 
    StrategicObjective, 
    CrmEvent,
    EstadoTanque as TankStatus,
    UdM as UoM,
    Category,
    TipoRecursoMarketing as MarketingResourceType
} from "@/types";
import type { MarketingResourceCategory } from "@/types";
import { TrendingUp, Users, Briefcase, CalendarPlus, Repeat } from "lucide-react"; 

// --- SEMILLAS DE DESARROLLO ---

export const mockInitialAccounts: Array<Pick<Account, 'nombre' | 'type' | 'potencial'>> = [
    "Sello Copil", "Grupo Tragaluz", "MARRIOT", "AC HOTELES", "Bokaxankla Bar",
    "Florida Park", "Restaurante Bajio", "Restaurante Trompo", "NH HOTELES", "Casa de Mexico",
    "Grupo Dejate Llevar", "Chiton", "Martina por el Norte", "Boheme", "4 Latas",
    "Vineci Hoteles", "Catering Ciboulette", "Los pefiotes", "Restaurante Fondeo", "Morris Club",
    "Floren Domezain", "Taberna Jimmys", "Casa Ortega", "Cafe de Paris", "CRISTINA ORIA",
    "Salvador Bachiller", "Restaurante Lanteo", "Fuerte Group Hotels", "Noname", "Bar Nuevo M40",
    "Tienda El enemigo", "Discoteca Maracaibo", "La Oficina Maracaibo", "Liquor shop", "Casa de Siempre",
    "Filemon", "La Rubia", "Restaurante Meneo", "Ke Sotogrande", "Polo Sotogrande",
    "Agora Sotogrande", "Nueva Taberna", "Restaurante Aurea", "Chambao", "Gkg Sky Bar",
    "ella Sky Bar", "Botania", "Dofia Tomasa", "Mantequerias Bravo", "Catering Samantha",
    "Grupo Mentidero", "Catering Laurel", "Cristine Bedfor", "Estrella Galicia", "Tierra del Queiles",
    "Restaurante Her", "Noneta", "Makila", "Golda", "Vinoteca Collado", "Petit Apetit",
].map((nombre) => ({ nombre, type: "HORECA" as TipoCuenta, potencial: "medio" as const }));

export const mockTanks: Array<{ name: string, capacity: number, status: TankStatus, location: string, currentUom?: UoM }> = [
    { name: "Tanque Mezcla 1", capacity: 1000, status: "libre", location: "Zona de Mezcla", currentUom: 'l' },
    { name: "Tanque Mezcla 2", capacity: 1000, status: "libre", location: "Zona de Mezcla", currentUom: 'l' },
    { name: "Tanque Pulmón 1", capacity: 500, status: "libre", location: "Línea 1", currentUom: 'l' },
];

export const mockCategories: Array<Omit<Category, 'id' | 'createdAt' | 'updatedAt'>> = [
    { name: "Nóminas",               kind: "cost",      costType: "fixed",    isConsumable: false, idOverride: "NOMINAS" },
    { name: "Consultores",           kind: "cost",      costType: "fixed",    isConsumable: false, idOverride: "CONSULTORES" },
    { name: "Almacenamiento",        kind: "cost",      costType: "fixed",    isConsumable: false, idOverride: "ALMACEN" },
    { name: "Gastos Administrativos",kind: "cost",      costType: "fixed",    isConsumable: false, idOverride: "ADMIN" },
    { name: "Impuestos & Tasas",     kind: "cost",      costType: "fixed",    isConsumable: false, idOverride: "IMPUESTOS" },
    { name: "Impuestos Especiales (Alcohol)", kind: "cost", costType: "variable", isConsumable: false, parentId: "IMPUESTOS", idOverride: "IIEE" },
    { name: "IVA Soportado No Recuperable",   kind: "cost", costType: "variable", isConsumable: false, parentId: "IMPUESTOS", idOverride: "IVA_SOPORTADO" },
    { name: "Logística",             kind: "cost",      costType: "variable", isConsumable: false, idOverride: "LOGISTICA" },
    { name: "Viajes y Dietas",       kind: "cost",      costType: "variable", isConsumable: false, idOverride: "VIAJES" },
    { name: "Ventas & Marketing",    kind: "cost",      costType: "variable", isConsumable: false, idOverride: "MKT" },
    { name: "Inventario General",    kind: "inventory", isConsumable: true, idOverride: "INV_GENERAL" },
    { name: "Materia Prima (COGS)",  kind: "inventory", isConsumable: true, parentId: "INV_GENERAL", idOverride: "INV_MATERIA_PRIMA" },
    { name: "Material Embalaje (COGS)", kind: "inventory", isConsumable: true, parentId: "INV_GENERAL", idOverride: "INV_EMBALAJE" },
    { name: "Producto Terminado",    kind: "inventory", isConsumable: true, parentId: "INV_GENERAL", idOverride: "INV_PRODUCTO_TERMINADO" },
    { name: "Producto Intermedio",   kind: "inventory", isConsumable: true, parentId: "INV_GENERAL", idOverride: "INV_PRODUCTO_INTERMEDIO" },
    { name: "Material Promocional",  kind: "inventory", isConsumable: true, parentId: "INV_GENERAL", idOverride: "INV_PROMO_MATERIAL" },
];

export const kpiDataLaunch: Kpi[] = [
  { id: 'kpi1', title: 'Ventas Totales', currentValue: 0, targetValue: 50000, unit: 'botellas', icon: TrendingUp },
  { id: 'kpi2', title: 'Ventas del Equipo', currentValue: 0, targetValue: 27000, unit: 'botellas', icon: Users },
  { id: 'kpi3', title: 'Cuentas Nuevas Equipo (Anual)', currentValue: 0, targetValue: 230, unit: 'cuentas', icon: Briefcase },
  { id: 'kpi4', title: 'Cuentas Nuevas Equipo (Mensual)', currentValue: 0, targetValue: 32, unit: 'cuentas', icon: CalendarPlus },
  { id: 'kpi5', title: '% Tasa de Recompra', currentValue: 0, targetValue: 60, unit: '%', icon: Repeat },
];

export const objetivoTotalVentasEquipo = kpiDataLaunch.find(kpi => kpi.id === 'kpi2')!.targetValue;
export const objetivoTotalCuentasEquipoAnual = kpiDataLaunch.find(kpi => kpi.id === 'kpi3')!.targetValue;

export const mockStrategicObjectives: StrategicObjective[] = [
  { id: 'obj1', text: 'Expandir al nuevo mercado de la región Sur para Q4.', completed: false },
  { id: 'obj2', text: 'Aumentar el promedio de botellas por pedido en un 10% en Q3.', completed: true },
  { id: 'obj3', text: 'Lanzar nueva línea de productos premium (botellas especiales) para fin de año.', completed: false },
  { id: 'obj4', text: 'Alcanzar una tasa de satisfacción del cliente del 95%.', completed: false },
  { id: 'obj5', text: 'Optimizar la cadena de suministro para reducir costes de envío en un 5%.', completed: false },
  { id: 'obj6', text: 'Implementar un programa de fidelización de clientes HORECA para Q2.', completed: true },
];

export const mockMarketingResources: MarketingResourceCategory[] = [
    {
        id: 'cat1',
        name: 'Presentaciones Comerciales',
        resources: [
            { id: 'res1', title: 'Dossier General Santa Brisa', description: 'Presentación completa de la marca, producto y propuesta de valor.', link: '#', type: 'Presentación' },
            { id: 'res2', title: 'Ficha de Producto HORECA', description: 'Detalles técnicos, escandallo y ventajas para hostelería.', link: '#', type: 'Folleto' },
        ],
    },
    {
        id: 'cat2',
        name: 'Recursos Gráficos',
        resources: [
            { id: 'res3', title: 'Pack de Fotos de Producto', description: 'Imágenes en alta resolución de las botellas y perfect serves.', link: '#', type: 'Imagen' },
            { id: 'res4', title: 'Guía de Marca', description: 'Logotipos, colores y tipografías oficiales.', link: '#', type: 'Guía' },
        ],
    },
];

export const mockCrmEvents: CrmEvent[] = [
    {
      id: "evt001",
      name: "Lanzamiento en Terraza Palace",
      type: "Activación en Tienda",
      status: "Completado",
      startDate: "2024-05-15",
      endDate: "2024-05-15",
      location: "Hotel Palace, Madrid",
      description: "Evento de lanzamiento para prensa y clientes VIP.",
      assignedTeamMemberIds: ["userId1", "userId2"],
      budget: 5000,
      salesActual: 7500,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "evt002",
      name: "Feria HORECA Innova",
      type: "Feria Comercial",
      status: "Planificado",
      startDate: "2024-10-20",
      endDate: "2024-10-22",
      location: "IFEMA, Madrid",
      description: "Stand en la feria más importante del sector.",
      assignedTeamMemberIds: ["userId1", "userId3"],
      budget: 15000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
];
