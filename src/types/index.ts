
export type UserRole = 'Admin' | 'SalesRep' | 'Distributor' | 'Clavadista';

export interface Kpi {
  id: string;
  title: string;
  currentValue: number; 
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
  id: string; // Firestore document ID, will often be the same as Firebase Auth UID
  authUid?: string; // Firebase Auth UID, if different or for explicit mapping
  name: string;
  email: string; // Should be unique
  avatarUrl?: string; 
  role: UserRole; 
  monthlyTargetAccounts?: number; 
  monthlyTargetVisits?: number; 
  // Calculated fields, not directly stored or fetched as part of the TeamMember document usually
  bottlesSold?: number; 
  orders?: number; 
  visits?: number; 
  performanceData?: { month: string; bottles: number }[]; 
  createdAt?: string; // YYYY-MM-DD
  updatedAt?: string; // YYYY-MM-DD
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
  salesRep: string; 
  lastUpdated: string; // YYYY-MM-DD
  clavadistaId?: string; 
  assignedMaterials?: AssignedPromotionalMaterial[]; 

  clientType?: ClientType;
  numberOfUnits?: number; 
  unitPrice?: number; 
  clientStatus?: "new" | "existing"; 

  nombreFiscal?: string;
  cif?: string;
  direccionFiscal?: string;
  direccionEntrega?: string;
  contactoNombre?: string;
  contactoCorreo?: string;
  contactoTelefono?: string;
  observacionesAlta?: string; 
  notes?: string; 

  nextActionType?: NextActionType;
  nextActionCustom?: string;
  nextActionDate?: string; // YYYY-MM-DD
  failureReasonType?: FailureReasonType;
  failureReasonCustom?: string;

  accountId?: string; 
  createdAt?: string; 
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

// Form values specifically for creating/editing TeamMember
export interface TeamMemberFormValues {
  name: string;
  email: string; // Not editable after creation ideally
  role: UserRole;
  monthlyTargetAccounts?: number;
  monthlyTargetVisits?: number;
  avatarUrl?: string;
  authUid?: string; // Store Firebase Auth UID
}
