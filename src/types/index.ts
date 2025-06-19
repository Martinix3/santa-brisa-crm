
export type UserRole = 'Admin' | 'SalesRep' | 'Distributor' | 'Clavadista';

export interface Kpi {
  id: string;
  title: string;
  currentValue: number; // This will often be calculated dynamically in components
  targetValue: number;
  unit: string; 
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
  email: string;
  avatarUrl?: string; 
  role: UserRole; 
  // These will be calculated dynamically based on Firestore data
  bottlesSold?: number; 
  monthlyTargetAccounts?: number; 
  monthlyTargetVisits?: number; 
  orders?: number; 
  visits?: number; 
  performanceData?: { month: string; bottles: number }[]; // This can remain mock for now
}

export type OrderStatus = 'Pendiente' | 'Confirmado' | 'Procesando' | 'Enviado' | 'Entregado' | 'Cancelado' | 'Fallido' | 'Seguimiento' | 'Programada';
export type ClientType = 'Distribuidor' | 'HORECA' | 'Retail' | 'Cliente Final';

export type NextActionType = 'Llamar al responsable de compras' | 'Mandar información' | 'Visitar de nuevo' | 'Enviar muestra' | 'Esperar decisión' | 'Opción personalizada';
export type FailureReasonType = 'No interesado' | 'Ya trabaja con otro proveedor' | 'Sin presupuesto' | 'Producto no encaja' | 'Otro (especificar)';

export type PromotionalMaterialType = 'Merchandising Físico' | 'Material PLV' | 'Servicio de Personal' | 'Digital/Software';

export interface LatestPurchaseInfo {
  quantityPurchased: number;
  totalPurchaseCost: number;
  purchaseDate: string; // YYYY-MM-DD
  calculatedUnitCost: number;
  notes?: string; 
}

export interface PromotionalMaterial {
  id: string;
  name: string;
  description?: string;
  type: PromotionalMaterialType;
  latestPurchase?: LatestPurchaseInfo; 
}

export interface AssignedPromotionalMaterial {
  materialId: string; 
  quantity: number;
}

export interface Order {
  id: string;
  clientName: string;
  visitDate: string; // YYYY-MM-DD
  products?: string[]; 
  value?: number; 
  status: OrderStatus;
  salesRep: string; // Name of the sales rep for now
  lastUpdated: string; // YYYY-MM-DD
  clavadistaId?: string; 
  assignedMaterials?: AssignedPromotionalMaterial[]; 

  clientType?: ClientType;
  numberOfUnits?: number; 
  unitPrice?: number; 
  clientStatus?: "new" | "existing"; 

  // Customer and billing information (snapshot for the order)
  nombreFiscal?: string;
  cif?: string;
  direccionFiscal?: string;
  direccionEntrega?: string;
  contactoNombre?: string;
  contactoCorreo?: string;
  contactoTelefono?: string;
  observacionesAlta?: string; 
  notes?: string; 

  // Fields for follow-up / failure
  nextActionType?: NextActionType;
  nextActionCustom?: string;
  nextActionDate?: string; // YYYY-MM-DD
  failureReasonType?: FailureReasonType;
  failureReasonCustom?: string;

  // Firestore specific fields (optional in UI type, handled by service)
  accountId?: string; // ID of the linked Account document in Firestore
  createdAt?: string; // YYYY-MM-DD, set by service on creation
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

export type AccountType = 'HORECA' | 'Distribuidor' | 'Retail Minorista' | 'Gran Superficie' | 'Evento Especial' | 'Otro';
export type AccountStatus = 'Activo' | 'Inactivo' | 'Potencial' | 'Bloqueado';

export interface Account {
  id: string;
  name: string; 
  legalName?: string;
  cif: string; 
  type: AccountType;
  status: AccountStatus;
  addressBilling?: string;
  addressShipping?: string;
  mainContactName?: string;
  mainContactEmail?: string;
  mainContactPhone?: string;
  notes?: string; 
  salesRepId?: string; 
  createdAt: string; // YYYY-MM-DD
  updatedAt: string; // YYYY-MM-DD
}


export type CrmEventType = 'Activación en Tienda' | 'Feria Comercial' | 'Evento Corporativo' | 'Degustación' | 'Patrocinio' | 'Activación' | 'Otro';
export type CrmEventStatus = 'Planificado' | 'Confirmado' | 'En Curso' | 'Completado' | 'Cancelado' | 'Pospuesto';

export interface CrmEvent {
  id: string;
  name: string;
  type: CrmEventType;
  status: CrmEventStatus;
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD, optional
  description?: string;
  location?: string;
  assignedTeamMemberIds: string[]; 
  assignedMaterials?: AssignedPromotionalMaterial[]; 
  notes?: string;
  createdAt: string; // YYYY-MM-DD
  updatedAt: string; // YYYY-MM-DD
}
